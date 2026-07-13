export type ProblemCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "STALE_REVISION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ProblemCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  STALE_REVISION: 409,
  RATE_LIMITED: 429,
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
  return value.replace(/^W\//, "").replace(/^"|"$/g, "");
}
