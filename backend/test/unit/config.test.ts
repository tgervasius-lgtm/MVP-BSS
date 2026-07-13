import assert from "node:assert/strict";
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
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "too-short"
  }));
  const config = loadConfig({
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://bss.example",
    COOKIE_SECURE: "true",
    RFID_UID_PEPPER: "0123456789abcdef0123456789abcdef"
  });
  assert.equal(config.rfidUidPepper.length, 32);
});

test("test configuration is explicit and immutable", () => {
  const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test" });
  assert.equal(config.cookieSecure, false);
  assert.equal(config.accessTokenTtlSeconds, 900);
  assert.equal(Object.isFrozen(config), true);
});
