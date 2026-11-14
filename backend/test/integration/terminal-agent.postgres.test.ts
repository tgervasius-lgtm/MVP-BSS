import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { terminalFixture } from "../helpers/terminal-fixture.js";

const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";

test("real Python queue to Fastify/PostgreSQL: response loss, restart, duplicate and uncertain clock", {
  skip: !databaseUrl && !required, timeout: 60000
}, async (t) => {
  assert.ok(databaseUrl, "Explicit disposable PostgreSQL database required");
  const fixture = await terminalFixture(databaseUrl);
  t.after(fixture.dispose);
  const directory = await mkdtemp(join(tmpdir(), "bss-terminal-test-"));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const configFile = join(directory, "config.json");
  await writeFile(configFile, JSON.stringify(fixture.agentConfig), {mode: 0o600});
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(process.env.BSS_PYTHON ?? "python3", ["-m", "terminal.tests.backend_probe", configFile, join(directory, "state")],
      {cwd: fileURLToPath(new URL("../../../", import.meta.url)), timeout: 30000});
    let output = ""; let errors = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { errors += data; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(`Python probe failed (${code}): ${errors}`)));
  });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.counts, {duplicate: 1, synced: 1, reconciliation_required: 1});
  const raw = await fixture.owner.query<{processing_status: string; acknowledgement_proof_status: string}>(
    "SELECT processing_status, acknowledgement_proof_status FROM attendance_events ORDER BY sequence");
  assert.equal(raw.rowCount, 3, "response-loss retry must not create another raw event");
  assert.deepEqual(raw.rows.map(row => row.processing_status), ["accepted", "accepted", "reconciliation_required"]);
  assert.ok(raw.rows.every(row => row.acknowledgement_proof_status === "verified"));
  const day = new Date().toISOString().slice(0, 10);
  const attendance = await fixture.service.listAttendance(fixture.actor, {from: day, to: day, limit: 50});
  assert.ok(attendance.items.some(row => row.workerId === fixture.workers[0]!.id));
  const terminal = (await fixture.service.listTerminals(fixture.actor))[0]!;
  assert.equal(terminal.status, "online");
});
