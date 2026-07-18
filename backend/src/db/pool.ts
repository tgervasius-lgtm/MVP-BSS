import pg from "pg";
import type { AppConfig } from "../config.js";

const { Pool } = pg;

type DatabaseTlsConfig = Pick<AppConfig, "databaseSsl" | "databaseSslCa">;

export function databaseSslOptions(config: DatabaseTlsConfig): false | { rejectUnauthorized: true; ca?: string } {
  if (!config.databaseSsl) return false;
  return config.databaseSslCa
    ? { rejectUnauthorized: true, ca: config.databaseSslCa }
    : { rejectUnauthorized: true };
}

export function createPool(config: Pick<AppConfig, "databaseUrl" | "databaseSsl" | "databaseSslCa" | "databasePoolMax">): pg.Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    query_timeout: 12_000,
    ssl: databaseSslOptions(config),
    application_name: "bss-backend"
  });
}
