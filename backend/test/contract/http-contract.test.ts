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

  const liveness = await app.inject({ method: "GET", url: "/healthz" });
  const readiness = await app.inject({ method: "GET", url: "/readyz" });
  assert.equal(liveness.statusCode, 200);
  assert.equal(readiness.statusCode, 200);

  const csrf = await app.inject({ method: "POST", url: "/api/v1/departments", cookies: { bss_session: "admin" }, payload: { name: "Operativa" } });
  assert.equal(csrf.statusCode, 403);

  const loginCsrf = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "admin@example.test", password: "Secure test password" }
  });
  assert.equal(loginCsrf.statusCode, 403);
  const loggedIn = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { email: "admin@example.test", password: "Secure test password" }
  });
  assert.equal(loggedIn.statusCode, 200);

  const refreshCsrf = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", cookies: { bss_refresh: "refresh" } });
  assert.equal(refreshCsrf.statusCode, 403);
  const refreshed = await app.inject({
    method: "POST",
    url: "/api/v1/auth/refresh",
    headers: { origin: config.publicOrigin },
    cookies: { bss_refresh: "refresh" }
  });
  assert.equal(refreshed.statusCode, 204);

  const logoutWithExpiredAccess = await app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "expired", bss_refresh: "refresh-admin" }
  });
  assert.equal(logoutWithExpiredAccess.statusCode, 204);
  assert.match(logoutWithExpiredAccess.headers["set-cookie"]?.toString() ?? "", /bss_session=;/);
  assert.match(logoutWithExpiredAccess.headers["set-cookie"]?.toString() ?? "", /bss_refresh=;/);

  const repeatedLogout = await app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { origin: config.publicOrigin }
  });
  assert.equal(repeatedLogout.statusCode, 204);

  const logoutWithInvalidAccess = await app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { origin: config.publicOrigin },
    cookies: { bss_session: "expired" }
  });
  assert.equal(logoutWithInvalidAccess.statusCode, 204);

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

test("readiness reports database unavailability without changing liveness", async (t) => {
  const app = await buildApp({
    config,
    authService: new FakeAuthService(),
    phaseAService: new FakePhaseAService(),
    logger: false,
    readinessCheck: async () => { throw new Error("database unavailable"); }
  });
  t.after(() => app.close());
  assert.equal((await app.inject({ method: "GET", url: "/healthz" })).statusCode, 200);
  const readiness = await app.inject({ method: "GET", url: "/readyz" });
  assert.equal(readiness.statusCode, 503);
  assert.deepEqual(readiness.json(), { status: "unavailable" });
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

test("Backend MVP Phase B routes expose every operational flow with role and origin guards", async (t) => {
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());
  const session = (role: string) => ({ bss_session: role });
  const unsafe = { origin: config.publicOrigin };

  const attendance = await app.inject({
    method: "GET",
    url: "/api/v1/attendance?from=2026-07-01&to=2026-07-31",
    cookies: session("manager")
  });
  assert.equal(attendance.statusCode, 200);
  assert.equal(attendance.json().totals.rowCount, 1);

  const workerOrganizationAttendance = await app.inject({
    method: "GET",
    url: "/api/v1/attendance?from=2026-07-01&to=2026-07-31",
    cookies: session("worker")
  });
  assert.equal(workerOrganizationAttendance.statusCode, 403);

  const ownAttendance = await app.inject({
    method: "GET",
    url: `/api/v1/workers/${IDS.worker}/attendance?from=2026-07-01&to=2026-07-31`,
    cookies: session("worker")
  });
  assert.equal(ownAttendance.statusCode, 200);

  const malformedWorkerId = await app.inject({
    method: "GET",
    url: "/api/v1/workers/00000000-0000-0000-0000-------------/attendance?from=2026-07-01&to=2026-07-31",
    headers: { "x-request-id": "attacker-controlled-request-id" },
    cookies: session("worker")
  });
  assert.equal(malformedWorkerId.statusCode, 422);
  assert.notEqual(malformedWorkerId.json().requestId, "attacker-controlled-request-id");
  assert.match(malformedWorkerId.json().requestId, /^[0-9a-f-]{36}$/);

  const oversizedCursor = await app.inject({
    method: "GET",
    url: `/api/v1/workers/${IDS.worker}/attendance?from=2026-07-01&to=2026-07-31&cursor=${"a".repeat(513)}`,
    cookies: session("worker")
  });
  assert.equal(oversizedCursor.statusCode, 422);

  const sharedLeave = await app.inject({
    method: "GET",
    url: "/api/v1/approved-leave-calendar?from=2026-01-01&to=2026-12-31",
    cookies: session("worker")
  });
  assert.equal(sharedLeave.statusCode, 200);
  assert.deepEqual(Object.keys(sharedLeave.json().items[0]).sort(), ["employeeName", "endDate", "id", "startDate"]);

  const leave = await app.inject({
    method: "POST",
    url: "/api/v1/leave-requests",
    headers: unsafe,
    cookies: session("worker"),
    payload: { typeCode: "annual_leave", startDate: "2026-08-03", endDate: "2026-08-07", note: "Planirani odmor" }
  });
  assert.equal(leave.statusCode, 201);

  const approveLeave = await app.inject({
    method: "POST",
    url: `/api/v1/leave-requests/${IDS.request}/approve`,
    headers: { ...unsafe, "if-match": '"1"' },
    cookies: session("manager"),
    payload: { note: "Odobreno" }
  });
  assert.equal(approveLeave.statusCode, 200);

  const correction = await app.inject({
    method: "POST",
    url: "/api/v1/correction-requests",
    headers: unsafe,
    cookies: session("worker"),
    payload: {
      attendanceDayId: IDS.attendance,
      newCheckIn: "2026-07-17T06:00:00.000Z",
      newCheckOut: "2026-07-17T14:00:00.000Z",
      reason: "Zaboravljena odjava"
    }
  });
  assert.equal(correction.statusCode, 201);

  const approveCorrection = await app.inject({
    method: "POST",
    url: `/api/v1/correction-requests/${IDS.request}/approve`,
    headers: { ...unsafe, "if-match": '"1"' },
    cookies: session("manager"),
    payload: { note: "Provjereno" }
  });
  assert.equal(approveCorrection.statusCode, 200);
  assert.equal(approveCorrection.json().attendanceDay.source, "terminal");

  for (const format of ["csv", "xlsx", "pdf"] as const) {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/report-exports",
      headers: unsafe,
      cookies: session("accountant"),
      payload: { reportType: "monthly_summary", format, periodFrom: "2026-07-01", periodTo: "2026-07-31" }
    });
    assert.equal(created.statusCode, 202);
  }
  const downloaded = await app.inject({
    method: "GET",
    url: `/api/v1/report-exports/${IDS.export}/download`,
    cookies: session("accountant")
  });
  assert.equal(downloaded.statusCode, 200);
  assert.equal(downloaded.headers["content-type"], "application/pdf");
  assert.equal(downloaded.headers["x-content-sha256"], "a".repeat(64));

  const audit = await app.inject({
    method: "GET",
    url: "/api/v1/audit-events?from=2026-07-01&to=2026-07-31",
    cookies: session("admin")
  });
  assert.equal(audit.statusCode, 200);
  assert.equal(audit.json().items[0].action, "worker.update");

  const paired = await app.inject({
    method: "POST",
    url: "/api/v1/terminals/pair",
    headers: unsafe,
    cookies: session("admin"),
    payload: { activationCode: "test-pair-code", name: "Ulaz 01", location: "Proizvodnja" }
  });
  assert.equal(paired.statusCode, 201);
  assert.equal(typeof paired.json().deviceCredential, "string");

  const invited = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: unsafe,
    cookies: session("admin"),
    payload: { email: "novi@example.test", role: "accountant" }
  });
  assert.equal(invited.statusCode, 202);
  assert.match(invited.json().invitationUrl, /^https:\/\/bss\.test\/#invite=/);
  assert.equal(typeof invited.json().expiresAt, "string");

  const deviceHeaders = {
    "x-bss-device-id": IDS.terminal,
    "x-bss-timestamp": "2026-07-17T08:00:00.000Z",
    "x-bss-nonce": "abcdefghijklmnopqrstuv",
    "x-bss-signature": "a".repeat(64)
  };
  const batch = await app.inject({
    method: "POST",
    url: "/api/v1/terminal/v1/events/batch",
    headers: deviceHeaders,
    payload: {
      batchId: IDS.export,
      sentAt: "2026-07-17T08:00:00.000Z",
      events: [{ deviceEventId: IDS.request, sequence: 1, occurredAt: "2026-07-17T08:00:00.000Z", eventType: "check_in", cardUidHash: "b".repeat(64) }]
    }
  });
  assert.equal(batch.statusCode, 200);
  const heartbeat = await app.inject({
    method: "POST",
    url: "/api/v1/terminal/v1/heartbeat",
    headers: { ...deviceHeaders, "x-bss-nonce": "zyxwvutsrqponmlkjihgfe" },
    payload: { sentAt: "2026-07-17T08:00:00.000Z", sequence: 2, queueDepth: 0, softwareVersion: "1.0.0" }
  });
  assert.equal(heartbeat.statusCode, 204);

  const blocked = await app.inject({
    method: "POST",
    url: "/api/v1/terminals/pair",
    cookies: session("manager"),
    payload: { activationCode: "test-pair-code", name: "Ulaz 02", location: "Skladište" }
  });
  assert.equal(blocked.statusCode, 403);
});

test("all Backend MVP Phase B operations exist in OpenAPI and resolve to Fastify routes", async (t) => {
  const source = await readFile(join(repositoryRoot, "openapi/bss-mvp-api-v1.yaml"), "utf8");
  const document = YAML.parse(source) as { paths: Record<string, Record<string, { operationId?: string }>> };
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());
  const expected = new Set([
    "login", "refreshSession", "acceptInvitation", "logout", "getSessionContext", "getDashboardSummary", "getOrganization", "updateOrganization",
    "listDepartments", "createDepartment", "updateDepartment", "listHolidays", "replaceHolidaysForYear", "listUsers", "inviteUser",
    "updateUser", "listWorkers", "createWorker", "getWorker", "updateWorker", "deactivateWorker", "activateWorker",
    "listShifts", "createShift", "updateShift", "listWorkerRfidCards", "assignWorkerRfidCard", "blockRfidCard",
    "listAttendance", "getWorkerAttendance", "listApprovedLeaveCalendar",
    "listLeaveRequests", "createLeaveRequest", "listLeaveBalances", "approveLeaveRequest", "rejectLeaveRequest", "cancelOwnLeaveRequest",
    "listCorrectionRequests", "createCorrectionRequest", "approveCorrectionRequest", "rejectCorrectionRequest", "cancelOwnCorrectionRequest",
    "listReportExports", "createReportExport", "createReportPreview", "getReportExport", "downloadReportExport",
    "listAuditEvents", "listTerminals", "pairTerminal", "revokeTerminal", "listTerminalSyncEvents",
    "ingestTerminalEventBatch", "terminalHeartbeat"
  ]);
  const actual = new Set<string>();
  const methods = new Set(["get", "post", "put", "patch", "delete"]);
  for (const [pathName, path] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(path)) {
      if (operation && typeof operation === "object" && operation.operationId) actual.add(operation.operationId);
      if (!methods.has(method) || !operation.operationId) continue;
      const routePath = `/api/v1${pathName.replaceAll(/{([^}]+)}/g, ":$1")}`;
      assert.equal(
        app.hasRoute({ method: method.toUpperCase(), url: routePath }),
        true,
        `OpenAPI operation ${operation.operationId} has no Fastify route ${method.toUpperCase()} ${routePath}`
      );
    }
  }
  assert.deepEqual([...expected].filter((operation) => !actual.has(operation)), []);
  const metadata = (document as { info?: { version?: string; "x-bss-status"?: string } }).info;
  assert.equal(metadata?.version, "1.1.0");
  assert.equal(metadata?.["x-bss-status"], "MVP_IMPLEMENTED");
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
  assert.equal(Object.keys(paths).length, 43);
  assert.equal(operationIds.length, 54);
  assert.equal(new Set(operationIds).size, operationIds.length);

  const nonSessionOperations = new Set(["login", "refreshSession", "acceptInvitation", "ingestTerminalEventBatch", "terminalHeartbeat"]);
  for (const path of Object.values(paths)) {
    for (const [method, operation] of Object.entries(path)) {
      if (!methods.has(method) || !operation.operationId || nonSessionOperations.has(operation.operationId)) continue;
      const roles = (operation as { "x-bss-roles"?: unknown })["x-bss-roles"];
      assert.ok(Array.isArray(roles) && roles.length > 0, `Missing x-bss-roles on ${operation.operationId}`);
    }
  }

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
  assert.equal(screenMap.openapi.version, "1.1.0");
  assert.equal(screenMap.openapi.paths, 43);
  assert.equal(screenMap.openapi.operations, 54);
  assert.equal(screenMap.openapi.sha256, createHash("sha256").update(source).digest("hex"));
  assert.deepEqual(screenMap.contractGatesBeforeLaterPhases, []);
  assert.deepEqual(screenMap.screens.filter((screen) => ["partial", "derived"].includes(screen.status)), []);
  for (const screen of screenMap.screens.filter((item) => item.status === "covered")) {
    assert.deepEqual(screen.operations.filter((operationId) => !operationIds.includes(operationId)), [], `Unknown operation on ${screen.id}`);
  }
});

test("clean-clone developer setup is pinned, secret-safe and reproducible", async () => {
  type PackageManifest = {
    engines?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  type ComposeService = {
    environment?: Record<string, string>;
    profiles?: string[];
    ports?: string[];
    tmpfs?: string[];
  };
  const [rootPackageSource, backendPackageSource, nodeVersion, gitignore, envExample, guide, composeSource] = await Promise.all([
    readFile(join(repositoryRoot, "package.json"), "utf8"),
    readFile(join(repositoryRoot, "backend/package.json"), "utf8"),
    readFile(join(repositoryRoot, ".nvmrc"), "utf8"),
    readFile(join(repositoryRoot, ".gitignore"), "utf8"),
    readFile(join(repositoryRoot, "backend/.env.example"), "utf8"),
    readFile(join(repositoryRoot, "DEVELOPER_GUIDE.md"), "utf8"),
    readFile(join(repositoryRoot, "compose.dev.yml"), "utf8")
  ]);
  const rootPackage = JSON.parse(rootPackageSource) as PackageManifest;
  const backendPackage = JSON.parse(backendPackageSource) as PackageManifest;
  const compose = YAML.parse(composeSource) as { services?: Record<string, ComposeService> };

  assert.equal(nodeVersion.trim(), "22");
  assert.equal(rootPackage.engines?.node, ">=22.9.0");
  assert.equal(rootPackage.engines?.npm, ">=10.0.0");
  for (const script of ["dev", "migrate", "migrate:down", "migrate:prod", "bootstrap", "bootstrap:prod", "start"]) {
    assert.match(backendPackage.scripts?.[script] ?? "", /--env-file-if-exists=\.env/, `Missing optional .env loading on ${script}`);
  }
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(envExample, /^DATABASE_URL=postgres:\/\/postgres:postgres@127\.0\.0\.1:5432\/bss$/m);
  assert.match(guide, /BSS_REQUIRE_POSTGRES_TESTS=true/);
  assert.match(guide, /tenant nikada ne čitajte iz bodyja ili queryja/);

  assert.equal(compose.services?.postgres?.environment?.POSTGRES_DB, "bss");
  assert.deepEqual(compose.services?.postgres?.ports, ["127.0.0.1:5432:5432"]);
  assert.equal(compose.services?.["postgres-test"]?.environment?.POSTGRES_DB, "bss_test");
  assert.deepEqual(compose.services?.["postgres-test"]?.profiles, ["test"]);
  assert.deepEqual(compose.services?.["postgres-test"]?.ports, ["127.0.0.1:5433:5432"]);
  assert.ok(compose.services?.["postgres-test"]?.tmpfs?.includes("/var/lib/postgresql/data"));
});

test("migrations force tenant RLS and make raw evidence append-only", async () => {
  const security = await readFile(join(repositoryRoot, "backend/migrations/005_security_and_rls.up.sql"), "utf8");
  const completion = await readFile(join(repositoryRoot, "backend/migrations/006_contract_completion.up.sql"), "utf8");
  const phaseB = await readFile(join(repositoryRoot, "backend/migrations/007_backend_mvp_phase_b.up.sql"), "utf8");
  const hardening = await readFile(join(repositoryRoot, "backend/migrations/008_production_hardening.up.sql"), "utf8");
  const grants = await readFile(join(repositoryRoot, "backend/deploy/runtime-grants.sql"), "utf8");
  assert.match(security, /FORCE ROW LEVEL SECURITY/);
  assert.match(security, /attendance_events_immutable/);
  assert.match(security, /audit_events_immutable/);
  assert.match(security, /organization_id = bss_current_organization_id\(\)/);
  assert.match(completion, /terminal_sync_events_immutable/);
  assert.match(completion, /FORCE ROW LEVEL SECURITY/);
  assert.match(completion, /bss_invitation_lookup/);
  assert.match(completion, /holiday_calendars/);
  assert.match(phaseB, /approved_leave_visibility/);
  assert.match(phaseB, /bss_terminal_credential_lookup/);
  assert.match(phaseB, /format IN \('csv', 'xlsx', 'pdf'\)/);
  assert.match(hardening, /attendance_days_timeline_idx/);
  assert.match(hardening, /report_exports_expiry_idx/);
  assert.match(hardening, /terminals_name_not_blank/);
  assert.match(hardening, /Duplicate normalized user e-mail/);
  assert.match(hardening, /users_email_not_blank/);
  assert.match(hardening, /users_worker_role_consistency/);
  assert.match(hardening, /attendance_days_time_order/);
  assert.match(hardening, /rfid_cards_active_worker_unique/);
  assert.match(grants, /REVOKE ALL PRIVILEGES ON TABLE bss_schema_migrations/);
  assert.match(grants, /GRANT DELETE ON TABLE holidays, user_department_scopes, terminal_request_nonces/);
  assert.doesNotMatch(grants, /GRANT (?:ALL|DELETE) ON ALL TABLES/);
  assert.doesNotMatch(grants, /GRANT INSERT ON TABLE\s+organizations/);
});
