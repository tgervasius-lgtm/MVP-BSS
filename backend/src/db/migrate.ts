import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadConfig } from "../config.js";

const { Client } = pg;
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const LOCK_ID = 726_273_001;

type AppliedMigration = { version: string; checksum: string };

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function migrationFiles(suffix: ".up.sql" | ".down.sql"): Promise<string[]> {
  return (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith(suffix)).sort();
}

async function ensureLedger(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS bss_schema_migrations (
      version text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )
  `);
}

export async function migrateUp(client: pg.Client): Promise<void> {
  await ensureLedger(client);
  const appliedResult = await client.query<AppliedMigration>(
    "SELECT version, checksum FROM bss_schema_migrations ORDER BY version"
  );
  const applied = new Map(appliedResult.rows.map((row) => [row.version, row.checksum]));

  for (const file of await migrationFiles(".up.sql")) {
    const version = file.slice(0, -".up.sql".length);
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const digest = checksum(sql);
    const previous = applied.get(version);
    if (previous && previous !== digest) {
      throw new Error(`Applied migration checksum changed: ${version}`);
    }
    if (previous) continue;

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO bss_schema_migrations(version, checksum) VALUES ($1, $2)",
        [version, digest]
      );
      await client.query("COMMIT");
      process.stdout.write(`Applied ${version}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export async function migrateDown(client: pg.Client): Promise<void> {
  if (process.env.BSS_ALLOW_DOWN_MIGRATIONS !== "true") {
    throw new Error("Down migrations are disabled; set BSS_ALLOW_DOWN_MIGRATIONS=true outside production");
  }
  await ensureLedger(client);
  const latest = await client.query<AppliedMigration>(
    "SELECT version, checksum FROM bss_schema_migrations ORDER BY version DESC LIMIT 1"
  );
  const applied = latest.rows[0];
  if (!applied) return;
  const file = `${applied.version}.down.sql`;
  const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("DELETE FROM bss_schema_migrations WHERE version = $1", [applied.version]);
    await client.query("COMMIT");
    process.stdout.write(`Reverted ${applied.version}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
    application_name: "bss-migrator"
  });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    if (process.argv[2] === "down") await migrateDown(client);
    else await migrateUp(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
