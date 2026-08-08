import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import test from "node:test";
import { loadConfig } from "../../src/config.js";

const productionBase = {
  NODE_ENV: "production",
  PUBLIC_ORIGIN: "https://bss.example",
  DATABASE_URL: "postgresql://bss_app:secret@db.internal/bss",
  COOKIE_SECURE: "true",
  RFID_UID_PEPPER: "0123456789abcdef0123456789abcdef",
  DEVICE_CREDENTIAL_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789",
  TERMINAL_ACTIVATION_CODE: "terminal-activation-2026"
} as const;

test("production refuses insecure cookies or a non-HTTPS public origin", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production", PUBLIC_ORIGIN: "http://bss.example", COOKIE_SECURE: "true" }));
  assert.throws(() => loadConfig({ NODE_ENV: "production", PUBLIC_ORIGIN: "https://bss.example", COOKIE_SECURE: "false" }));
});

test("production requires a dedicated RFID UID pepper", () => {
  assert.throws(() => loadConfig({
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    COOKIE_SECURE: "true"
  }));
  assert.throws(() => loadConfig({
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "too-short"
  }));
  const config = loadConfig({
    ...productionBase
  });
  assert.equal(config.rfidUidPepper.length, 32);
});

test("production requires explicit terminal encryption and activation secrets", () => {
  const base = {
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    DATABASE_URL: "postgresql://bss_app:secret@db.internal/bss",
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "0123456789abcdef0123456789abcdef"
  };
  assert.throws(() => loadConfig(base));
  assert.throws(() => loadConfig({ ...base, DEVICE_CREDENTIAL_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789" }));
  assert.throws(() => loadConfig({
    ...productionBase,
    RFID_UID_PEPPER: "replace-with-at-least-32-random-characters"
  }), /non-placeholder/);
  assert.throws(() => loadConfig({
    ...productionBase,
    DEVICE_CREDENTIAL_ENCRYPTION_KEY: productionBase.RFID_UID_PEPPER
  }), /distinct/);
});

test("production rejects implicit or malformed connection and listener configuration", () => {
  const { DATABASE_URL: _databaseUrl, ...withoutDatabase } = productionBase;
  assert.throws(() => loadConfig(withoutDatabase), /DATABASE_URL/);
  assert.throws(() => loadConfig({ ...productionBase, DATABASE_URL: "https://db.internal/bss" }), /postgres/);
  assert.throws(() => loadConfig({ ...productionBase, DATABASE_SSL: "false" }), /DATABASE_SSL/);
  assert.throws(() => loadConfig({ ...productionBase, PORT: "65536" }), /65535/);
  assert.throws(() => loadConfig({ ...productionBase, DATABASE_POOL_MAX: "101" }), /DATABASE_POOL_MAX/);
  assert.throws(() => loadConfig({ ...productionBase, LOG_LEVEL: "verbose" }), /LOG_LEVEL/);
  assert.throws(() => loadConfig({ ...productionBase, TRUST_PROXY: "true" }), /TRUST_PROXY/);
  assert.throws(() => loadConfig({ ...productionBase, TRUST_PROXY: "not-an-address" }), /TRUST_PROXY/);
  assert.throws(() => loadConfig({ ...productionBase, PUBLIC_ORIGIN: "https://user:secret@bss.example" }), /PUBLIC_ORIGIN/);
  assert.throws(() => loadConfig({
    ...productionBase,
    ACCESS_TOKEN_TTL_SECONDS: "900",
    REFRESH_TOKEN_TTL_SECONDS: "900"
  }), /REFRESH_TOKEN_TTL_SECONDS/);
  assert.throws(() => loadConfig({ ...productionBase, ACCESS_TOKEN_TTL_SECONDS: "86401" }), /ACCESS_TOKEN_TTL_SECONDS/);
  assert.throws(() => loadConfig({ ...productionBase, REFRESH_TOKEN_TTL_SECONDS: "31536001" }), /REFRESH_TOKEN_TTL_SECONDS/);
});

test("database TLS keeps certificate verification and accepts an optional private CA", () => {
  const config = loadConfig({ ...productionBase, DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----\nprivate-ca\n-----END CERTIFICATE-----" });
  assert.equal(config.databaseSsl, true);
  assert.match(config.databaseSslCa ?? "", /private-ca/);
});

test("production accepts only explicit trusted proxy addresses", () => {
  const config = loadConfig({ ...productionBase, TRUST_PROXY: "10.0.0.0/8,2001:db8::/32" });
  assert.deepEqual(config.trustProxy, ["10.0.0.0/8", "2001:db8::/32"]);
});

test("test configuration is explicit and immutable", () => {
  const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test", FRONTEND_ROOT: "../dist" });
  assert.equal(config.cookieSecure, false);
  assert.equal(config.accessTokenTtlSeconds, 900);
  assert.equal(config.databasePoolMax, 10);
  assert.equal(isAbsolute(config.frontendRoot ?? ""), true);
  assert.equal(Object.isFrozen(config), true);
});
