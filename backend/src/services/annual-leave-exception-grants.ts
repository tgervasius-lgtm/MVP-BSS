import type { DatabaseTransaction } from "../db/transaction.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

type Grant = { revision: string; active: boolean; administrator_revision: string };
type Administrator = { revision: string; role: string; status: string };

function requiredUuid(value: unknown): string {
  if (typeof value === "string" && uuid.test(value)) return value.toLowerCase();
  throw new AppError("VALIDATION_FAILED", "Odaberite valjanu tvrtku i imenovanog administratora.");
}

export function parseLeaveExceptionGrantChange(targetId: string, payload: Readonly<Record<string, unknown>>) {
  const { administratorId, decision, reason, expectedRevision } = payload;
  if (Object.keys(payload).length !== 4 || (decision !== "grant" && decision !== "revoke")
    || typeof reason !== "string" || !reason.trim() || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)
    || typeof expectedRevision !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(expectedRevision)) {
    throw new AppError("VALIDATION_FAILED", "Navedite odluku, razlog i očekivanu reviziju ovlasti.");
  }
  return { organizationId: requiredUuid(targetId), administratorId: requiredUuid(administratorId), decision, expectedRevision };
}

async function lockGrant(
  db: DatabaseTransaction, organizationId: string, administratorId: string, readOnly: boolean
): Promise<void> {
  const statement = readOnly ? "SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))"
    : "SELECT pg_advisory_xact_lock(hashtextextended($1,0))";
  await db.query(statement, [`annual-leave-exception:${organizationId.toLowerCase()}:${administratorId.toLowerCase()}`]);
}

function isActiveAdmin(user: Administrator | undefined): user is Administrator {
  return user?.role === "admin" && user.status === "active";
}

/** Runs within the verified internal operation, before its receipt and audit commit. */
export async function changeLeaveExceptionGrant(
  db: DatabaseTransaction, targetId: string, personId: string, operationId: string, payload: Readonly<Record<string, unknown>>
) {
  const { organizationId, administratorId, decision, expectedRevision } = parseLeaveExceptionGrantChange(targetId, payload);
  await db.query("SELECT set_config('bss.organization_id',$1,true)", [organizationId]);
  await lockGrant(db, organizationId, administratorId, false);
  const user = (await db.query<Administrator>(
    "SELECT revision::text,role,status FROM users WHERE organization_id=$1 AND id=$2",
    [organizationId, administratorId]
  )).rows[0];
  if (!user || (decision === "grant" && !isActiveAdmin(user))) {
    throw new AppError("FORBIDDEN", "Imenovani korisnik nije dostupan kao administrator ove tvrtke.");
  }
  const previous = (await db.query<Grant>(
    "SELECT revision::text,active,administrator_revision::text FROM annual_leave_exception_grants WHERE organization_id=$1 AND administrator_id=$2",
    [organizationId, administratorId]
  )).rows[0];
  if ((previous?.revision ?? "0") !== expectedRevision) {
    throw new AppError("STALE_REVISION", "Ovlast je u međuvremenu promijenjena.");
  }
  const active = decision === "grant";
  const current = previous?.active === true && previous.administrator_revision === user.revision;
  if ((active && current) || (!active && !previous?.active)) {
    throw new AppError("CONFLICT", "Tražena promjena ne odgovara trenutačnom stanju ovlasti.");
  }
  const result = await db.query<{ revision: string }>(
    `INSERT INTO annual_leave_exception_grants
       (organization_id,administrator_id,administrator_revision,active,changed_by,operation_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (organization_id,administrator_id) DO UPDATE SET
       administrator_revision=EXCLUDED.administrator_revision, revision=annual_leave_exception_grants.revision+1,
       active=EXCLUDED.active, changed_by=EXCLUDED.changed_by, operation_id=EXCLUDED.operation_id,
       changed_at=clock_timestamp()
     RETURNING revision::text`,
    [organizationId, administratorId, user.revision, active, personId, operationId]
  );
  return { organizationId, administratorId, revision: result.rows[0]!.revision, active };
}

/** The caller must use the same tenant transaction for checking and recording an exception. */
export async function requireAnnualLeaveExceptionGrant(db: DatabaseTransaction, actor: ActorContext): Promise<string> {
  requireRole(actor, ["admin"]);
  await lockGrant(db, actor.organizationId, actor.userId, true);
  const { rows: [grant] } = await db.query<{ revision: string }>(
    `SELECT g.revision::text FROM annual_leave_exception_grants g
     JOIN users u ON (u.organization_id,u.id)=(g.organization_id,g.administrator_id)
     WHERE g.organization_id=$1 AND g.administrator_id=$2 AND g.active
       AND u.role='admin' AND u.status='active' AND u.revision=g.administrator_revision FOR SHARE OF u`,
    [actor.organizationId, actor.userId]
  );
  if (!grant) throw new AppError("FORBIDDEN", "Administrator nema važeću ovlast za iznimke godišnjeg odmora.");
  return grant.revision;
}
