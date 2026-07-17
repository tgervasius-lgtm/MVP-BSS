import { buildApp } from "./http/app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { PgAuthService } from "./services/pg-auth-service.js";
import { PgMvpService } from "./services/pg-mvp-service.js";

const config = loadConfig();
const pool = createPool(config);
const app = await buildApp({
  config,
  authService: new PgAuthService(pool, config),
  phaseAService: new PgMvpService(pool, config),
  readinessCheck: async () => { await pool.query("SELECT 1"); }
});

pool.on("error", (error) => {
  app.log.error({ err: error }, "Unexpected idle PostgreSQL client error");
});

let shutdown: Promise<void> | undefined;
const close = (signal: string): Promise<void> => {
  shutdown ??= (async () => {
    app.log.info({ signal }, "Shutting down");
    try {
      await app.close();
    } finally {
      await pool.end();
    }
  })().catch((error: unknown) => {
    app.log.error({ err: error, signal }, "Graceful shutdown failed");
    process.exitCode = 1;
  });
  return shutdown;
};

process.once("SIGINT", () => void close("SIGINT"));
process.once("SIGTERM", () => void close("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exitCode = 1;
}
