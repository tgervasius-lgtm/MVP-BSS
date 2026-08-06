import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedDeviceCredential = Readonly<{
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
}>;

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptDeviceCredential(secret: string, credential: string): EncryptedDeviceCredential {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(credential, "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: 1 };
}

export function decryptDeviceCredential(
  secret: string,
  encrypted: Pick<EncryptedDeviceCredential, "ciphertext" | "iv" | "authTag">
): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), encrypted.iv);
  decipher.setAuthTag(encrypted.authTag);
  return Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]).toString("utf8");
}
