export const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

export const uuidSchema = Object.freeze({
  type: "string",
  pattern: UUID_PATTERN
} as const);

export const paginationSchema = Object.freeze({
  cursor: { type: "string", minLength: 1, maxLength: 512 },
  limit: { type: "integer", minimum: 1, maximum: 200, default: 50 }
} as const);

export const revisionHeaderSchema = Object.freeze({
  type: "object",
  required: ["if-match"],
  properties: {
    "if-match": {
      type: "string",
      minLength: 1,
      maxLength: 23,
      pattern: "^(?:W/)?(?:\"[1-9][0-9]{0,18}\"|[1-9][0-9]{0,18})$"
    }
  }
} as const);
