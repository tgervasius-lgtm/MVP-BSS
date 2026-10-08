import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPdfStructure, inspectPdf } from '../../src/documents/pdf-policy.js';

const document = (value: unknown, encrypted = false) => ({ version: 2, encrypt: { encrypted }, qpdf: [
  { jsonversion: 2 }, { trailer: { value: { '/Root': '1 0 R' } }, 'obj:1 0 R': { value } },
] });

test('PDF policy inspects all semantic names, not text content or ordinary image/font streams', () => {
  assertPdfStructure(document({ '/Type': '/Catalog', '/Note': 'u:/EmbeddedFile /EF /Encrypt', '/Image': { '/Subtype': '/Image' }, '/Font': { '/FontFile2': '9 0 R' } }));
  for (const value of [{ '/Names': { '/EmbeddedFiles': '9 0 R' } }, { '/EF': {} }, { '/Type': '/EmbeddedFile' },
    { '/AF': ['8 0 R'] }, { '/Subtype': '/FileAttachment' }, { '/Collection': {} },
    { 'n:/#45F': {} }, { '/Type': 'n:/#45mbeddedFile' }, { '/RF': {} }]) {
    assert.throws(() => assertPdfStructure(document(value)), { code: 'VALIDATION_FAILED' });
  }
  const indirect = document({ '/Type': '2 0 R' });
  Object.assign(indirect.qpdf[1]!, { 'obj:2 0 R': { value: '/EmbeddedFile' } });
  assert.throws(() => assertPdfStructure(indirect), { code: 'VALIDATION_FAILED' });
  const unreferenced = document({ '/Type': '/Catalog' });
  Object.assign(unreferenced.qpdf[1]!, { 'obj:9 0 R': { stream: { dict: { '/Type': '/EmbeddedFile' } } } });
  assert.throws(() => assertPdfStructure(unreferenced), { code: 'VALIDATION_FAILED' });
});

test('PDF policy fails closed for encryption, external streams, missing proof and excessive structure', async () => {
  for (const value of [null, {}, { version: 1 }, { qpdf: [] }]) assert.throws(() => assertPdfStructure(value), { code: 'DOCUMENTS_UNAVAILABLE' });
  assert.throws(() => assertPdfStructure(document({}, true)), { code: 'VALIDATION_FAILED' });
  assert.throws(() => assertPdfStructure(document({ '/Encrypt': '5 0 R' })), { code: 'VALIDATION_FAILED' });
  assert.throws(() => assertPdfStructure(document({ stream: { dict: { '/F': 'u:external-file' } } })), { code: 'VALIDATION_FAILED' });
  let nested: unknown = null;
  for (let i = 0; i < 70; i++) nested = [nested];
  assert.throws(() => assertPdfStructure(document(nested)), { code: 'VALIDATION_FAILED' });
  await assert.rejects(inspectPdf(Buffer.alloc(5 * 1024 * 1024 + 1)), { code: 'VALIDATION_FAILED' });
});
