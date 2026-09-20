import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client, Pool } = pg;

// The URL must name an explicitly disposable PostgreSQL test environment.
// Only resources successfully created by this invocation are removed.
export async function createPostgresFixture(databaseUrl: string, label: string, poolMax = 3) {
  assert.match(label, /^[a-z][a-z_]{0,15}$/);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 24);
  const databaseName = `bss_fixture_${label}_${suffix}`;
  const role = `bss_fixture_role_${suffix}`;
  const password = `test-${suffix}-password`;
  const ownerUrl = new URL(databaseUrl);
  ownerUrl.pathname = `/${databaseName}`;
  const appUrl = new URL(ownerUrl);
  appUrl.username = role;
  appUrl.password = password;
  const admin = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  const owner = new Client({ connectionString: ownerUrl.toString(), connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  const appPool = new Pool({ connectionString: appUrl.toString(), max: poolMax, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  let databaseCreated = false;
  let roleCreated = false;
  let disposal: Promise<void> | undefined;

  const dispose = (): Promise<void> => {
    disposal ??= (async () => {
      const errors: unknown[] = [];
      const steps = [
        () => appPool.end(),
        () => owner.end(),
        async () => {
          if (databaseCreated) await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
        },
        async () => {
          if (roleCreated) await admin.query(`DROP ROLE IF EXISTS ${role}`);
        },
        () => admin.end()
      ];
      for (const step of steps) {
        try {
          await step();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw new AggregateError(errors, "PostgreSQL fixture cleanup failed");
    })();
    return disposal;
  };

  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${databaseName} TEMPLATE template0`);
    databaseCreated = true;
    await owner.connect();
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
    roleCreated = true;
    return { owner, appPool, appUrl, role, suffix, databaseName, dispose };
  } catch (error) {
    try {
      await dispose();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "PostgreSQL fixture setup and cleanup failed");
    }
    throw error;
  }
}
