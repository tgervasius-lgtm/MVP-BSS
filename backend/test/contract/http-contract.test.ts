import assert from "node:assert/strict";
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

test("implemented Phase A operations exist unchanged in the frozen OpenAPI", async () => {
  const source = await readFile(join(repositoryRoot, "openapi/bss-mvp-api-v1.yaml"), "utf8");
  const document = YAML.parse(source) as { paths: Record<string, Record<string, { operationId?: string }>> };
  const expected = new Set([
    "login", "refreshSession", "logout", "getSessionContext", "getOrganization", "updateOrganization",
    "listDepartments", "createDepartment", "listHolidays", "replaceHolidaysForYear", "listUsers", "inviteUser",
    "updateUser", "listWorkers", "createWorker", "getWorker", "updateWorker", "deactivateWorker",
    "listShifts", "createShift", "updateShift", "blockRfidCard"
  ]);
  const actual = new Set<string>();
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (operation && typeof operation === "object" && operation.operationId) actual.add(operation.operationId);
    }
  }
  assert.deepEqual([...expected].filter((operation) => !actual.has(operation)), []);
  assert.equal(document.paths["/terminal/v1/events/batch"]?.post?.operationId, "ingestTerminalEventBatch");
});

test("migrations force tenant RLS and make raw evidence append-only", async () => {
  const security = await readFile(join(repositoryRoot, "backend/migrations/005_security_and_rls.up.sql"), "utf8");
  assert.match(security, /FORCE ROW LEVEL SECURITY/);
  assert.match(security, /attendance_events_immutable/);
  assert.match(security, /audit_events_immutable/);
  assert.match(security, /organization_id = bss_current_organization_id\(\)/);
});
