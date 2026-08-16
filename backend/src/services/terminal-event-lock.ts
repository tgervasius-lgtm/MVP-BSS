import type { TenantTransaction } from "../db/tenant.js";

export async function lockTerminalEventLifecycle(
  client: TenantTransaction,
  organizationId: string
): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [organizationId]);
}
