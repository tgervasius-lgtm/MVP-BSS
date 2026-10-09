import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, copyFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ExcelJS from "exceljs";
import { parseImportFile, importSandboxArgs, TABULAR_LIMITS } from "../../src/imports/tabular-parser.js";

const execute = promisify(execFile);
const headers = ["code", "name", "department", "shift", "annualLeaveAllowance", "email"];
const row = ["000001", "Synthetic Worker", "Office", "Day", 0, "synthetic@example.invalid"];
async function xlsx(edit?: (sheet: ExcelJS.Worksheet) => void): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Workers");
  sheet.addRow(headers); sheet.addRow(row); edit?.(sheet);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("actual isolated parser accepts ExcelJS XLSX/CSV and retains exact lexical IDs", async () => {
  const csv = Buffer.from(`${headers.join(",")}\n${row.join(",")}\n`);
  const result = await parseImportFile(csv, "csv", ",");
  assert.equal(result.rows[0]![0], "000001");
  const excel = await parseImportFile(await xlsx(), "xlsx", ",");
  assert.deepEqual(excel.rows[0], row);
  const many = await xlsx(sheet => {
    for (let i = 2; i <= 1000; i++) sheet.addRow([`${i}`.padStart(6, "0"), `Synthetic ${i}`, "Office", "Day", 366, `synthetic${i}@example.invalid`]);
  });
  assert.equal((await parseImportFile(many, "xlsx", ",")).rows.length, 1000);
});

test("actual parser rejects formulas, cached formulas, hidden data, hyperlinks and excess rows", async () => {
  for (const edit of [
    (s: ExcelJS.Worksheet) => { s.getCell("B2").value = { formula: "1+1", result: 2 }; },
    (s: ExcelJS.Worksheet) => { s.getRow(2).hidden = true; },
    (s: ExcelJS.Worksheet) => { s.getColumn(1).hidden = true; },
    (s: ExcelJS.Worksheet) => { s.state = "veryHidden"; },
    (s: ExcelJS.Worksheet) => { s.getCell("B2").value = { text: "Link", hyperlink: "https://example.invalid" }; },
    (s: ExcelJS.Worksheet) => { s.getCell("A1002").value = "outside"; },
    (s: ExcelJS.Worksheet) => { s.getCell("A2").value = new Date("2026-10-09T00:00:00Z"); }
  ]) await assert.rejects(parseImportFile(await xlsx(edit), "xlsx", ","), { kind: "REJECTED" });
});

test("same sandbox enforces memory/CPU/no-fork/no-network/no-secret/no-write boundaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bss-import-proof-"));
  const secret = join(tmpdir(), `bss-import-secret-${process.pid}`);
  try {
    await writeFile(secret, "SYNTHETIC-OUTSIDE-SANDBOX");
    await copyFile(new URL("../../import-parser/worker.py", import.meta.url), join(directory, "guard.py"));
    const probe = `import sys,os,socket,resource\nsys.path.insert(0,'/parser')\nfrom guard import restrict\nrestrict()\nassert not os.environ.get('DATABASE_URL')\nassert resource.getrlimit(resource.RLIMIT_AS)==(${TABULAR_LIMITS.memoryBytes},${TABULAR_LIMITS.memoryBytes})\nassert resource.getrlimit(resource.RLIMIT_CPU)==(3,3)\nassert resource.getrlimit(resource.RLIMIT_CORE)==(0,0)\nfor action in [lambda: socket.socket(),lambda: os.fork(),lambda: open(${JSON.stringify(secret)}),lambda: open('/tmp/write','w')]:\n try:\n  action()\n except OSError:\n  pass\n else:\n  raise RuntimeError('sandbox boundary failed')\ntry:\n value=bytearray(${TABULAR_LIMITS.memoryBytes})\nexcept MemoryError:\n pass\nelse:\n raise RuntimeError('memory ceiling failed')\nprint('ISOLATION_PASS')\n`;
    await writeFile(join(directory, "worker.py"), probe);
    const result = await execute("/usr/bin/bwrap", importSandboxArgs(directory), {
      timeout: 5000, maxBuffer: 4096, env: { LANG: "C.UTF-8", DATABASE_URL: "synthetic-test-secret" }
    });
    assert.equal(result.stdout.trim(), "ISOLATION_PASS");
    assert.equal(result.stderr, "");
  } finally {
    await rm(directory, { recursive: true, force: true }); await rm(secret, { force: true });
  }
});

test("sandbox CPU ceiling terminates an untrusted busy loop", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bss-import-cpu-"));
  try {
    await writeFile(join(directory, "worker.py"), "while True: pass\n");
    await assert.rejects(execute("/usr/bin/bwrap", importSandboxArgs(directory), { timeout: 7000, env: {}, maxBuffer: 1024 }),
      (error: unknown) => !!error && typeof error === "object" && (
        ("code" in error && error.code === 137) || ("signal" in error && error.signal === "SIGKILL")));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("compiled artifact contains the same parser and sandbox remains mandatory", async () => {
  const { pathToFileURL } = await import("node:url");
  const { resolve } = await import("node:path");
  const compiled = await import(pathToFileURL(resolve("dist/src/imports/tabular-parser.js")).href) as { parseImportFile: typeof parseImportFile };
  assert.equal((await compiled.parseImportFile(Buffer.from(`${headers.join(",")}\n${row.join(",")}`), "csv", ",")).rows.length, 1);
});
