import pg from "pg";
import type { AppConfig } from "../config.js";

const { Pool } = pg;

export function createPool(config: Pick<AppConfig, "databaseUrl" | "databaseSsl">): pg.Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
    application_name: "bss-backend"
  });
}
