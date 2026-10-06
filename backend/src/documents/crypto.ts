import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type DocumentKeys = { activeId: string; keys: ReadonlyMap<string, Buffer> };
export type SealedDocument = { ciphertext: Buffer; nonce: Buffer; tag: Buffer; keyId: string };
export function sealDocument(bytes: Buffer, organizationId: string, id: string, ring: DocumentKeys): SealedDocument {
  const key = ring.keys.get(ring.activeId);
  if (!key || key.length !== 32) throw new Error("Document encryption key unavailable");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`bss-document-v1:${organizationId}:${id}`));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag(), keyId: ring.activeId };
}
export function openDocument(value: SealedDocument, organizationId: string, id: string, ring: DocumentKeys): Buffer {
  const key = ring.keys.get(value.keyId);
  if (!key || key.length !== 32) throw new Error("Document decryption key unavailable");
  const cipher = createDecipheriv("aes-256-gcm", key, value.nonce);
  cipher.setAAD(Buffer.from(`bss-document-v1:${organizationId}:${id}`));
  cipher.setAuthTag(value.tag);
  return Buffer.concat([cipher.update(value.ciphertext), cipher.final()]);
}
