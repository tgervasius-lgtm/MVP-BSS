import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import YAML from "yaml";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService, FakePhaseAService, IDS } from "../helpers/fakes.js";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const config = loadConfig({
  NODE_ENV: "test",
  PUBLIC_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgres://unused",
  COOKIE_SECURE: "false",
  LOG_LEVEL: "silent"
});

test("Phase A HTTP routes enforce sessions, roles, origin and stable errors", async (t) => {
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/v1/organization" });
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.headers["cache-control"], "no-store, private");
  assert.equal(missing.json().code, "UNAUTHENTICATED");

  const worker = await app.inject({ method: "GET", url: "/api/v1/organization", cookies: { bss_session: "worker" } });
  assert.equal(worker.statusCode, 403);

  const admin = await app.inject({ method: "GET", url: "/api/v1/organization", cookies: { bss_session: "admin" } });
  assert.equal(admin.statusCode, 200);
  assert.equal(admin.headers.etag, '"1"');

  const csrf = await app.inject({ method: "POST", url: "/api/v1/departments", cookies: { bss_session: "admin" }, payload: { name: "Operativa" } });
  assert.equal(csrf.statusCode, 403);

  const created = await app.inject({
    method: "POST",
    url: "/api/v1/workers",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "admin" },
    payload: {
      code: "R-001",
      name: "Testni Radnik",
      departmentId: IDS.department,
      shiftId: IDS.shift,
      annualLeaveAllowance: 20
    }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().departmentId, IDS.department);

  const extraField = await app.inject({
    method: "POST",
    url: "/api/v1/workers",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "admin" },
    payload: {
      code: "R-001",
      name: "Testni Radnik",
      departmentId: IDS.department,
      shiftId: IDS.shift,
      annualLeaveAllowance: 20,
      organizationId: IDS.organization
    }
  });
  assert.equal(extraField.statusCode, 422);

  const managerEscape = await app.inject({
    method: "GET",
    url: `/api/v1/workers?departmentId=${IDS.otherDepartment}`,
    cookies: { bss_session: "manager" }
  });
  assert.equal(managerEscape.statusCode, 403);
});

test("completed Phase A contracts expose scoped drill-downs without raw credentials", async (t) => {
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());

  const invitation = await app.inject({
    method: "POST",
    url: "/api/v1/auth/invitations/accept",
    headers: { origin: config.publicOrigin },
    payload: { token: "a".repeat(43), password: "Secure invitation password 2026!" }
  });
  assert.equal(invitation.statusCode, 200);
  assert.match(invitation.headers["set-cookie"]?.toString() ?? "", /bss_session=/);

  const dashboard = await app.inject({
    method: "GET",
    url: "/api/v1/dashboard-summary?date=2026-07-13",
    cookies: { bss_session: "admin" }
  });
  assert.equal(dashboard.statusCode, 200);
  assert.ok(dashboard.json().kpis.length <= 4);
  assert.equal(dashboard.json().kpis[0].targetScreen, "attendance");

  const assigned = await app.inject({
    method: "POST",
    url: `/api/v1/workers/${IDS.worker}/rfid-cards`,
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "admin" },
    payload: { uid: "04:A1:B2:C3" }
  });
  assert.equal(assigned.statusCode, 201);
  assert.equal(assigned.json().maskedUid, "****1234");
  assert.equal("uid" in assigned.json(), false);

  const balances = await app.inject({
    method: "GET",
    url: "/api/v1/leave-balances?year=2026",
    cookies: { bss_session: "worker" }
  });
  assert.equal(balances.statusCode, 200);
  assert.equal(balances.json().items[0].availableDays, 13);
  assert.equal(typeof balances.json().datasetVersion, "string");

  const preview = await app.inject({
    method: "POST",
    url: "/api/v1/report-previews",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "accountant" },
    payload: { reportType: "monthly_summary", periodFrom: "2026-07-01", periodTo: "2026-07-31" }
  });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().totals.rowCount, 1);
  assert.equal(preview.json().filters.limit, 100);

  const forbiddenPreview = await app.inject({
    method: "POST",
    url: "/api/v1/report-previews",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "worker" },
    payload: { reportType: "monthly_summary", periodFrom: "2026-07-01", periodTo: "2026-07-31" }
  });
  assert.equal(forbiddenPreview.statusCode, 403);

  const syncEvents = await app.inject({
    method: "GET",
    url: `/api/v1/terminals/${IDS.shift}/sync-events?from=2026-07-01&to=2026-07-31`,
    cookies: { bss_session: "manager" }
  });
  assert.equal(syncEvents.statusCode, 200);
  assert.equal(syncEvents.json().items[0].terminalId, IDS.shift);
});

test("implemented Phase A operations exist unchanged in the frozen OpenAPI", async () => {
  const source = await readFile(join(repositoryRoot, "openapi/bss-mvp-api-v1.yaml"), "utf8");
  const document = YAML.parse(source) as { paths: Record<string, Record<string, { operationId?: string }>> };
  const expected = new Set([
    "login", "refreshSession", "acceptInvitation", "logout", "getSessionContext", "getDashboardSummary", "getOrganization", "updateOrganization",
    "listDepartments", "createDepartment", "updateDepartment", "listHolidays", "replaceHolidaysForYear", "listUsers", "inviteUser",
    "updateUser", "listWorkers", "createWorker", "getWorker", "updateWorker", "deactivateWorker",
    "listShifts", "createShift", "updateShift", "listWorkerRfidCards", "assignWorkerRfidCard", "blockRfidCard",
    "listLeaveBalances", "createReportPreview", "listTerminalSyncEvents"
  ]);
  const actual = new Set<string>();
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (operation && typeof operation === "object" && operation.operationId) actual.add(operation.operationId);
    }
  }
  assert.deepEqual([...expected].filter((operation) => !actual.has(operation)), []);
  const metadata = (document as { info?: { version?: string; "x-bss-status"?: string } }).info;
  assert.equal(metadata?.version, "1.0.0");
  assert.equal(metadata?.["x-bss-status"], "FULL_PASS_APPROVED");
  assert.equal(document.paths["/terminal/v1/events/batch"]?.post?.operationId, "ingestTerminalEventBatch");
});

test("OpenAPI v1 and the frozen screen map have no unresolved contract gates", async () => {
  const source = await readFile(join(repositoryRoot, "openapi/bss-mvp-api-v1.yaml"), "utf8");
  const document = YAML.parse(source) as Record<string, unknown>;
  const paths = document.paths as Record<string, Record<string, { operationId?: string }>>;
  const methods = new Set(["get", "post", "put", "patch", "delete"]);
  const operationIds = Object.values(paths).flatMap((path) =>
    Object.entries(path)
      .filter(([method]) => methods.has(method))
      .map(([, operation]) => operation.operationId)
      .filter((operationId): operationId is string => typeof operationId === "string")
  );
  assert.equal(Object.keys(paths).length, 40);
  assert.equal(operationIds.length, 51);
  assert.equal(new Set(operationIds).size, operationIds.length);

  const refs: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") refs.push(child);
      visit(child);
    }
  };
  visit(document);
  for (const ref of refs) {
    assert.ok(ref.startsWith("#/"), `External OpenAPI reference is not permitted: ${ref}`);
    const resolved = ref.slice(2).split("/").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[segment.replace(/~1/g, "/").replace(/~0/g, "~")];
    }, document);
    assert.notEqual(resolved, undefined, `Unresolved OpenAPI reference: ${ref}`);
  }

  const screenMap = JSON.parse(
    await readFile(join(repositoryRoot, "backend/contracts/frontend-screen-api-map-v1.json"), "utf8")
  ) as {
    readiness: string;
    openapi: { sha256: string; version: string; paths: number; operations: number };
    screens: Array<{ id: string; status: string; operations: string[] }>;
    contractGatesBeforeLaterPhases: string[];
  };
  assert.equal(screenMap.readiness, "FULL_PASS");
  assert.equal(screenMap.openapi.version, "1.0.0");
  assert.equal(screenMap.openapi.paths, 40);
  assert.equal(screenMap.openapi.operations, 51);
  assert.equal(screenMap.openapi.sha256, createHash("sha256").update(source).digest("hex"));
  assert.deepEqual(screenMap.contractGatesBeforeLaterPhases, []);
  assert.deepEqual(screenMap.screens.filter((screen) => ["partial", "derived"].includes(screen.status)), []);
  for (const screen of screenMap.screens.filter((item) => item.status === "covered")) {
    assert.deepEqual(screen.operations.filter((operationId) => !operationIds.includes(operationId)), [], `Unknown operation on ${screen.id}`);
  }
});

test("migrations force tenant RLS and make raw evidence append-only", async () => {
  const security = await readFile(join(repositoryRoot, "backend/migrations/005_security_and_rls.up.sql"), "utf8");
  const completion = await readFile(join(repositoryRoot, "backend/migrations/006_contract_completion.up.sql"), "utf8");
  assert.match(security, /FORCE ROW LEVEL SECURITY/);
  assert.match(security, /attendance_events_immutable/);
  assert.match(security, /audit_events_immutable/);
  assert.match(security, /organization_id = bss_current_organization_id\(\)/);
  assert.match(completion, /terminal_sync_events_immutable/);
  assert.match(completion, /FORCE ROW LEVEL SECURITY/);
  assert.match(completion, /bss_invitation_lookup/);
  assert.match(completion, /holiday_calendars/);
});
