// Synthetic browser/HTTP/PostgreSQL fixture only. Never imported by server.ts.
import { randomBytes, createHash } from "node:crypto";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { importRuntimeFixture } from "./import-runtime-fixture.js";
import { prepareOnboardingUi } from "./onboarding-ui-fixture.js";
import { FakeAuthService, FakePhaseAService } from "./fakes.js";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { WorkerImportApi } from "../../src/imports/api-service.js";
import { PgImportSourceStore } from "../../src/imports/pg-import-source-store.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";
import { TABULAR_VERSION, type ParsedTable } from "../../src/imports/tabular-parser.js";

if (process.env.NODE_ENV !== "test" || process.env.BSS_IMPORT_UI_SYNTHETIC_TEST !== "synthetic-ci-only"
  || !process.env.BSS_TEST_DATABASE_URL) throw new Error("Explicit synthetic browser test database required");
const port = Number(process.env.BSS_IMPORT_UI_TEST_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Explicit loopback test port required");
const origin = `http://127.0.0.1:${port}`;
const fixture = await importRuntimeFixture(process.env.BSS_TEST_DATABASE_URL);
try {
  const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: origin, DATABASE_URL: "postgres://unused",
    LOG_LEVEL: "silent", COOKIE_SECURE: "false", FRONTEND_ROOT: resolve("../dist") });
  const onboardingSetup = await prepareOnboardingUi(fixture);
  const auth = new FakeAuthService();
  auth.resolveAccessToken = async token => {
    const current = await FakeAuthService.prototype.resolveAccessToken.call(auth, ["foreign","admin-second"].includes(token) ? "admin" : token);
    const actor = token === "foreign" ? fixture.other.actor : token === "admin-second" ? onboardingSetup.secondActor : fixture.first.actor;
    return { actor: { ...actor, role: current.actor.role, departmentIds: current.actor.role === "manager" ? [fixture.first.department] : [], selfWorkerId: current.actor.selfWorkerId }, context: {
      ...current.context, user: { ...current.context.user, id: actor.userId },
      organization: { ...current.context.organization, id: actor.organizationId, name: "H2 Synthetic UI" }
    } };
  };
  const originalLogin = auth.login.bind(auth);
  auth.login = async (...args) => {
    const result = await originalLogin(...args);
    return { ...await auth.resolveAccessToken(result.tokens.accessToken), tokens:result.tokens };
  };
  const phase = new FakePhaseAService(), workers = new PgMvpService(fixture.appPool, config);
  phase.getOrganization = async () => ({ id: fixture.first.actor.organizationId, name: "H2 Synthetic UI",
    timezone: "Europe/Zagreb", approvedLeaveVisibility: "department", revision: "1" });
  phase.listDepartments = async () => [{ id: fixture.first.department, name: "Department", status: "active", revision: "1" }];
  phase.listShifts = async () => [{ id: fixture.first.shift, name: "Day", startTime: "08:00", endTime: "16:00",
    breakMinutes: 30, toleranceMinutes: 5, assignedWorkerCount: 0, revision: "1" }];
  phase.listWorkers = (...args) => args[0].role === "admin" ? workers.listWorkers(...args) : Promise.resolve({ items: [], page: { nextCursor: null, total: 0 } });

  const headers = ["Code", "Name", "Department", "Shift", "Days"];
  const csv = headers.join(";") + "\nUI-CSV-1;Synthetic CSV;Department;Day;0";
  const invalid = headers.join(";") + "\n" + Array.from({ length: 101 }, (_, i) =>
    `UI-BAD-${i};Synthetic invalid;Department;Day;${i === 100 ? "missing" : "0"}`).join("\n");
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Synthetic").addRows([[...headers, "Email"], ["UI-XLSX-1", "Synthetic XLSX", "Department", "Day", 0, ""]]);
  const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
  const fixtures = [
    { bytes: Buffer.from(csv), format: "csv", delimiter: ";", headers, rows: [["UI-CSV-1", "Synthetic CSV", "Department", "Day", "0"]] },
    { bytes: Buffer.from(invalid), format: "csv", delimiter: ";", headers, rows: Array.from({ length: 101 }, (_, i) =>
      [`UI-BAD-${i}`, "Synthetic invalid", "Department", "Day", i === 100 ? "missing" : "0"]) },
    { bytes: xlsx, format: "xlsx", delimiter: ",", headers: [...headers, "Email"], rows: [["UI-XLSX-1", "Synthetic XLSX", "Department", "Day", 0, ""]] }
  ];
  // Exact known synthetic bytes only. This tests browser transport/orchestration,
  // not parsing or containment. The independent actual Linux parser CI remains mandatory.
  const imports = new WorkerImportApi(new PgImportSourceStore(fixture.appPool), fixture.runtime, randomBytes(32),
    async (bytes, format, delimiter): Promise<ParsedTable> => {
      const source = fixtures.find(item => item.format === format && item.delimiter === delimiter && bytes.equals(item.bytes));
      if (!source) throw new Error("Unknown synthetic browser fixture");
      return { version: TABULAR_VERSION, fileChecksum: createHash("sha256").update(bytes).digest("hex"),
        headers: source.headers, rows: source.rows };
    });
  const app = await buildApp({ config, authService: auth, phaseAService: phase, imports, onboarding:onboardingSetup.store, logger: false });
  app.get("/__test/import-counts", async () => ({ workers: await fixture.count("workers"), staging: await fixture.count("worker_import_staging") }));
  app.get("/__test/onboarding-counts",async()=>onboardingSetup.counts());
  app.post("/__test/onboarding-change",async(request,reply)=>{
    if(request.headers["x-bss-synthetic-probe"]!=="onboarding-only")return reply.code(403).send();
    await onboardingSetup.changeConfiguration();return {changed:true};
  });
  await app.listen({ host: "127.0.0.1", port });
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => { await app.close(); await fixture.dispose(); })();
  process.once("SIGTERM", () => { void close(); });
  process.once("SIGINT", () => { void close(); });
  process.stdin.resume();
  process.stdin.once("end", () => { void close(); });
  process.stdout.write(JSON.stringify({ ready: true, origin, csv, invalid, xlsx: xlsx.toString("base64") }) + "\n");
} catch (error) { await fixture.dispose(); throw error; }
