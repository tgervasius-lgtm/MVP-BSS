import { performance } from "node:perf_hooks";
import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";
import { IMPORT_POLICY } from "./model.js";

export class ImportTransaction {
  private readonly started = performance.now();
  constructor(private readonly client: pg.PoolClient) {}
  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, values: unknown[] = []): Promise<pg.QueryResult<T>> {
    const remaining = Math.floor(IMPORT_POLICY.transactionMs - (performance.now() - this.started));
    if (remaining <= 0) throw new AppError("CONFLICT", "Isteklo je vrijeme transakcije uvoza.");
    // A fresh remaining budget per statement, not five seconds per row. The
    // PostgreSQL timer cancels SQL; there is no detached Promise.race writer.
    await this.client.query("SELECT set_config('statement_timeout', $1, true)", [`${remaining}ms`]);
    return this.client.query<T>(sql, values);
  }
}

export async function importTransaction<T>(pool: pg.Pool, actor: ActorContext, requestId: string,
  operation: (tx: ImportTransaction) => Promise<T>): Promise<T> {
  requireRole(actor, ["admin"]);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    const tx = new ImportTransaction(client);
    await tx.query(`SELECT set_config('bss.organization_id', $1, true),
      set_config('bss.actor_id', $2, true), set_config('bss.actor_role', $3, true),
      set_config('bss.request_id', $4, true), set_config('lock_timeout', $5, true),
      set_config('idle_in_transaction_session_timeout', '5s', true)`,
    [actor.organizationId, actor.userId, actor.role, requestId, `${IMPORT_POLICY.lockMs}ms`]);
    const result = await operation(tx);
    await tx.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { discard = true; }
    if (typeof error === "object" && error !== null && "code" in error
      && ["23505", "23503", "23514", "55P03", "57014", "40P01", "40001"].includes(String(error.code))) {
      throw new AppError("CONFLICT", "Podaci su promijenjeni ili uvoz trenutno nije moguće dovršiti.");
    }
    throw error;
  } finally { client.release(discard); }
}
