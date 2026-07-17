import { buildApp } from "./http/app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { PgAuthService } from "./services/pg-auth-service.js";
import { PgPhaseAService } from "./services/pg-phase-a-service.js";

const config = loadConfig();
const pool = createPool(config);
const app = await buildApp({
  config,
  authService: new PgAuthService(pool, config),
  phaseAService: new PgPhaseAService(pool, config.rfidUidPepper)
});

const close = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await pool.end();
  process.exit(0);
};

process.once("SIGINT", () => void close("SIGINT"));
process.once("SIGTERM", () => void close("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}
