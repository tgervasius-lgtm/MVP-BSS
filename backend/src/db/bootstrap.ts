import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadConfig } from "../config.js";
import { databaseSslOptions } from "./pool.js";
import { hashPassword } from "../security/passwords.js";

const { Client } = pg;
const BOOTSTRAP_LOCK_ID = 726_273_002;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function bootstrapOrganization(client: pg.Client, env: NodeJS.ProcessEnv = process.env): Promise<{
  organizationId: string;
  adminUserId: string;
  email: string;
}> {
  const organizationName = required(env, "BSS_BOOTSTRAP_ORGANIZATION_NAME");
  const email = required(env, "BSS_BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const password = required(env, "BSS_BOOTSTRAP_ADMIN_PASSWORD");
  const timezone = env.BSS_BOOTSTRAP_TIMEZONE?.trim() || "Europe/Zagreb";
  if (organizationName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error("Bootstrap organization, e-mail or password is invalid");
  }
  try {
    Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    throw new Error("BSS_BOOTSTRAP_TIMEZONE must be a valid IANA timezone");
  }

  const passwordHash = await hashPassword(password);
  const organizationId = randomUUID();
  await client.query("BEGIN");
  try {
    const lock = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_xact_lock($1) AS acquired", [BOOTSTRAP_LOCK_ID]);
    if (lock.rows[0]?.acquired !== true) throw new Error("Another BSS bootstrap process already holds the advisory lock");
    const existing = await client.query("SELECT 1 FROM bss_auth_lookup($1) LIMIT 1", [email]);
    if (existing.rows[0]) throw new Error("Bootstrap administrator e-mail already exists");
    await client.query("SELECT set_config('bss.organization_id', $1, true)", [organizationId]);
    await client.query("SELECT set_config('bss.actor_role', 'system', true)");
    await client.query("SELECT set_config('bss.request_id', 'bootstrap', true)");
    await client.query(
      `INSERT INTO organizations (id, name, timezone) VALUES ($1, $2, $3)`,
      [organizationId, organizationName, timezone]
    );
    await client.query(
      `INSERT INTO departments (organization_id, name) VALUES ($1, 'Opći odjel')`,
      [organizationId]
    );
    await client.query(
      `INSERT INTO shifts (organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
       VALUES ($1, 'Jutarnja', '08:00', '16:00', 30, 5)`,
      [organizationId]
    );
    const admin = await client.query<{ id: string }>(
      `INSERT INTO users (organization_id, email, password_hash, role, status, password_changed_at)
       VALUES ($1, $2, $3, 'admin', 'active', clock_timestamp()) RETURNING id`,
      [organizationId, email, passwordHash]
    );
    const adminUserId = admin.rows[0]?.id;
    if (!adminUserId) throw new Error("Administrator bootstrap failed");
    await client.query(
      `INSERT INTO audit_events (
         organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id, request_id, metadata
       ) VALUES ($1, 'system', NULL, 'system', 'organization.bootstrap', 'organization', $1, 'bootstrap', $2::jsonb)`,
      [organizationId, JSON.stringify({ adminUserId, email })]
    );
    await client.query("COMMIT");
    return { organizationId, adminUserId, email };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Bootstrap transaction and rollback both failed");
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: databaseSslOptions(config),
    application_name: "bss-bootstrap"
  });
  await client.connect();
  try {
    const result = await bootstrapOrganization(client);
    process.stdout.write(`BSS organization bootstrapped: ${result.organizationId}; administrator: ${result.email}\n`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
