import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../src/domain/errors.js";
import type { ActorContext, Role } from "../../src/domain/types.js";
import { requireDepartmentScope, requirePermission, requireWorkerScope } from "../../src/security/rbac.js";
import { IDS } from "../helpers/fakes.js";

function actor(role: Role): ActorContext {
  return {
    organizationId: IDS.organization,
    userId: IDS.user,
    role,
    departmentIds: role === "manager" ? [IDS.department] : [],
    selfWorkerId: role === "worker" ? IDS.worker : null,
    sessionId: "session"
  };
}

test("RBAC matrix keeps administrator mutations and accounting read-only", () => {
  assert.doesNotThrow(() => requirePermission(actor("admin"), "workers", "write"));
  assert.throws(() => requirePermission(actor("accountant"), "workers", "write"), AppError);
  assert.doesNotThrow(() => requirePermission(actor("accountant"), "reports", "write"));
  assert.throws(() => requirePermission(actor("worker"), "audit", "read"), AppError);
});

test("manager and worker scope cannot escape assigned records", () => {
  assert.doesNotThrow(() => requireDepartmentScope(actor("manager"), IDS.department));
  assert.throws(() => requireDepartmentScope(actor("manager"), IDS.otherDepartment), AppError);
  assert.doesNotThrow(() => requireWorkerScope(actor("worker"), IDS.worker));
  assert.throws(() => requireWorkerScope(actor("worker"), IDS.user), AppError);
});
