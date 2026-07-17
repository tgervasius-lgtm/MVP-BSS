import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import test from "node:test";
import { loadConfig } from "../../src/config.js";

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
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "0123456789abcdef0123456789abcdef",
    DEVICE_CREDENTIAL_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789",
    TERMINAL_ACTIVATION_CODE: "terminal-activation-2026"
  });
  assert.equal(config.rfidUidPepper.length, 32);
});

test("production requires explicit terminal encryption and activation secrets", () => {
  const base = {
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "0123456789abcdef0123456789abcdef"
  };
  assert.throws(() => loadConfig(base));
  assert.throws(() => loadConfig({ ...base, DEVICE_CREDENTIAL_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789" }));
});

test("test configuration is explicit and immutable", () => {
  const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test", FRONTEND_ROOT: "../dist" });
  assert.equal(config.cookieSecure, false);
  assert.equal(config.accessTokenTtlSeconds, 900);
  assert.equal(isAbsolute(config.frontendRoot ?? ""), true);
  assert.equal(Object.isFrozen(config), true);
});
