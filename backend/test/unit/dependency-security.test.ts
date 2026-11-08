import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

// Resolve each real consumer's copy: AJV and fast-json-stringify use different
// supported fast-uri majors. A top-level-only check would miss one of them.
for (const consumer of ["ajv", "fast-json-stringify"]) {
  const fromConsumer = createRequire(require.resolve(consumer));
  const uri = fromConsumer("fast-uri") as typeof import("fast-uri");

  test(`${consumer}: encoded text cannot become an active URI scheme`, () => {
    for (const value of ["%6Aavascript:alert(1)", "%u006Aavascript:alert(1)"]) {
      assert.notEqual(uri.parse(value).scheme, "javascript");
      assert.notEqual(uri.normalize(value), "javascript:alert(1)");
    }
    assert.equal(uri.normalize("https://example.test/a"), "https://example.test/a");
  });

  test(`${consumer}: relative references retain their resolution target`, () => {
    const base = "https://example.test/tenant/folder/document";
    for (const reference of ["a/../b", "../x"]) {
      assert.equal(uri.resolve(base, uri.normalize(reference)), uri.resolve(base, reference));
    }
  });

  test(`${consumer}: ambiguous or whitespace-smuggled authorities are rejected`, () => {
    for (const value of ["http://a@b@evil.example/", "http://exa\tmple.test/"]) {
      assert.ok(uri.parse(value).error, value);
    }
    assert.equal(uri.parse("https://example.test/path").error, undefined);
  });

  test(`${consumer}: suffix output cannot reparse as an active scheme`, () => {
    // Exercise a schemeless path, not suffix parsing's authority shorthand.
    // URI normalization is not a sanitizer for arbitrary scheme-bearing text.
    const result = uri.serialize({ path: "javascript:alert(1)" }, { reference: "suffix" });
    assert.notEqual(uri.parse(result).scheme, "javascript");
  });
}

test("rate limiter IPv6 parser rejects adversarial zones inside a bounded worker", () => {
  const limiter = createRequire(require.resolve("@fastify/rate-limit"));
  const modulePath = limiter.resolve("ip-address");
  const code = `
    const assert = require('node:assert/strict');
    const { Address6 } = require(${JSON.stringify(modulePath)});
    assert.equal(Address6.isValid('2001:db8::1'), true);
    assert.equal(Address6.isValid('fe80::1%eth0'), true);
    assert.equal(Address6.isValid('%'.repeat(1 << 19) + '\\n'), false);
    console.log('bounded-ip-rejection');
  `;
  const result = spawnSync(process.execPath, ["--max-old-space-size=128", "-e", code], {
    encoding: "utf8", timeout: 5000, maxBuffer: 4096,
  });
  assert.equal(result.error, undefined, "IP parsing worker must finish without a timeout");
  assert.equal(result.status, 0, "ordinary addresses must remain valid and hostile input rejected");
  assert.match(result.stdout, /bounded-ip-rejection/);
});

test("static plugin glob performs no filesystem traversal after an already-aborted signal", (t) => {
  const fromStatic = createRequire(require.resolve("@fastify/static"));
  const { globSync } = fromStatic("glob") as typeof import("glob");
  const controller = new AbortController();
  controller.abort(new Error("synthetic traversal cancellation"));
  const directory = fs.mkdtempSync(join(tmpdir(), "bss-cancelled-glob-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let reads = 0;
  assert.throws(() => globSync("**/*", {
    cwd: directory, signal: controller.signal,
    fs: { ...fs, readdirSync: (path: string, options: { withFileTypes: true }) => {
      reads += 1;
      return fs.readdirSync(path, options);
    } },
  }), /synthetic traversal cancellation/);
  assert.equal(reads, 0, "cancelled discovery must not start reading directories");
});
