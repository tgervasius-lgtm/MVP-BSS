import type pg from "pg";
import type { ActorContext } from "../domain/types.js";

export type TenantTransaction = Pick<pg.PoolClient, "query">;

export async function withTenant<T>(
  pool: pg.Pool,
  actor: Pick<ActorContext, "organizationId" | "userId" | "role">,
  requestId: string,
  operation: (client: TenantTransaction) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('bss.organization_id', $1, true)", [actor.organizationId]);
    await client.query("SELECT set_config('bss.actor_id', $1, true)", [actor.userId]);
    await client.query("SELECT set_config('bss.actor_role', $1, true)", [actor.role]);
    await client.query("SELECT set_config('bss.request_id', $1, true)", [requestId]);
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
