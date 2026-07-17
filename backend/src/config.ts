import { resolve } from "node:path";
import { isIP } from "node:net";

export type AppConfig = Readonly<{
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  publicOrigin: string;
  databaseUrl: string;
  databaseSsl: boolean;
  databaseSslCa: string | null;
  databasePoolMax: number;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  cookieSecure: boolean;
  trustProxy: boolean | string[];
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

function positiveInteger(value: string | undefined, fallback: number, name: string, maximum = Number.MAX_SAFE_INTEGER): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}`);
  }
  return parsed;
}

function validProxyAddress(value: string): boolean {
  const [address, prefix, ...extra] = value.split("/");
  const version = address ? isIP(address) : 0;
  if (!version || extra.length > 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;
  const size = Number(prefix);
  return size >= 0 && size <= (version === 4 ? 32 : 128);
}

function trustProxyFromEnv(value: string | undefined, production: boolean): boolean | string[] {
  if (value === undefined || value === "false") return false;
  if (value === "true") {
    if (production) throw new Error("Production TRUST_PROXY must list explicit proxy IP/CIDR values instead of true");
    return true;
  }
  const addresses = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (addresses.length === 0 || !addresses.every(validProxyAddress)) {
    throw new Error("TRUST_PROXY must be false, or a comma-separated IP/CIDR list");
  }
  return addresses;
}

const LOG_LEVELS = new Set(["silent", "fatal", "error", "warn", "info", "debug", "trace"]);
const INSECURE_SECRET_MARKER = /development|change[-_ ]?me|replace[-_ ]?with|example|test[-_ ]?only/i;

function requireProductionSecret(env: NodeJS.ProcessEnv, name: string, value: string, minimumLength: number): void {
  if (!env[name] || value.length < minimumLength || INSECURE_SECRET_MARKER.test(value)) {
    throw new Error(`Production requires a non-placeholder ${name} with at least ${minimumLength} characters`);
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!(["development", "test", "production"] as const).includes(nodeEnv as never)) {
    throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  }

  const publicOrigin = env.PUBLIC_ORIGIN ?? "http://localhost:3000";
  const origin = new URL(publicOrigin);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("PUBLIC_ORIGIN must contain only scheme, host and optional port");
  }

  if (nodeEnv === "production" && !env.DATABASE_URL) {
    throw new Error("Production requires an explicit DATABASE_URL");
  }
  const databaseUrl = env.DATABASE_URL ?? "postgres://localhost/bss";
  const database = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("DATABASE_URL must use the postgres or postgresql scheme");
  }
  const databaseSsl = booleanFromEnv(env.DATABASE_SSL, nodeEnv === "production");
  if (nodeEnv === "production" && !databaseSsl) {
    throw new Error("Production requires DATABASE_SSL=true");
  }

  const logLevel = env.LOG_LEVEL ?? "info";
  if (!LOG_LEVELS.has(logLevel)) throw new Error(`Unsupported LOG_LEVEL: ${logLevel}`);

  const cookieSecure = booleanFromEnv(env.COOKIE_SECURE, nodeEnv === "production");
  if (nodeEnv === "production" && (!cookieSecure || origin.protocol !== "https:")) {
    throw new Error("Production requires HTTPS PUBLIC_ORIGIN and secure cookies");
  }
  const rfidUidPepper = env.RFID_UID_PEPPER ?? "development-only-rfid-pepper-change-me";
  const deviceCredentialEncryptionKey = env.DEVICE_CREDENTIAL_ENCRYPTION_KEY ?? "development-only-device-key-change-me";
  const terminalActivationCode = env.TERMINAL_ACTIVATION_CODE ?? "BSS-DEVELOPMENT-PAIRING-CODE";
  if (nodeEnv === "production") {
    requireProductionSecret(env, "RFID_UID_PEPPER", rfidUidPepper, 32);
    requireProductionSecret(env, "DEVICE_CREDENTIAL_ENCRYPTION_KEY", deviceCredentialEncryptionKey, 32);
    requireProductionSecret(env, "TERMINAL_ACTIVATION_CODE", terminalActivationCode, 16);
    if (new Set([rfidUidPepper, deviceCredentialEncryptionKey, terminalActivationCode]).size !== 3) {
      throw new Error("Production RFID and terminal secrets must be distinct");
    }
  }

  const accessTokenTtlSeconds = positiveInteger(env.ACCESS_TOKEN_TTL_SECONDS, 900, "ACCESS_TOKEN_TTL_SECONDS", 86_400);
  const refreshTokenTtlSeconds = positiveInteger(env.REFRESH_TOKEN_TTL_SECONDS, 2_592_000, "REFRESH_TOKEN_TTL_SECONDS", 31_536_000);
  if (refreshTokenTtlSeconds <= accessTokenTtlSeconds) {
    throw new Error("REFRESH_TOKEN_TTL_SECONDS must be greater than ACCESS_TOKEN_TTL_SECONDS");
  }

  return Object.freeze({
    nodeEnv: nodeEnv as AppConfig["nodeEnv"],
    host: env.HOST ?? "127.0.0.1",
    port: positiveInteger(env.PORT, 3000, "PORT", 65_535),
    publicOrigin: origin.origin,
    databaseUrl,
    databaseSsl,
    databaseSslCa: env.DATABASE_SSL_CA?.trim() || null,
    databasePoolMax: positiveInteger(env.DATABASE_POOL_MAX, 10, "DATABASE_POOL_MAX", 100),
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    cookieSecure,
    trustProxy: trustProxyFromEnv(env.TRUST_PROXY, nodeEnv === "production"),
    logLevel,
    rfidUidPepper,
    deviceCredentialEncryptionKey,
    terminalActivationCode,
    frontendRoot: env.FRONTEND_ROOT?.trim() ? resolve(env.FRONTEND_ROOT.trim()) : null
  });
}
