import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import pg from 'pg';
import PDFDocument from 'pdfkit';
import { loadDocumentConfig } from '../../src/documents/config.js';
import { openDocument, sealDocument } from '../../src/documents/crypto.js';
import { PgDocumentService } from '../../src/documents/pg-document-service.js';
import { clamScanner } from '../../src/documents/scanner.js';
import type { DocumentUpload } from '../../src/documents/model.js';
import { documentFixture } from '../helpers/document-fixture.js';
import { createPostgresFixture } from '../helpers/postgres-fixture.js';

const run = promisify(execFile);
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function prerequisites() {
  assert.equal(process.env.BSS_MAILBOX_DISPOSABLE_TEST, 'synthetic-ci-only', 'Explicit disposable test confirmation required');
  const database = process.env.BSS_TEST_DATABASE_URL;
  const socket = process.env.DOCUMENTS_CLAMD_SOCKET;
  assert.ok(database && socket, 'Disposable PostgreSQL URL and actual ClamAV socket required');
  const parsed = new URL(database);
  assert.ok(['127.0.0.1', 'localhost'].includes(parsed.hostname), 'Operational fixture only accepts loopback test PostgreSQL');
  assert.equal(parsed.pathname, '/bss_test', 'Use the explicit bss_test control database');
  assert.ok(socket.startsWith('/'), 'Absolute local Unix socket required');
  return { database, socket };
}

async function syntheticPdf(label: string, attachment?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('error', reject);
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.text(`BSS synthetic operational fixture: ${label}`);
    if (attachment) pdf.file(attachment, { name: 'eicar.com', type: 'application/octet-stream' });
    pdf.end();
  });
}

function upload(workerId: string, bytes: Buffer): DocumentUpload {
  return { workerId, uploadId: randomUUID(), title: 'Synthetic operational PDF', category: 'payslip', period: '2026-10', contentBase64: bytes.toString('base64') };
}

function postgresEnv(database: URL) {
  return { ...process.env, PGHOST: database.hostname, PGPORT: database.port || '5432', PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password), PGDATABASE: database.pathname.slice(1), PGCONNECT_TIMEOUT: '5' };
}

test('operational mailbox: actual ClamAV rejects EICAR before persistence and accepts a clean PDF', { timeout: 90_000 }, async t => {
  const { database, socket } = prerequisites();
  const scan = clamScanner(socket);
  const clean = await syntheticPdf('clean');
  await scan(clean);
  // Harmless industry test string; not live malware. Constructed at runtime so source scanners do not flag the repository.
  const eicar = Buffer.from(['X5O!P%@AP[4', '\\PZX54(P^)7CC)7}$', 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!', '$H+H*'].join(''));
  assert.equal(eicar.length, 68);
  await assert.rejects(scan(eicar), { code: 'VALIDATION_FAILED' });
  // Valid PDF with a file attachment: exercises actual PDF extraction rather than an ignored comment.
  const infected = await syntheticPdf('embedded safe antivirus fixture', eicar);
  const f = await documentFixture(database, scan);
  t.after(f.dispose);
  await assert.rejects(f.service.upload(f.first.admin, upload(f.first.workers[0]!, infected), 'eicar-upload'), { code: 'VALIDATION_FAILED' });
  assert.equal((await f.owner.query('SELECT count(*)::integer AS n FROM worker_documents')).rows[0].n, 0);
  assert.equal((await f.owner.query("SELECT count(*)::integer AS n FROM audit_events WHERE action='document.uploaded'")).rows[0].n, 0);
  const input = upload(f.first.workers[0]!, clean);
  const draft = await f.service.upload(f.first.accountant, input, 'clean-upload');
  await f.service.transition(f.first.accountant, draft.id, draft.revision, 'publish', 'clean-publish');
  assert.equal(hash((await f.service.download(f.first.worker, draft.id, 'clean-download')).content), hash(clean));
  const absent = new PgDocumentService(f.appPool, f.config, clamScanner(join(tmpdir(), `missing-clamd-${randomUUID()}`), 100));
  await assert.rejects(absent.upload(f.first.admin, upload(f.first.workers[0]!, clean), 'scanner-down'), { code: 'DOCUMENTS_UNAVAILABLE' });
  assert.equal((await f.owner.query('SELECT count(*)::integer AS n FROM worker_documents')).rows[0].n, 1);
});

test('operational mailbox: encrypted logical backup and separate keyring restore preserve both key generations and isolation', { timeout: 120_000 }, async t => {
  const { database, socket } = prerequisites();
  const scan = clamScanner(socket);
  const source = await documentFixture(database, scan);
  // Register source last in cleanup: restored ACLs refer to its runtime role.
  let target: Awaited<ReturnType<typeof createPostgresFixture>> | undefined;
  let restoredPool: pg.Pool | undefined;
  const directory = await mkdtemp(join(tmpdir(), 'bss-mailbox-drill-'));
  t.after(async () => {
    try { await restoredPool?.end(); }
    finally {
      try { await target?.dispose(); }
      finally { try { await source.dispose(); } finally { await rm(directory, { recursive: true, force: true }); } }
    }
  });
  const keys = new Map([['K1', randomBytes(32)], ['K2', randomBytes(32)]]);
  const config = { ...source.config, ring: { activeId: 'K1', keys } };
  const oldService = new PgDocumentService(source.appPool, config, scan);
  const actor = source.first;
  const documents = [];
  for (let index = 0; index < 3; index++) {
    const bytes = await syntheticPdf(`restore-${index}`);
    const service = index < 2 ? oldService : new PgDocumentService(source.appPool, { ...config, ring: { activeId: 'K2', keys } }, scan);
    const draft = await service.upload(actor.admin, upload(actor.workers[0]!, bytes), `seed-${index}`);
    await service.transition(actor.admin, draft.id, draft.revision, 'publish', `publish-${index}`);
    documents.push({ id: draft.id, expectedHash: hash(bytes) });
  }
  const stored = (await source.owner.query('SELECT DISTINCT key_id FROM worker_documents ORDER BY key_id')).rows;
  assert.deepEqual(stored.map(row => row.key_id), ['K1', 'K2']);
  const originalAuditCount = Number((await source.owner.query('SELECT count(*) AS n FROM audit_events')).rows[0].n);
  const sourceUrl = new URL(database); sourceUrl.pathname = `/${source.databaseName}`;
  const plainDump = join(directory, 'synthetic.dump');
  await run('pg_dump', ['--format=custom', '--file', plainDump], { env: postgresEnv(sourceUrl), timeout: 30_000 });
  const dump = await readFile(plainDump);
  const backupRing = { activeId: 'backup-test', keys: new Map([['backup-test', randomBytes(32)]]) };
  const backupId = randomUUID();
  const encrypted = sealDocument(dump, 'synthetic-backup', backupId, backupRing);
  await writeFile(join(directory, 'backup.encrypted.json'), JSON.stringify({ ...encrypted, ciphertext: encrypted.ciphertext.toString('base64'), nonce: encrypted.nonce.toString('base64'), tag: encrypted.tag.toString('base64') }), { mode: 0o600 });
  await writeFile(join(directory, 'keys.separate.json'), JSON.stringify({
    documents: Object.fromEntries([...keys].map(([id, key]) => [id, key.toString('base64')])),
    backup: Object.fromEntries([...backupRing.keys].map(([id, key]) => [id, key.toString('base64')]))
  }), { mode: 0o600 });
  await rm(plainDump);
  const saved = JSON.parse(await readFile(join(directory, 'backup.encrypted.json'), 'utf8')) as { ciphertext: string; nonce: string; tag: string; keyId: string };
  const savedKeys = JSON.parse(await readFile(join(directory, 'keys.separate.json'), 'utf8')) as { documents: Record<string, string>; backup: Record<string, string> };
  const recoveredBackupRing = { activeId: 'backup-test', keys: new Map(Object.entries(savedKeys.backup).map(([id, value]) => [id, Buffer.from(value, 'base64')])) };
  const restoredDump = openDocument({ ciphertext: Buffer.from(saved.ciphertext, 'base64'), nonce: Buffer.from(saved.nonce, 'base64'), tag: Buffer.from(saved.tag, 'base64'), keyId: saved.keyId }, 'synthetic-backup', backupId, recoveredBackupRing);
  assert.equal(hash(restoredDump), hash(dump));
  await writeFile(plainDump, restoredDump, { mode: 0o600 });
  target = await createPostgresFixture(database, 'mailbox_restore');
  const targetUrl = new URL(database); targetUrl.pathname = `/${target.databaseName}`;
  const started = performance.now();
  await run('pg_restore', ['--exit-on-error', '--single-transaction', '--dbname', target.databaseName, plainDump], { env: postgresEnv(targetUrl), timeout: 30_000 });
  await rm(plainDump);
  const appUrl = new URL(source.appUrl); appUrl.pathname = `/${target.databaseName}`;
  restoredPool = new pg.Pool({ connectionString: appUrl.toString(), connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  const restoredConfig = loadDocumentConfig({ DOCUMENTS_ENABLED: 'true', DOCUMENTS_KEYS_JSON: JSON.stringify(savedKeys.documents), DOCUMENTS_ACTIVE_KEY_ID: 'K2', DOCUMENTS_CLAMD_SOCKET: socket });
  assert.ok(restoredConfig);
  const restored = new PgDocumentService(restoredPool, restoredConfig, scan);
  assert.equal(Number((await target.owner.query('SELECT count(*) AS n FROM audit_events')).rows[0].n), originalAuditCount);
  const rls = (await target.owner.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='worker_documents'")).rows[0];
  assert.equal(rls.relrowsecurity, true); assert.equal(rls.relforcerowsecurity, true);
  for (const document of documents) {
    assert.equal(hash((await restored.download(actor.worker, document.id, 'restored-download')).content), document.expectedHash);
    for (const foreign of [actor.otherWorker, source.other.worker, source.other.admin]) {
      await assert.rejects(restored.download(foreign, document.id, 'restored-foreign'), { code: 'NOT_FOUND' });
    }
    await assert.rejects(restored.download(actor.manager, document.id, 'restored-manager'), { code: 'FORBIDDEN' });
  }
  const lostK1 = new PgDocumentService(restoredPool, { ...restoredConfig, ring: { activeId: 'K2', keys: new Map([['K2', keys.get('K2')!]]) } }, scan);
  await assert.rejects(lostK1.download(actor.worker, documents[0]!.id, 'missing-K1'), { code: 'DOCUMENTS_UNAVAILABLE' });
  assert.equal(hash((await lostK1.download(actor.worker, documents[2]!.id, 'available-K2')).content), documents[2]!.expectedHash);
  const fresh = await restored.upload(actor.admin, upload(actor.workers[0]!, await syntheticPdf('after-restore')), 'restored-upload');
  assert.equal(fresh.state, 'draft');
  t.diagnostic(`Synthetic logical restore and verification: ${Math.round(performance.now() - started)} ms; ${documents.length} document hashes; 2 key generations. This is not deployed-staging RTO/PITR evidence.`);
});
