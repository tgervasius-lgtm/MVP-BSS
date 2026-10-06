import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadDocumentConfig } from "../../src/documents/config.js";
import { openDocument, sealDocument } from "../../src/documents/crypto.js";
import { MAX_DOCUMENT_BYTES, validateUpload } from "../../src/documents/model.js";
import { clamScanner } from "../../src/documents/scanner.js";

test("documents validate bounded PDF data, category and payslip month", () => {
  const input = { workerId:randomUUID(),uploadId:randomUUID(),title:"Listopad",category:"payslip" as const,period:"2026-10",contentBase64:Buffer.from('%PDF-1.4\nfixture\n%%EOF\n').toString('base64') };
  assert.ok(validateUpload(input).length);
  for (const change of [{period:null},{period:'2026-13'},{title:'x\nunsafe'},{contentBase64:'%%%'}]) assert.throws(() => validateUpload({...input,...change}), {code:'VALIDATION_FAILED'});
  for (const bytes of [Buffer.from('<html>not PDF</html>'),Buffer.from('%PDF-1.4\n/Encrypt 1 0 R\n%%EOF'),Buffer.alloc(MAX_DOCUMENT_BYTES+1)]) {
    assert.throws(() => validateUpload({...input,contentBase64:bytes.toString('base64')}), {code:'VALIDATION_FAILED'});
  }
});
test("document encryption binds ciphertext to tenant/id, authenticates tampering and keeps old key support", () => {
  const first=randomBytes(32),second=randomBytes(32),bytes=Buffer.from('private fixture');
  const ring={activeId:'v1',keys:new Map([['v1',first],['v2',second]])};
  const value=sealDocument(bytes,'tenant','id',ring);
  assert.ok(!value.ciphertext.equals(bytes));
  assert.deepEqual(openDocument(value,'tenant','id',{...ring,activeId:'v2'}),bytes);
  assert.throws(()=>openDocument(value,'other','id',ring));
  assert.throws(()=>openDocument(value,'tenant','other',ring));
  assert.throws(()=>openDocument({...value,tag:Buffer.alloc(16)},'tenant','id',ring));
  assert.throws(()=>openDocument(value,'tenant','id',{activeId:'v2',keys:new Map([['v2',second]])}));
  assert.notDeepEqual(sealDocument(bytes,'tenant','id',ring).nonce,value.nonce);
});
test("mailbox configuration is off by default and fails closed without explicit independent keys/scanner", () => {
  assert.equal(loadDocumentConfig({}),null);
  const env={DOCUMENTS_ENABLED:'true',DOCUMENTS_KEYS_JSON:JSON.stringify({v1:randomBytes(32).toString('base64')}),DOCUMENTS_ACTIVE_KEY_ID:'v1',DOCUMENTS_CLAMD_SOCKET:'/run/clamav/clamd.ctl'};
  assert.equal(loadDocumentConfig(env)?.quotaBytes,262144000);
  for (const patch of [{DOCUMENTS_KEYS_JSON:'secret bad json'},{DOCUMENTS_ACTIVE_KEY_ID:'missing'},{DOCUMENTS_CLAMD_SOCKET:'https://external.test'},{DOCUMENTS_QUOTA_BYTES:'Infinity'},{DOCUMENTS_ENABLED:'yes'}]) assert.throws(()=>loadDocumentConfig({...env,...patch}));
});
test("ClamAV stream adapter requires exact clean response, handles split replies, errors, timeout and malware", async t => {
  const folder=await mkdtemp(join(tmpdir(),'bss-scan-'));t.after(()=>rm(folder,{recursive:true,force:true}));
  const bytes=Buffer.from('synthetic scan bytes');let seq=0;
  for (const answer of ['stream: OK\0','stream: Eicar-Test-Signature FOUND\0','stream: limit exceeded ERROR\0','stream: OK\0extra','',null]) {
    const path=process.platform==='win32'?`\\\\.\\pipe\\bss-scan-${randomUUID()}`:join(folder,`s${seq++}`);
    const server=createServer(socket=>{
      let input=Buffer.alloc(0);
      socket.on('data',chunk=>{
        input=Buffer.concat([input,chunk]);
        if(input.length<10+4+bytes.length+4)return;
        assert.equal(input.subarray(0,10).toString(),'zINSTREAM\0');assert.equal(input.readUInt32BE(10),bytes.length);
        assert.deepEqual(input.subarray(14,14+bytes.length),bytes);
        if(answer===null)return;
        socket.write(answer.slice(0,4));socket.end(answer.slice(4));
      });
    });
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(path,resolve);});
    try {
      const result=clamScanner(path,100)(bytes);
      if(answer==='stream: OK\0')await result;
      else await assert.rejects(result,{code:answer?.includes('FOUND')?'VALIDATION_FAILED':'DOCUMENTS_UNAVAILABLE'});
    } finally { await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }
  }
  await assert.rejects(clamScanner(join(folder,'absent'),100)(bytes),{code:'DOCUMENTS_UNAVAILABLE'});
});
