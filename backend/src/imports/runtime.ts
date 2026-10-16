import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { requireRole } from "../security/rbac.js";
import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { ImportTransaction, importTransaction } from "./transaction.js";

export const IMPORT_RUNTIME = Object.freeze({ uploadMs: 15_000, leaseSeconds: 20, cleanupMs: 60_000, deadlineSeconds: 300 });
export const importUnavailable = () => new AppError("IMPORT_UNAVAILABLE", "Siguran uvoz trenutno nije dostupan.");
export class PgImportRuntime {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;
  private stopped = true;
  private initialized = false;
  constructor(private readonly pool: pg.Pool, private readonly report: (event: "cleanup_ok" | "cleanup_failed") => void) {}
  async healthy(): Promise<boolean> {
    if (this.stopped || !this.initialized) return false;
    try { return (await this.pool.query<{ healthy: boolean }>("SELECT bss_import_healthy() AS healthy")).rows[0]?.healthy === true; }
    catch { return false; }
  }
  async start(): Promise<void> {
    if (!this.stopped) return;
    this.stopped = false;
    await this.sweep();
    this.timer = setInterval(() => { void this.sweep(); }, IMPORT_RUNTIME.cleanupMs);
    this.timer.unref();
  }
  async stop(): Promise<void> {
    this.stopped = true;
    this.initialized = false;
    clearInterval(this.timer);
    await this.running;
  }
  sweep(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.cleanup().finally(() => { this.running = undefined; });
    return this.running;
  }
  private async cleanup(): Promise<void> {
    const client = await this.pool.connect().catch(() => null);
    if (!client) { this.report("cleanup_failed"); return; }
    let discard = false;
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1s'; SET LOCAL idle_in_transaction_session_timeout='5s'");
      await client.query("SELECT bss_import_cleanup()");
      await client.query("COMMIT");
      this.initialized = true;
      const healthy = (await client.query<{ healthy: boolean }>("SELECT bss_import_healthy() AS healthy")).rows[0]?.healthy;
      this.report(healthy ? "cleanup_ok" : "cleanup_failed");
    } catch {
      try { await client.query("ROLLBACK"); } catch { discard = true; }
      this.report("cleanup_failed");
    } finally { client.release(discard); }
  }
  async admit(actor: ActorContext, operation: "create" | "commit", requestId: string): Promise<string> {
    if (this.stopped || !this.initialized) throw importUnavailable();
    const token = randomUUID();
    const status = await importTransaction(this.pool, actor, requestId, async tx =>
      (await tx.query<{ status: string }>("SELECT bss_import_admit($1,$2) AS status", [operation, token])).rows[0]?.status);
    // Refusal is thrown AFTER COMMIT so attempts survive refusal/restarts.
    if (status === "RATE_LIMITED") throw new AppError("RATE_LIMITED", "Previše pokušaja uvoza. Pokušajte ponovno za minutu.");
    if (status !== "ADMITTED") throw importUnavailable();
    return token;
  }

  // Keep a session-scoped mutex until the parser promise settles (secure parser
  // settles only after child close). Expiring admission alone cannot bound work.
  async parse<T>(actor: ActorContext, token: string, signal: AbortSignal, requestId: string,
    operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    requireRole(actor, ["admin"]);
    if (this.stopped || !this.initialized || signal.aborted) throw importUnavailable();
    const client = await this.pool.connect();
    const controller = new AbortController();
    let locked: boolean | undefined;
    let discard = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const lostConnection = () => { discard = true; controller.abort(); };
    client.on("error", lostConnection);
    try {
      locked = (await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock(237,1701) AS acquired")).rows[0]?.acquired === true;
      if (!locked) throw importUnavailable();
      const remaining = await parserBudget(client, actor, token, requestId);
      const combined = AbortSignal.any([signal, controller.signal]);
      if (remaining <= 0 || combined.aborted) throw importUnavailable();
      timer = setTimeout(() => controller.abort(), remaining);
      const result = await operation(combined);
      if (combined.aborted) throw importUnavailable();
      const remainingAfter = await parserBudget(client, actor, token, requestId);
      if (combined.aborted || remainingAfter <= 0) throw importUnavailable();
      return result;
    } finally {
      clearTimeout(timer);
      if (locked === undefined) discard = true;
      if (locked && !discard) {
        try {
          const released = await client.query<{ released: boolean }>(
            "SELECT pg_advisory_unlock(237,1701) AS released");
          discard = released.rows[0]?.released !== true;
        } catch { discard = true; }
      }
      client.removeListener("error", lostConnection);
      client.release(discard);
    }
  }

  async release(actor: ActorContext, token: string, requestId: string): Promise<void> {
    await importTransaction(this.pool, actor, requestId, tx => tx.query("SELECT bss_import_lease($1,'release')", [token]));
  }
}

async function parserBudget(client: pg.PoolClient, actor: ActorContext, token: string, requestId: string): Promise<number> {
  const started = performance.now();
  await client.query("BEGIN");
  try {
    const tx = new ImportTransaction(client);
    await tx.query(`SELECT set_config('bss.organization_id',$1,true),set_config('bss.actor_role',$2,true),
      set_config('bss.actor_id',$3,true),set_config('bss.request_id',$4,true),
      set_config('lock_timeout','1s',true),set_config('idle_in_transaction_session_timeout','5s',true)`,
    [actor.organizationId, actor.role, actor.userId, requestId]);
    const budget = (await tx.query<{ budget: number | null }>(
      "SELECT bss_import_parser_budget($1) AS budget", [token])).rows[0]?.budget ?? 0;
    await tx.query("COMMIT");
    // Subtract the entire round trip, including COMMIT; clocks need not agree.
    return budget - Math.ceil(performance.now() - started);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* The outer mutex release discards an unusable connection. */ }
    throw error;
  }
}
