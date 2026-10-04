import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import test, { type TestContext } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService, FakePhaseAService } from "../helpers/fakes.js";

const html = "<!doctype html><title>BSS static fixture</title>";
const asset = "body { color: black; }\n";
const secret = "synthetic-outside-root-sentinel";

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "bss-static-"));
  const root = join(directory, "public");
  await mkdir(join(root, "private"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "index.html"), html),
    writeFile(join(root, "app.css"), asset),
    writeFile(join(root, "private", "secret.txt"), secret),
    writeFile(join(directory, "outside.txt"), secret)
  ]);
  t.after(() => rm(directory, { recursive: true, force: true }));
  return root;
}

async function bss(t: TestContext, root: string) {
  const config = loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://unused", COOKIE_SECURE: "false", LOG_LEVEL: "silent", FRONTEND_ROOT: root });
  const app = await buildApp({ config, authService: new FakeAuthService(), phaseAService: new FakePhaseAService(), logger: false });
  t.after(() => app.close());
  return app;
}

// Keep the request-target intact: URL/fetch clients may normalize the attack away.
async function rawGet(app: FastifyInstance, path: string) {
  if (!app.server.listening) await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: address.port, path, headers: { accept: "application/json" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("Static fixture request timed out")));
    req.end();
  });
}

test("BSS public assets preserve bytes, HEAD, validators and security headers", async (t) => {
  const app = await bss(t, await fixture(t));
  const response = await app.inject({ method: "GET", url: "/app.css" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body, asset);
  assert.match(String(response.headers["content-type"]), /^text\/css/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.match(String(response.headers["content-security-policy"]), /default-src 'self'/);
  assert.ok(response.headers.etag);
  assert.ok(response.headers["last-modified"]);
  const head = await app.inject({ method: "HEAD", url: "/app.css" });
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, "");
  assert.equal(head.headers["content-length"], String(Buffer.byteLength(asset)));
  const cached = await app.inject({ method: "GET", url: "/app.css", headers: { "if-none-match": String(response.headers.etag) } });
  assert.equal(cached.statusCode, 304);
  assert.equal(cached.body, "");
});

test("BSS SPA fallback preserves API, session and role boundaries", async (t) => {
  const app = await bss(t, await fixture(t));
  for (const url of ["/", "/index.html", "/workers/detail"]) {
    const response = await app.inject({ method: "GET", url, headers: { accept: "text/html" } });
    assert.equal(response.statusCode, 200, url);
    assert.equal(response.body, html, url);
    assert.match(String(response.headers["cache-control"]), /no-store/);
  }
  const missing = await app.inject({ method: "GET", url: "/api/v1/missing", headers: { accept: "text/html" } });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().code, "NOT_FOUND");
  const unauthenticated = await app.inject({ method: "GET", url: "/api/v1/organization" });
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.json().code, "UNAUTHENTICATED");
  assert.equal(unauthenticated.headers["cache-control"], "no-store, private");
  const worker = await app.inject({ method: "GET", url: "/api/v1/organization", cookies: { bss_session: "worker" } });
  assert.equal(worker.statusCode, 403);
  const admin = await app.inject({ method: "GET", url: "/api/v1/organization", cookies: { bss_session: "admin" } });
  assert.equal(admin.statusCode, 200);
  const post = await app.inject({ method: "POST", url: "/workers/detail", headers: { accept: "text/html" } });
  assert.equal(post.statusCode, 404);
  assert.notEqual(post.body, html);
});

test("BSS static root never exposes a sibling file through traversal", async (t) => {
  const app = await bss(t, await fixture(t));
  for (const path of ["/../outside.txt", "/%2e%2e/outside.txt", "/..%2foutside.txt", "/%2e%2e%5coutside.txt"]) {
    const response = await rawGet(app, path);
    // BSS's existing generic error handler maps plugin errors to 500.
    assert.ok(response.status >= 400, `${path}: ${response.status}`);
    assert.ok(!response.body.includes(secret), path);
  }
});

test("upstream static guard rejects noncanonical request paths before file sending", async (t) => {
  const root = await fixture(t);
  const app = Fastify();
  t.after(() => app.close());
  app.all("/private/*", (_req, reply) => reply.code(401).send("guarded"));
  await app.register(fastifyStatic, { root });
  assert.equal((await rawGet(app, "/private/secret.txt")).status, 401);
  for (const path of ["//private/secret.txt", "/./private/secret.txt", "/%2e/private/secret.txt", "/%2E/private/secret.txt"]) {
    const response = await rawGet(app, path);
    assert.equal(response.status, 403, `${path}: ${response.body}`);
    assert.ok(!response.body.includes(secret), path);
  }
});

test("native filesystem spelling cannot bypass static route and allowedPath guards", async (t) => {
  const root = await fixture(t);
  const caseInsensitive = existsSync(join(root, "PRIVATE", "secret.txt"));
  t.diagnostic(`platform=${process.platform}; node=${process.version}; caseInsensitive=${caseInsensitive}`);
  if (process.env.BSS_REQUIRE_CASE_INSENSITIVE === "true") {
    assert.equal(process.platform, "win32", "Windows evidence requires a native Windows runner");
    assert.equal(caseInsensitive, true, "Required case-insensitive fixture filesystem is unavailable");
  }
  const guarded = Fastify();
  t.after(() => guarded.close());
  guarded.all("/private/*", (_req, reply) => reply.code(401).send("guarded"));
  await guarded.register(fastifyStatic, { root });
  assert.equal((await rawGet(guarded, "/private/secret.txt")).status, 401);
  const alias = await rawGet(guarded, "/PRIVATE/secret.txt");
  assert.equal(alias.status, caseInsensitive ? 403 : 404);
  assert.ok(!alias.body.includes(secret));

  const checked: string[] = [];
  const allowed = Fastify();
  t.after(() => allowed.close());
  await allowed.register(fastifyStatic, { root, allowedPath: (path) => { checked.push(path); return !path.startsWith("/private/"); } });
  assert.equal((await rawGet(allowed, "/private/secret.txt")).status, 404);
  checked.length = 0;
  const denied = await rawGet(allowed, "/PRIVATE/secret.txt");
  assert.equal(denied.status, caseInsensitive ? 403 : 404);
  assert.ok(!denied.body.includes(secret));
  if (caseInsensitive) assert.deepEqual(checked, [], "Reject case aliases before invoking case-sensitive authorization");
  assert.equal((await rawGet(allowed, "/app.css")).body, asset);
});

test("relative and native absolute sendFile plus Unicode downloads remain compatible", async (t) => {
  const root = await fixture(t);
  const absolute = join(root, "app.css");
  assert.ok(isAbsolute(absolute));
  const app = Fastify();
  t.after(() => app.close());
  await app.register(fastifyStatic, { root, serve: false });
  app.get("/relative", (_req, reply) => reply.sendFile("app.css"));
  const relative = await app.inject({ method: "GET", url: "/relative" });
  assert.equal(relative.statusCode, 200, relative.body);
  assert.equal(relative.body, asset);
  // Absolute paths are supported without a configured root, as upstream documents.
  const rootless = Fastify();
  t.after(() => rootless.close());
  await rootless.register(fastifyStatic, { serve: false });
  rootless.get("/absolute", (_req, reply) => reply.sendFile(absolute));
  rootless.get("/download", (_req, reply) => reply.download(absolute, "izvještaj.css"));
  const response = await rootless.inject({ method: "GET", url: "/absolute" });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.body, asset);
  const download = await rootless.inject({ method: "GET", url: "/download" });
  assert.equal(download.statusCode, 200, download.body);
  assert.equal(download.body, asset);
  assert.match(String(download.headers["content-disposition"]), /^attachment;/);
  assert.match(String(download.headers["content-disposition"]), /filename\*=UTF-8''izvje%C5%A1taj\.css/);
});
