import { AppError } from "../domain/errors.js";
import type { ActorContext, Role } from "../domain/types.js";

export const RBAC = Object.freeze({
  organization: { read: ["admin"], write: ["admin"] },
  departments: { read: ["admin", "manager", "worker"], write: ["admin"] },
  users: { read: ["admin"], write: ["admin"] },
  workers: { read: ["admin", "manager"], write: ["admin"] },
  shifts: { read: ["admin", "manager", "worker"], write: ["admin"] },
  holidays: { read: ["admin", "manager", "worker", "accountant"], write: ["admin"] },
  attendance: { read: ["admin", "manager", "worker"], write: [] },
  leave: { read: ["admin", "manager", "worker", "accountant"], write: ["admin", "manager", "worker"] },
  corrections: { read: ["admin", "manager", "worker"], write: ["admin", "manager", "worker"] },
  reports: { read: ["admin", "manager", "accountant"], write: ["admin", "manager", "accountant"] },
  audit: { read: ["admin"], write: [] },
  terminals: { read: ["admin", "manager"], write: ["admin"] }
} satisfies Record<string, Record<"read" | "write", readonly Role[]>>);

export type Resource = keyof typeof RBAC;
export type Permission = "read" | "write";

export function requirePermission(actor: ActorContext, resource: Resource, permission: Permission): void {
  const allowed = RBAC[resource][permission] as readonly Role[];
  if (!allowed.includes(actor.role)) {
    throw new AppError("FORBIDDEN", "Nemate ovlast za ovu radnju.");
  }
}

export function requireDepartmentScope(actor: ActorContext, departmentId: string): void {
  if (actor.role === "admin" || actor.role === "accountant") return;
  if (actor.role === "manager" && actor.departmentIds.includes(departmentId)) return;
  throw new AppError("FORBIDDEN", "Odjel nije u vašem dopuštenom opsegu.");
}

export function requireWorkerScope(actor: ActorContext, workerId: string, departmentId?: string): void {
  if (actor.role === "admin" || actor.role === "accountant") return;
  if (actor.role === "worker" && actor.selfWorkerId === workerId) return;
  if (actor.role === "manager" && departmentId && actor.departmentIds.includes(departmentId)) return;
  throw new AppError("FORBIDDEN", "Radnik nije u vašem dopuštenom opsegu.");
}
