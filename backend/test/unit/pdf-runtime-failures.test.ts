import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { promisify } from "node:util";
import test from "node:test";

test("PDF inspection rejects runtime and cleanup faults without exposing metadata", async (t) => {
  const remove = fs.rm;
  const create = fs.mkdtemp;
  const permissions = fs.lstat;
  const originalExecute = childProcess.execFile;
  const owned: string[] = [];
  let cleanupFails = false;
  let parserRejects = false;
  let unsafeMode = false;
  let unsafeOwner = false;
  let parentMode: number | undefined;
  let parentOwner: number | undefined;
  let parentIsDirectory = true;
  let executions = 0;
  let removals = 0;
  t.after(async () => {
    t.mock.restoreAll();
    childProcess.execFile = originalExecute;
    syncBuiltinESMExports();
    for (const directory of owned) await remove(directory, { recursive: true, force: true });
  });
  t.mock.method(fs, "access", () => Promise.resolve());
  t.mock.method(fs, "mkdtemp", async (prefix: string) => {
    const directory = await create(prefix);
    if (prefix.startsWith("/dev/shm/bss-pdf-")) owned.push(directory);
    return directory;
  });
  t.mock.method(fs, "lstat", async (path: string) => {
    const result = await permissions(path);
    if (path === "/dev/shm") {
      if (parentMode !== undefined) result.mode = (result.mode & ~0o7777) | parentMode;
      if (parentOwner !== undefined) result.uid = parentOwner;
      if (!parentIsDirectory) result.isDirectory = () => false;
    } else {
      if (unsafeMode) result.mode = (result.mode & ~0o777) | 0o755;
      if (unsafeOwner) result.uid += 1;
    }
    return result;
  });
  t.mock.method(fs, "rm", async (path: string, options: Parameters<typeof fs.rm>[1]) => {
    if (!owned.includes(path)) return remove(path, options);
    removals++;
    if (cleanupFails) throw new Error("synthetic filesystem metadata");
    await remove(path, options);
  });
  const execute = Object.assign(() => {}, {
    [promisify.custom]: async (_command: string, args: string[]) => {
      executions++;
      const directory = owned.at(-1)!;
      assert.equal((await permissions(directory)).mode & 0o777, 0o700);
      assert.equal((await permissions(`${directory}/input.pdf`)).mode & 0o777, 0o600);
      const value = { version: 2, encrypt: { encrypted: false }, qpdf: [
        { jsonversion: 2 }, { trailer: {}, "obj:1 0 R": { value: { "/Type": parserRejects ? "/EmbeddedFile" : "/Catalog" } } }
      ] };
      return { stdout: args.includes("--check") ? "" : JSON.stringify(value), stderr: "" };
    }
  });
  childProcess.execFile = execute as unknown as typeof childProcess.execFile;
  syncBuiltinESMExports();
  const { inspectPdf } = await import("../../src/documents/pdf-policy.js");
  const bytes = Buffer.from("%PDF-1.4\nsynthetic\n%%EOF");
  await t.test("valid structure succeeds only after private input cleanup", async () => {
    await inspectPdf(bytes);
    assert.equal(removals, 1);
    await assert.rejects(permissions(owned.at(-1)!), { code: "ENOENT" });
  });
  await t.test("disallowed structure remains 422 when cleanup succeeds", async () => {
    parserRejects = true;
    await assert.rejects(inspectPdf(bytes), { code: "VALIDATION_FAILED", statusCode: 422 });
    assert.equal(removals, 2);
  });
  await t.test("cleanup failure after valid or rejected input is 503 and never a success", async () => {
    cleanupFails = true;
    for (const rejected of [false, true]) {
      parserRejects = rejected;
      await assert.rejects(inspectPdf(bytes), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as { code?: string }).code, "DOCUMENTS_UNAVAILABLE");
        assert.equal((error as { statusCode?: number }).statusCode, 503);
        assert.doesNotMatch(error.message, /synthetic filesystem metadata/);
        return true;
      });
    }
    assert.equal(removals, 4);
    cleanupFails = false;
    parserRejects = false;
  });
  await t.test("wrong private directory mode or owner fails before any parser execution", async () => {
    const before = executions;
    unsafeMode = true;
    await assert.rejects(inspectPdf(bytes), { code: "DOCUMENTS_UNAVAILABLE" });
    unsafeMode = false;
    unsafeOwner = true;
    await assert.rejects(inspectPdf(bytes), { code: "DOCUMENTS_UNAVAILABLE" });
    unsafeOwner = false;
    assert.equal(executions, before);
    assert.equal(removals, 6);
  });
  await t.test("unsafe parent rejects before creating or parsing sensitive input", async () => {
    const created = owned.length;
    const before = executions;
    for (const mode of [0o777, 0o770, 0o722]) {
      parentMode = mode;
      await assert.rejects(inspectPdf(bytes), { code: "DOCUMENTS_UNAVAILABLE", statusCode: 503 });
    }
    parentMode = undefined;
    parentOwner = process.geteuid!() + 1;
    await assert.rejects(inspectPdf(bytes), { code: "DOCUMENTS_UNAVAILABLE", statusCode: 503 });
    parentOwner = undefined;
    parentIsDirectory = false;
    await assert.rejects(inspectPdf(bytes), { code: "DOCUMENTS_UNAVAILABLE", statusCode: 503 });
    parentIsDirectory = true;
    assert.equal(owned.length, created);
    assert.equal(executions, before);
  });
  await t.test("trusted private or sticky parent preserves upload and cleanup", async () => {
    for (const mode of [0o700, 0o755, 0o1777]) {
      parentMode = mode;
      await inspectPdf(bytes);
      await assert.rejects(permissions(owned.at(-1)!), { code: "ENOENT" });
    }
    parentMode = undefined;
  });
});
