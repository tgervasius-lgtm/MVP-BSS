import { createHash } from "node:crypto";
import { AppError } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { requireRole } from "../security/rbac.js";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const CATEGORIES = ["payslip", "contract", "other"] as const;
export type DocumentCategory = typeof CATEGORIES[number];
export type DocumentState = "draft" | "published" | "withdrawn";
export type DocumentUpload = { workerId: string; title: string; category: DocumentCategory; period: string | null; contentBase64: string; uploadId: string };
export type DocumentView = { id: string; workerId: string; workerName: string; workerCode: string; title: string; category: DocumentCategory;
  period: string | null; state: DocumentState; bytes: number; revision: string; createdAt: string; publishedAt: string | null };
export type DocumentFilters = { category?: DocumentCategory; period?: string; cursor?: string; limit: number };
export type DocumentPage = { items: DocumentView[]; nextCursor: string | null };
export interface DocumentService {
  recipients(actor: ActorContext, search: string, requestId: string): Promise<Array<{ id: string; name: string; code: string }>>;
  list(actor: ActorContext, filters: DocumentFilters, requestId: string): Promise<DocumentPage>;
  upload(actor: ActorContext, input: DocumentUpload, requestId: string): Promise<DocumentView>;
  transition(actor: ActorContext, id: string, revision: string, action: "publish" | "withdraw", requestId: string): Promise<DocumentView>;
  download(actor: ActorContext, id: string, requestId: string): Promise<{ content: Buffer; fileName: string }>;
}
export function documentReader(actor: ActorContext): void {
  requireRole(actor, ["admin", "accountant", "worker"]);
  if (actor.role === "worker" && !actor.selfWorkerId) throw new AppError("FORBIDDEN", "Korisnik nije povezan s radnikom.");
}
export function documentWriter(actor: ActorContext): void { requireRole(actor, ["admin", "accountant"]); }
export function validateUpload(input: DocumentUpload): Buffer {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.workerId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.uploadId)
    || !CATEGORIES.includes(input.category) || input.title.trim().length < 2 || input.title.length > 120
    || /[\x00-\x1f\x7f]/.test(input.title)
    || (input.period !== null && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.period))
    || (input.category === "payslip" && input.period === null)) {
    throw new AppError("VALIDATION_FAILED", "Provjerite primatelja, naziv, vrstu i mjesec dokumenta.");
  }
  if (input.contentBase64.length > Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4 || /[^A-Za-z0-9+/=]/.test(input.contentBase64)) {
    throw new AppError("VALIDATION_FAILED", "Dokument mora biti PDF do 5 MiB.");
  }
  const bytes = Buffer.from(input.contentBase64, "base64");
  if (bytes.toString("base64") !== input.contentBase64 || !bytes.length || bytes.length > MAX_DOCUMENT_BYTES || !/^%PDF-(1\.[0-7]|2\.0)[\r\n]/.test(bytes.subarray(0, 12).toString("latin1"))
    || !/%%EOF\s*$/.test(bytes.subarray(-1024).toString("latin1"))) {
    throw new AppError("VALIDATION_FAILED", "Dokument mora biti PDF do 5 MiB.");
  }
  // A conservative early rejection, not a PDF parser or substitute for the mandatory scanner.
  if (/\/Encrypt\b/.test(bytes.toString("latin1"))) throw new AppError("VALIDATION_FAILED", "Učitajte PDF bez lozinke; pristup štiti BSS prijava.");
  return bytes;
}
export function fingerprint(input: DocumentUpload, bytes: Buffer): string {
  return createHash("sha256").update(JSON.stringify([input.workerId, input.title.trim(), input.category, input.period])).update(bytes).digest("hex");
}
