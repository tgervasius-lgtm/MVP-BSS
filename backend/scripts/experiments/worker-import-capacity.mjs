// Synthetic H2-0 experiment only. Never import this module into the HTTP server.
// No network, database, customer files or production policy. JSON goes to stdout.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { availableParallelism, arch, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);
const self = fileURLToPath(import.meta.url);
const columns = ['code', 'name', 'email', 'department', 'shift', 'annualLeaveAllowance'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function parseFixture(path, format, rowCount, lexicalCsv) {
  const bytes = await readFile(path);
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
    rows.push(sheet.getRow(index).values.slice(1).map((value) => String(value)));
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

if (process.argv[2] === '--child') {
  const [, , , path, format, count, lexical] = process.argv;
  console.log(JSON.stringify(await parseFixture(path, format, Number(count), lexical === 'true')));
} else {
  assert.equal(process.argv.length, 2, 'This experiment accepts no external input files.');
  const directory = await mkdtemp(join(tmpdir(), 'bss-h2-synthetic-'));
  const observations = [];
  function run(path, format, count, lexicalCsv = true) {
    const started = performance.now();
    const child = spawnSync(process.execPath,
      ['--max-old-space-size=128', self, '--child', path, format, String(count), String(lexicalCsv)],
      { encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL', maxBuffer: 1048576 });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr.slice(0, 1000));
    return { ...JSON.parse(child.stdout), processWallMs: Number((performance.now() - started).toFixed(2)) };
  }
  try {
    for (const count of [100, 1000, 5000]) {
      const book = new ExcelJS.Workbook();
      book.created = new Date('2026-01-01T00:00:00Z');
      book.modified = book.created;
      const sheet = book.addWorksheet('Workers');
      sheet.addRow(columns);
      for (let index = 1; index <= count; index += 1) {
        sheet.addRow([String(index).padStart(6, '0'), `Synthetic worker ${index}`,
          `worker${index}@example.invalid`, 'Department A', 'Shift A', 20]);
      }
      for (const format of ['csv', 'xlsx']) {
        const bytes = format === 'xlsx' ? await book.xlsx.writeBuffer()
          : await book.csv.writeBuffer({ formatterOptions: { delimiter: ',' } });
        const path = join(directory, `workers-${count}.${format}`);
        await writeFile(path, bytes);
        for (let repetition = 1; repetition <= 3; repetition += 1) {
          observations.push({ format, repetition, ...run(path, format, count) });
        }
      }
    }
    const defaultCsv = run(join(directory, 'workers-100.csv'), 'csv', 100, false);
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
