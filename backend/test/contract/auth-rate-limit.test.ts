import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { loadConfig } from "../../src/config.js";
import { AppError } from "../../src/domain/errors.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService, FakePhaseAService } from "../helpers/fakes.js";

const publicOrigin = "http://localhost:3000";
const trustedProxy = "192.0.2.10";
const loginPayload = { email: "admin@example.test", password: "Secure test password" };

async function createApp(t: TestContext, trustProxy = trustedProxy, authService = new FakeAuthService()) {
  const config = loadConfig({
    NODE_ENV: "test",
    PUBLIC_ORIGIN: publicOrigin,
    DATABASE_URL: "postgres://unused",
    COOKIE_SECURE: "false",
    LOG_LEVEL: "silent",
    TRUST_PROXY: trustProxy
  });
  const app = await buildApp({ config, authService, phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());
  return app;
}

const authRoutes = [
  { method: "POST", url: "/api/v1/auth/login", max: 5, status: 200, payload: loginPayload },
  { method: "POST", url: "/api/v1/auth/invitations/accept", max: 5, status: 200,
    payload: { token: "invitation-token-for-security-test-1234", password: "Secure test password" } },
  { method: "POST", url: "/api/v1/auth/refresh", max: 30, status: 204 },
  { method: "POST", url: "/api/v1/auth/logout", max: 30, status: 204 },
  { method: "GET", url: "/api/v1/me", max: 120, status: 200 }
] as const;

// Exercise BSS's real route limits and trusted-proxy configuration, not a
// standalone copy of the plugin. Services are in-memory contract-test fakes.
for (const route of authRoutes) {
  test(`${route.url} shares one bucket across IPv6 addresses in the same /64`, async (t) => {
    const app = await createApp(t);
    const request = (ip: string) => app.inject({
      method: route.method,
      url: route.url,
      remoteAddress: trustedProxy,
      headers: { origin: publicOrigin, "x-forwarded-for": ip },
      cookies: { bss_session: "admin", bss_refresh: "refresh-admin" },
      ...("payload" in route ? { payload: route.payload } : {})
    });
    for (let attempt = 1; attempt <= route.max; attempt += 1) {
      assert.equal((await request(`2001:db8:abcd:1::${attempt.toString(16)}`)).statusCode, route.status);
    }
    const blocked = await request("2001:db8:abcd:1::ffff");
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.json().code, "RATE_LIMITED");
    assert.ok(blocked.json().requestId);
    assert.equal(blocked.headers["cache-control"], "no-store, private");
    assert.ok(Number(blocked.headers["retry-after"]) > 0);
    assert.equal((await request("2001:db8:abcd:2::1")).statusCode, route.status);
  });
}

test("IPv6 login limit survives expanded, compressed and mixed-case spellings", async (t) => {
  const app = await createApp(t);
  const request = (ip: string) => app.inject({
    method: "POST", url: "/api/v1/auth/login", remoteAddress: trustedProxy,
    headers: { origin: publicOrigin, "x-forwarded-for": ip }, payload: loginPayload
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await request("2001:db8:abcd:1::a")).statusCode, 200);
  }
  for (const spelling of ["2001:0DB8:ABCD:0001:0000:0000:0000:000A", "2001:db8:abcd:1::A"]) {
    assert.equal((await request(spelling)).statusCode, 429);
  }
});

test("IPv4-mapped addresses share the IPv4 login bucket while other IPv4 clients remain independent", async (t) => {
  const app = await createApp(t);
  const request = (ip: string) => app.inject({
    method: "POST", url: "/api/v1/auth/login", remoteAddress: trustedProxy,
    headers: { origin: publicOrigin, "x-forwarded-for": ip }, payload: loginPayload
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await request("198.51.100.42")).statusCode, 200);
  }
  for (const spelling of ["::ffff:198.51.100.42", "::ffff:c633:642a"]) {
    assert.equal((await request(spelling)).statusCode, 429);
  }
  assert.equal((await request("198.51.100.43")).statusCode, 200);
});

for (const trustProxy of [trustedProxy, "false"]) {
  test(`untrusted forwarding headers cannot rotate login buckets (TRUST_PROXY=${trustProxy})`, async (t) => {
    const app = await createApp(t, trustProxy);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await app.inject({
        method: "POST", url: "/api/v1/auth/login", remoteAddress: "198.51.100.42",
        headers: { origin: publicOrigin, "x-forwarded-for": `2001:db8:${attempt}::1` },
        payload: loginPayload
      });
      assert.equal(response.statusCode, attempt <= 5 ? 200 : 429);
    }
  });
}

test("a trusted proxy chain ignores forged addresses beyond the nearest untrusted client", async (t) => {
  const app = await createApp(t);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await app.inject({
      method: "POST", url: "/api/v1/auth/login", remoteAddress: trustedProxy,
      headers: { origin: publicOrigin, "x-forwarded-for": `2001:db8:${attempt}::1, 198.51.100.42` },
      payload: loginPayload
    });
    assert.equal(response.statusCode, attempt <= 5 ? 200 : 429);
  }
});

test("IPv6 rotation cannot reach password verification after five rejected login attempts", async (t) => {
  class RejectingAuthService extends FakeAuthService {
    attempts = 0;
    override async login(): Promise<never> {
      this.attempts += 1;
      throw new AppError("UNAUTHENTICATED", "Invalid test credentials");
    }
  }
  const authService = new RejectingAuthService();
  const app = await createApp(t, trustedProxy, authService);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await app.inject({
      method: "POST", url: "/api/v1/auth/login", remoteAddress: trustedProxy,
      headers: { origin: publicOrigin, "x-forwarded-for": `2001:db8:abcd:1::${attempt}` },
      payload: loginPayload
    });
    assert.equal(response.statusCode, attempt <= 5 ? 401 : 429);
    assert.equal(response.json().code, attempt <= 5 ? "UNAUTHENTICATED" : "RATE_LIMITED");
    assert.equal(response.headers["set-cookie"], undefined);
  }
  assert.equal(authService.attempts, 5);
});
