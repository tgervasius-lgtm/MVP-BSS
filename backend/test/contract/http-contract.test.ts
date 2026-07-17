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

  const ownAttendance = await app.inject({
    method: "GET",
    url: `/api/v1/workers/${IDS.worker}/attendance?from=2026-07-01&to=2026-07-31`,
    cookies: session("worker")
  });
  assert.equal(ownAttendance.statusCode, 200);

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

test("all Backend MVP Phase B operations exist in the versioned OpenAPI", async () => {
  const source = await readFile(join(repositoryRoot, "openapi/bss-mvp-api-v1.yaml"), "utf8");
  const document = YAML.parse(source) as { paths: Record<string, Record<string, { operationId?: string }>> };
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
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (operation && typeof operation === "object" && operation.operationId) actual.add(operation.operationId);
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

test("migrations force tenant RLS and make raw evidence append-only", async () => {
  const security = await readFile(join(repositoryRoot, "backend/migrations/005_security_and_rls.up.sql"), "utf8");
  const completion = await readFile(join(repositoryRoot, "backend/migrations/006_contract_completion.up.sql"), "utf8");
  const phaseB = await readFile(join(repositoryRoot, "backend/migrations/007_backend_mvp_phase_b.up.sql"), "utf8");
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
});
