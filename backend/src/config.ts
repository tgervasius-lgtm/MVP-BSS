import { resolve } from "node:path";

export type AppConfig = Readonly<{
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  publicOrigin: string;
  databaseUrl: string;
  databaseSsl: boolean;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  cookieSecure: boolean;
  trustProxy: boolean;
  logLevel: string;
  rfidUidPepper: string;
  deviceCredentialEncryptionKey: string;
  terminalActivationCode: string;
  frontendRoot: string | null;
}>;

function booleanFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected boolean environment value, received: ${value}`);
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!(["development", "test", "production"] as const).includes(nodeEnv as never)) {
    throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  }

  const publicOrigin = env.PUBLIC_ORIGIN ?? "http://localhost:3000";
  const origin = new URL(publicOrigin);
  if (origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("PUBLIC_ORIGIN must contain only scheme, host and optional port");
  }

  const cookieSecure = booleanFromEnv(env.COOKIE_SECURE, nodeEnv === "production");
  if (nodeEnv === "production" && (!cookieSecure || origin.protocol !== "https:")) {
    throw new Error("Production requires HTTPS PUBLIC_ORIGIN and secure cookies");
  }
  const rfidUidPepper = env.RFID_UID_PEPPER ?? "development-only-rfid-pepper-change-me";
  if (nodeEnv === "production" && (!env.RFID_UID_PEPPER || rfidUidPepper.length < 32)) {
    throw new Error("Production requires RFID_UID_PEPPER with at least 32 characters");
  }
  const deviceCredentialEncryptionKey = env.DEVICE_CREDENTIAL_ENCRYPTION_KEY ?? "development-only-device-key-change-me";
  const terminalActivationCode = env.TERMINAL_ACTIVATION_CODE ?? "BSS-DEVELOPMENT-PAIRING-CODE";
  if (nodeEnv === "production" && (!env.DEVICE_CREDENTIAL_ENCRYPTION_KEY || deviceCredentialEncryptionKey.length < 32)) {
    throw new Error("Production requires DEVICE_CREDENTIAL_ENCRYPTION_KEY with at least 32 characters");
  }
  if (nodeEnv === "production" && (!env.TERMINAL_ACTIVATION_CODE || terminalActivationCode.length < 16)) {
    throw new Error("Production requires TERMINAL_ACTIVATION_CODE with at least 16 characters");
  }

  return Object.freeze({
    nodeEnv: nodeEnv as AppConfig["nodeEnv"],
    host: env.HOST ?? "127.0.0.1",
    port: positiveInteger(env.PORT, 3000, "PORT"),
    publicOrigin: origin.origin,
    databaseUrl: env.DATABASE_URL ?? "postgres://localhost/bss",
    databaseSsl: booleanFromEnv(env.DATABASE_SSL, nodeEnv === "production"),
    accessTokenTtlSeconds: positiveInteger(env.ACCESS_TOKEN_TTL_SECONDS, 900, "ACCESS_TOKEN_TTL_SECONDS"),
    refreshTokenTtlSeconds: positiveInteger(env.REFRESH_TOKEN_TTL_SECONDS, 2_592_000, "REFRESH_TOKEN_TTL_SECONDS"),
    cookieSecure,
    trustProxy: booleanFromEnv(env.TRUST_PROXY, false),
    logLevel: env.LOG_LEVEL ?? "info",
    rfidUidPepper,
    deviceCredentialEncryptionKey,
    terminalActivationCode,
    frontendRoot: env.FRONTEND_ROOT?.trim() ? resolve(env.FRONTEND_ROOT.trim()) : null
  });
}
