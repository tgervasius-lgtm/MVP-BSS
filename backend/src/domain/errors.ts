export type ProblemCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "STALE_REVISION"
  | "RATE_LIMITED"
  | "DOCUMENTS_UNAVAILABLE"
  | "IMPORT_UNAVAILABLE"
  | "IMPORT_DATA_PURGED"
  | "IMPORT_FILE_TOO_LARGE"
  | "IMPORT_FORMAT_UNSUPPORTED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ProblemCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  STALE_REVISION: 409,
  RATE_LIMITED: 429,
  DOCUMENTS_UNAVAILABLE: 503,
  IMPORT_UNAVAILABLE: 503,
  IMPORT_DATA_PURGED: 410,
  IMPORT_FILE_TOO_LARGE: 413,
  IMPORT_FORMAT_UNSUPPORTED: 415,
  INTERNAL_ERROR: 500
};

export class AppError extends Error {
  readonly code: ProblemCode;
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: ProblemCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    if (fieldErrors) this.fieldErrors = fieldErrors;
  }
}

export function requireRevision(value: string | string[] | undefined): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError("VALIDATION_FAILED", "Nedostaje obvezno If-Match zaglavlje.", {
      "If-Match": ["Pošaljite trenutačnu reviziju zapisa."]
    });
  }
  const normalized = value.trim().replace(/^W\//, "").replace(/^"([^"]+)"$/, "$1");
  if (!/^[1-9]\d{0,18}$/.test(normalized) || BigInt(normalized) > 9_223_372_036_854_775_807n) {
    throw new AppError("VALIDATION_FAILED", "If-Match mora sadržavati valjanu pozitivnu reviziju zapisa.", {
      "If-Match": ["Koristite ETag trenutačnog zapisa, primjerice \"3\"."]
    });
  }
  return normalized;
}
