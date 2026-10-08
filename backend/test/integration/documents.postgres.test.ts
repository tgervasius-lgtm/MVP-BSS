import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { withTenant } from '../../src/db/tenant.js';
import { AppError } from '../../src/domain/errors.js';
import { PgDocumentService } from '../../src/documents/pg-document-service.js';
import type { DocumentUpload } from '../../src/documents/model.js';
import { syntheticPdf } from '../helpers/pdf-fixture.js';
import { documentFixture } from '../helpers/document-fixture.js';

const url=process.env.BSS_TEST_DATABASE_URL,required=process.env.BSS_REQUIRE_POSTGRES_TESTS==='true';
const options={skip:!url&&!required};
const pdf=await syntheticPdf('Synthetic private fixture');
const upload=(workerId:string):DocumentUpload=>({workerId,uploadId:randomUUID(),title:'Synthetic payslip',category:'payslip',period:'2026-10',contentBase64:pdf.toString('base64')});

test('mailbox PostgreSQL: draft/publication/withdrawal, encrypted bytes, own-worker and cross-tenant RLS, private audit',options,async t=>{
  assert.ok(url,'BSS_TEST_DATABASE_URL required');const f=await documentFixture(url);t.after(f.dispose);
  const {service:s,first:a,other:b}=f;
  const input=upload(a.workers[0]!);const d=await s.upload(a.accountant,input,'upload');
  assert.equal(d.state,'draft');assert.equal((await s.list(a.worker,{limit:25},'list')).items.length,0);
  await assert.rejects(s.download(a.worker,d.id,'early'),{code:'NOT_FOUND'});
  assert.deepEqual((await s.download(a.admin,d.id,'review')).content,pdf);
  const stored=(await f.owner.query('SELECT ciphertext FROM worker_documents WHERE id=$1',[d.id])).rows[0].ciphertext as Buffer;
  assert.ok(!stored.equals(pdf));assert.ok(!stored.includes('Synthetic'));
  await assert.rejects(s.upload(a.manager,input,'manager'),{code:'FORBIDDEN'});
  await assert.rejects(s.upload(a.worker,input,'worker'),{code:'FORBIDDEN'});
  await assert.rejects(s.upload(a.admin,upload(b.workers[0]!),'foreign-recipient'),{code:'NOT_FOUND'});
  await assert.rejects(s.transition(a.admin,d.id,'99','publish','stale'),{code:'STALE_REVISION'});
  const published=await s.transition(a.accountant,d.id,d.revision,'publish','publish');assert.equal(published.state,'published');
  assert.deepEqual((await s.download(a.worker,d.id,'own')).content,pdf);
  assert.equal((await s.list(a.worker,{limit:25},'list')).items[0]?.id,d.id);
  for(const actor of [a.otherWorker,b.worker,b.admin]){
    await assert.rejects(s.download(actor,d.id,'foreign'),{code:'NOT_FOUND'});
    assert.equal((await s.list(actor,{limit:25},'list')).items.length,0);
    assert.equal((await withTenant(f.appPool,actor,'rls',tx=>tx.query('SELECT id FROM worker_documents'))).rowCount,0);
  }
  await assert.rejects(s.download(a.manager,d.id,'manager'),{code:'FORBIDDEN'});
  assert.equal((await withTenant(f.appPool,a.manager,'rls-manager',tx=>tx.query('SELECT id FROM worker_documents'))).rowCount,0);
  assert.equal((await withTenant(f.appPool,a.worker,'rls-worker-write',tx=>tx.query("UPDATE worker_documents SET state='withdrawn',revision=revision+1 RETURNING id"))).rowCount,0);
  await assert.rejects(withTenant(f.appPool,a.admin,'change-recipient',tx=>tx.query('UPDATE worker_documents SET worker_id=$1,revision=revision+1 WHERE id=$2',[a.workers[1],d.id])),/immutable/);
  await f.owner.query("UPDATE users SET status='blocked' WHERE id=$1",[a.worker.userId]);
  await assert.rejects(s.download(a.worker,d.id,'blocked'),{code:'NOT_FOUND'});
  await f.owner.query("UPDATE users SET status='active' WHERE id=$1",[a.worker.userId]);
  await s.transition(a.admin,d.id,published.revision,'withdraw','withdraw');
  for(const actor of [a.worker,a.admin])await assert.rejects(s.download(actor,d.id,'withdrawn'),{code:'NOT_FOUND'});
  const audits=(await f.owner.query("SELECT action,after_json,metadata FROM audit_events WHERE entity_type='worker_document'")).rows;
  assert.ok(audits.some(x=>x.action==='document.download_issued'));assert.ok(audits.some(x=>x.action==='document.withdrawn'));
  assert.ok(!JSON.stringify(audits).includes('Synthetic'));assert.ok(!JSON.stringify(audits).includes(input.contentBase64));
  const down=await readFile(new URL('../../migrations/014_worker_document_mailbox.down.sql',import.meta.url),'utf8');
  await assert.rejects(f.owner.query(down),/contains evidence/);
  assert.equal((await f.owner.query('SELECT count(*)::integer AS n FROM worker_documents')).rows[0].n,1);
});
test('mailbox PostgreSQL: idempotent retries/races, filters/cursors, scanner failures, quota and safe migration reversal',options,async t=>{
  assert.ok(url,'BSS_TEST_DATABASE_URL required');const f=await documentFixture(url);t.after(f.dispose);
  const {service:s,first:a}=f;const input=upload(a.workers[0]!);
  const results=await Promise.all([s.upload(a.admin,input,'one'),s.upload(a.admin,input,'two')]);assert.equal(results[0]!.id,results[1]!.id);
  await assert.rejects(s.upload(a.admin,{...input,title:'Changed'},'replay-change'),{code:'CONFLICT'});
  const unavailable=new PgDocumentService(f.appPool,f.config,async()=>{throw new AppError('DOCUMENTS_UNAVAILABLE','Scanner unavailable');});
  await assert.rejects(unavailable.upload(a.admin,{...input,uploadId:randomUUID()},'scan-fail'),{code:'DOCUMENTS_UNAVAILABLE'});
  assert.equal((await unavailable.upload(a.admin,input,'retry-existing')).id,results[0]!.id);
  const restricted=new PgDocumentService(f.appPool,{...f.config,quotaBytes:pdf.length},async()=>{});
  await assert.rejects(restricted.upload(a.admin,{...input,uploadId:randomUUID()},'quota'),{code:'CONFLICT'});
  await s.upload(a.admin,{...input,uploadId:randomUUID(),category:'contract',period:null},'contract');
  const first=await s.list(a.admin,{limit:1},'first');assert.ok(first.nextCursor);
  const second=await s.list(a.admin,{limit:1,cursor:first.nextCursor},'second');assert.equal(second.items.length,1);assert.notEqual(second.items[0]!.id,first.items[0]!.id);assert.equal(second.nextCursor,null);
  assert.equal((await s.list(a.admin,{limit:25,category:'payslip',period:'2026-10'},'filter')).items.length,1);
  await assert.rejects(s.list(a.admin,{limit:25,cursor:'bad'},'cursor'),{code:'VALIDATION_FAILED'});
  const transitions=await Promise.allSettled([s.transition(a.admin,results[0]!.id,'1','publish','publish-race'),s.transition(a.accountant,results[0]!.id,'1','withdraw','withdraw-race')]);
  assert.equal(transitions.filter(x=>x.status==='fulfilled').length,1);
  const corrupt=new PgDocumentService(f.appPool,{...f.config,ring:{activeId:'missing',keys:new Map()}},async()=>{});
  const contract=(await s.list(a.admin,{category:'contract',limit:25},'contract')).items[0]!;
  await assert.rejects(corrupt.download(a.admin,contract.id,'lost-key'),{code:'DOCUMENTS_UNAVAILABLE'});
  assert.equal((await f.owner.query("SELECT count(*)::integer AS n FROM audit_events WHERE action='document.uploaded'")).rows[0].n,2);
});
test('mailbox migration down works only for an empty table and migration up can be reapplied',options,async t=>{
  assert.ok(url,'BSS_TEST_DATABASE_URL required');const f=await documentFixture(url);t.after(f.dispose);
  const down=await readFile(new URL('../../migrations/014_worker_document_mailbox.down.sql',import.meta.url),'utf8');
  const up=await readFile(new URL('../../migrations/014_worker_document_mailbox.up.sql',import.meta.url),'utf8');
  await f.owner.query(down);await f.owner.query(up);
  const r=await f.owner.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='worker_documents'");assert.equal(r.rows[0].relrowsecurity,true);assert.equal(r.rows[0].relforcerowsecurity,true);
});

test('mailbox migration down refuses hidden tenant data for a NOSUPERUSER/NOBYPASSRLS table owner',options,async t=>{
  assert.ok(url,'BSS_TEST_DATABASE_URL required');const f=await documentFixture(url);t.after(f.dispose);
  const d=await f.service.upload(f.first.admin,upload(f.first.workers[0]!),'preserved');
  const down=await readFile(new URL('../../migrations/014_worker_document_mailbox.down.sql',import.meta.url),'utf8');
  await f.owner.query(`GRANT CREATE ON SCHEMA public TO ${f.role}`);
  await f.owner.query(`ALTER TABLE worker_documents OWNER TO ${f.role}`);
  await f.owner.query('BEGIN');await f.owner.query(`SET LOCAL ROLE ${f.role}`);
  assert.equal((await f.owner.query('SELECT 1 FROM worker_documents')).rowCount,0);
  await assert.rejects(f.owner.query(down),/contains evidence/);
  await f.owner.query('ROLLBACK');
  assert.equal((await f.owner.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='worker_documents'")).rows[0].relforcerowsecurity,true);
  assert.deepEqual((await f.service.download(f.first.admin,d.id,'preserved')).content,pdf);
});
