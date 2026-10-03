// Synthetic H2-0 experiment only. Never import this module into the HTTP server.
// No network, database, customer files or production policy. JSON goes to stdout.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { availableParallelism, arch, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);
const self = fileURLToPath(import.meta.url);
const columns = ['code', 'name', 'email', 'department', 'shift', 'annualLeaveAllowance'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function parseFixture(bytes, format, rowCount, lexicalCsv) {
  const before = process.memoryUsage().rss;
  const started = performance.now();
  const book = new ExcelJS.Workbook();
  const sheet = format === 'xlsx'
    ? (await book.xlsx.load(bytes)).worksheets[0]
    : await book.csv.read(Readable.from([bytes]), {
      ...(lexicalCsv ? { map: (value) => value } : {}),
      parserOptions: { delimiter: ',', headers: false }
    });
  assert.equal(sheet.rowCount - 1, rowCount);
  const rows = [];
  for (let index = 2; index <= sheet.rowCount; index += 1) {
    rows.push(sheet.getRow(index).values.slice(1).map(String));
  }
  if (lexicalCsv || format === 'xlsx') assert.equal(rows[0][0], '000001');
  return {
    rows: rowCount, inputBytes: bytes.length, inputSha256: hash(bytes),
    parsedSha256: hash(JSON.stringify(rows)),
    firstCodePreserved: sheet.getCell('A2').value === '000001',
    parseAndScanMs: Number((performance.now() - started).toFixed(2)),
    rssBeforeMiB: Number((before / 1048576).toFixed(2)),
    peakProcessRssMiB: Number((process.resourceUsage().maxRSS / 1024).toFixed(2))
  };
}

function run(bytes, format, count, lexicalCsv = true) {
  const started = performance.now();
  const child = spawnSync(process.execPath,
    ['--max-old-space-size=128', self, '--child', format, String(count), String(lexicalCsv)],
    { input: bytes, encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL', maxBuffer: 1048576 });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr.slice(0, 1000));
  return { ...JSON.parse(child.stdout), processWallMs: Number((performance.now() - started).toFixed(2)) };
}

async function measureSize(count) {
  const observations = [];
  const book = new ExcelJS.Workbook();
  book.created = new Date('2026-01-01T00:00:00Z');
  book.modified = book.created;
  const sheet = book.addWorksheet('Workers');
  sheet.addRow(columns);
  for (let index = 1; index <= count; index += 1) {
    sheet.addRow([String(index).padStart(6, '0'), `Synthetic worker ${index}`,
      `worker${index}@example.invalid`, 'Department A', 'Shift A', 20]);
  }
  const csv = await book.csv.writeBuffer({ formatterOptions: { delimiter: ',' } });
  const xlsx = await book.xlsx.writeBuffer();
  for (const [format, bytes] of [['csv', csv], ['xlsx', xlsx]]) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      observations.push({ format, repetition, ...run(bytes, format, count) });
    }
  }
  return { observations, csv };
}

if (process.argv[2] === '--child') {
  const [, , , format, count, lexical] = process.argv;
  assert.equal(process.argv.length, 6);
  assert.ok(['csv', 'xlsx'].includes(format));
  assert.ok(['100', '1000', '5000'].includes(count));
  assert.ok(['true', 'false'].includes(lexical));
  // Pipe bytes, never accept a filesystem path from CLI arguments.
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    assert.ok(length <= 1048576, 'Synthetic input exceeds experiment bound');
    chunks.push(chunk);
  }
  console.log(JSON.stringify(await parseFixture(Buffer.concat(chunks), format, Number(count), lexical === 'true')));
} else {
  assert.equal(process.argv.length, 2, 'This experiment accepts no external input files.');
  // Keep samples sequential; concurrent parser children would confound capacity observations.
  const small = await measureSize(100);
  const medium = await measureSize(1000);
  const large = await measureSize(5000);
  const observations = [...small.observations, ...medium.observations, ...large.observations];
  const defaultCsv = run(small.csv, 'csv', 100, false);
  assert.equal(defaultCsv.firstCodePreserved, false, 'Revisit lexical-conversion finding if dependency changes.');
  const formulaBook = new ExcelJS.Workbook();
  const formulaSheet = formulaBook.addWorksheet('Workers');
  formulaSheet.addRow(columns);
  formulaSheet.addRow(['000001', { formula: '1+1', result: 2 }, '', 'Department A', 'Shift A', 20]);
  const parsed = await new ExcelJS.Workbook().xlsx.load(await formulaBook.xlsx.writeBuffer());
  assert.equal(parsed.worksheets[0].getCell('B2').value.formula, '1+1');
  const corruption = await new ExcelJS.Workbook().xlsx.load(Buffer.from('not an xlsx'))
    .then(() => false, () => true);
  assert.equal(corruption, true);
  console.log(JSON.stringify({
    experiment: 'H2-0 synthetic parser reconnaissance; NOT runtime/hostile-file/capacity certification',
    observedAt: new Date().toISOString(), node: process.version,
    exceljs: require('exceljs/package.json').version, platform: platform(), arch: arch(),
    availableParallelism: availableParallelism(), repetitions: 3,
    isolation: { oneFreshChildPerSample: true, childWallTimeoutMs: 10000, v8OldSpaceMiB: 128,
      totalRssHardLimit: false, database: 'UNAVAILABLE / NOT EXERCISED', targetDeployment: 'NOT EXERCISED' },
    scriptSha256: hash(await readFile(self)),
    lockfileSha256: hash(await readFile(new URL('../../package-lock.json', import.meta.url))),
    findings: { defaultCsvLeadingZeroPreserved: defaultCsv.firstCodePreserved,
      lexicalCsvPreservesLeadingZero: true, formulaObjectRequiresExplicitRejection: true,
      corruptXlsxRejected: corruption, hostileArchiveBoundsProven: false },
    observations
  }, null, 2));
}
