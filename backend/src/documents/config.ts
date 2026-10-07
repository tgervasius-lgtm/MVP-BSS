import type { DocumentKeys } from "./crypto.js";

export type DocumentConfig = { ring: DocumentKeys; socketPath: string; quotaBytes: number };
export function loadDocumentConfig(env: NodeJS.ProcessEnv): DocumentConfig | null {
  if (env.DOCUMENTS_ENABLED === undefined || env.DOCUMENTS_ENABLED === "false") return null;
  if (env.DOCUMENTS_ENABLED !== "true") throw new Error("DOCUMENTS_ENABLED must be true or false");
  let raw: unknown;
  try { raw = JSON.parse(env.DOCUMENTS_KEYS_JSON ?? ""); } catch { throw new Error("Invalid DOCUMENTS_KEYS_JSON"); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid document keyring");
  const keys = new Map<string, Buffer>();
  for (const [id, value] of Object.entries(raw)) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error("Invalid document keyring entry");
    const key = Buffer.from(value, "base64");
    if (key.length !== 32 || key.toString("base64") !== value) throw new Error("Invalid document key length");
    keys.set(id, key);
  }
  const activeId = env.DOCUMENTS_ACTIVE_KEY_ID ?? "";
  if (!keys.has(activeId)) throw new Error("DOCUMENTS_ACTIVE_KEY_ID is missing from keyring");
  const socketPath = env.DOCUMENTS_CLAMD_SOCKET ?? "";
  // Local Unix socket only: document bytes never go to an arbitrary remote scanner.
  if (!socketPath.startsWith("/") || socketPath.includes("\0")) throw new Error("DOCUMENTS_CLAMD_SOCKET must be an absolute Unix socket path");
  const quotaBytes = Number(env.DOCUMENTS_QUOTA_BYTES ?? 262144000);
  if (!Number.isSafeInteger(quotaBytes) || quotaBytes < 5242880 || quotaBytes > 1073741824) throw new Error("DOCUMENTS_QUOTA_BYTES must be between 5 MiB and 1 GiB");
  return { ring: { activeId, keys }, socketPath, quotaBytes };
}
