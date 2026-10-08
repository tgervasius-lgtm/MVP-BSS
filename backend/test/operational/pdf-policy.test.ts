import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import PDFDocument from 'pdfkit';
import { inspectPdf, QPDF_PATH } from '../../src/documents/pdf-policy.js';
import { structurePdf, syntheticPdf } from '../helpers/pdf-fixture.js';

const run = promisify(execFile);
const embedded = '<< /Type /EmbeddedFile /Length 7 >>\nstream\nfixture\nendstream';

test('actual qpdf policy: clean pages/text/images pass; attachment forms and encoded names fail', async () => {
  await inspectPdf(structurePdf([], '/Note (/EmbeddedFile and /EF are ordinary text here)'));
  const pages = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument(); const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk)); doc.on('error', reject); doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text('Synthetic contract page 1'); doc.addPage().text('Synthetic annex page 2');
    doc.image(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aChsAAAAASUVORK5CYII=', 'base64'));
    doc.end();
  });
  await inspectPdf(pages);
  const fixtures = [
    await syntheticPdf('benign attached file', Buffer.from('benign')),
    await syntheticPdf('alternate MIME', Buffer.from('benign'), 'text/plain'),
    structurePdf([embedded]), // unreferenced stream, no catalog name tree
    structurePdf([embedded.replace('/EmbeddedFile', '/#45mbedded#46ile')]),
    structurePdf(['<< /Type /Filespec /#45#46 << /F 5 0 R >> >>', embedded], '/AF [4 0 R]'),
    structurePdf(['<< /Type /Annot /Subtype /FileAttachment /Rect [0 0 10 10] /FS 5 0 R >>', '<< /Type /Filespec /EF << /F 6 0 R >> >>', embedded], '', '/Annots [4 0 R]'),
    structurePdf(['<< /Type 5 0 R /Length 7 >>\nstream\nfixture\nendstream', '/EmbeddedFile']),
    structurePdf(['<< /EF << /F 5 0 R >> >>', embedded, '<< /Names [(fixture) 4 0 R] >>'], '/Names << /EmbeddedFiles << /Kids [6 0 R] >> >>'),
    structurePdf([], '/Collection << >>'),
  ];
  for (const [index, fixture] of fixtures.entries()) {
    await assert.rejects(inspectPdf(fixture), { code: 'VALIDATION_FAILED' }, `Attachment form ${index} must fail`);
  }
});

test('actual qpdf policy: object streams, incremental attachment, password/encryption and malformed xrefs fail closed', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bss-policy-fixture-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, 'input.pdf'), output = join(directory, 'output.pdf');
  const transform = async (bytes: Buffer, options: string[]) => {
    await writeFile(input, bytes, { mode: 0o600 });
    await run(QPDF_PATH, [input, ...options, output], { timeout: 5000 });
    return readFile(output);
  };
  const clean = await syntheticPdf('clean compressed object PDF');
  await inspectPdf(await transform(clean, ['--object-streams=generate']));
  const attachment = await syntheticPdf('compressed object attachment', Buffer.from('benign'));
  await assert.rejects(inspectPdf(await transform(attachment, ['--object-streams=generate'])), { code: 'VALIDATION_FAILED' });
  for (const password of ['', 'synthetic-password']) {
    const encrypted = await transform(clean, ['--encrypt', password, 'synthetic-owner', '256', '--']);
    await assert.rejects(inspectPdf(encrypted), { code: 'VALIDATION_FAILED' });
  }
  const original = structurePdf();
  const previous = original.toString('latin1').match(/startxref\n(\d+)/)![1]!;
  const root = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /AF [4 0 R] >>\nendobj\n';
  const filespec = '4 0 obj\n<< /Type /Filespec /EF << /F 5 0 R >> >>\nendobj\n';
  const stream = `5 0 obj\n${embedded}\nendobj\n`;
  const offset4 = original.length + root.length, offset5 = offset4 + filespec.length, xref = offset5 + stream.length;
  const entry = (offset: number) => `${String(offset).padStart(10, '0')} 00000 n \n`;
  const updated = Buffer.concat([original, Buffer.from(`${root}${filespec}${stream}xref\n1 1\n${entry(original.length)}4 2\n${entry(offset4)}${entry(offset5)}trailer\n<< /Size 6 /Root 1 0 R /Prev ${previous} >>\nstartxref\n${xref}\n%%EOF\n`)]);
  await assert.rejects(inspectPdf(updated), { code: 'VALIDATION_FAILED' });
  for (const broken of [Buffer.from('%PDF-1.7\nnot a valid document\n%%EOF\n'), Buffer.from(original.toString('latin1').replace(/startxref\n\d+/, 'startxref\n1'))]) {
    await assert.rejects(inspectPdf(broken), { code: 'VALIDATION_FAILED' });
  }
});

test('actual qpdf policy removes its private temporary input on success and rejection', async () => {
  // This file runs its tests sequentially. Other test processes may own other directories.
  const before = new Set((await readdir('/dev/shm')).filter(name => name.startsWith('bss-pdf-')));
  await inspectPdf(structurePdf());
  await assert.rejects(inspectPdf(structurePdf([embedded])), { code: 'VALIDATION_FAILED' });
  const after = (await readdir('/dev/shm')).filter(name => name.startsWith('bss-pdf-') && !before.has(name));
  assert.deepEqual(after, []);
});

test('actual qpdf policy rejects bounded-input PDF whose decoded JSON exceeds the output budget', async () => {
  // Binary metadata expands to twice its size in qpdf JSON; still <5 MiB on input.
  const oversizedInspection = structurePdf([], `/Note (${'\0'.repeat(4_300_000)})`);
  assert.ok(oversizedInspection.length < 5 * 1024 * 1024);
  await assert.rejects(inspectPdf(oversizedInspection), { code: 'DOCUMENTS_UNAVAILABLE' });
});
