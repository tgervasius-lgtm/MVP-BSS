import type { TenantTransaction } from "../db/tenant.js";
import type { ActorContext } from "../domain/types.js";

export async function insertAudit(
  client: TenantTransaction,
  actor: Pick<ActorContext, "organizationId" | "userId" | "role">,
  requestId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
  module: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO audit_events (
       organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
       before_json, after_json, request_id, metadata
     ) VALUES ($1, 'user', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id`,
    [
      actor.organizationId,
      actor.userId,
      actor.role,
      action,
      entityType,
      entityId,
      before === null || before === undefined ? null : JSON.stringify(before),
      after === null || after === undefined ? null : JSON.stringify(after),
      requestId,
      JSON.stringify({ module })
    ]
  );
  return result.rows[0]!.id;
}
