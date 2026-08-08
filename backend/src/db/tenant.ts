import type pg from "pg";
import type { ActorContext } from "../domain/types.js";
import { withTransaction, type DatabaseTransaction } from "./transaction.js";

export type TenantTransaction = DatabaseTransaction;

export async function withTenant<T>(
  pool: pg.Pool,
  actor: Pick<ActorContext, "organizationId" | "userId" | "role">,
  requestId: string,
  operation: (client: TenantTransaction) => Promise<T>
): Promise<T> {
  return withTransaction(
    pool,
    async (client) => {
      await client.query("SELECT set_config('bss.organization_id', $1, true)", [actor.organizationId]);
      await client.query("SELECT set_config('bss.actor_id', $1, true)", [actor.userId]);
      await client.query("SELECT set_config('bss.actor_role', $1, true)", [actor.role]);
      await client.query("SELECT set_config('bss.request_id', $1, true)", [requestId]);
      await client.query("SET LOCAL statement_timeout = '5s'");
    },
    operation
  );
}
