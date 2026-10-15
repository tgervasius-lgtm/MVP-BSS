import { randomUUID } from "node:crypto";
import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { importTransaction } from "./transaction.js";

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
  async release(actor: ActorContext, token: string, requestId: string): Promise<void> {
    await importTransaction(this.pool, actor, requestId, tx => tx.query("SELECT bss_import_lease($1,'release')", [token]));
  }
}
