export type ErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "revoked_api_key"
  | "not_project_member"
  | "not_space_member"
  | "insufficient_role"
  | "not_found"
  | "validation"
  | "internal";

export class KontexError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = errorStatus(code);
    this.name = "KontexError";
  }
}

function errorStatus(code: ErrorCode): number {
  switch (code) {
    case "missing_api_key":
    case "invalid_api_key":
    case "revoked_api_key":
      return 401;
    case "not_project_member":
    case "not_space_member":
    case "insufficient_role":
      return 403;
    case "not_found":
      return 404;
    case "validation":
      return 400;
    default:
      return 500;
  }
}
