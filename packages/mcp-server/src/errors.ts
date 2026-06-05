export type ErrorCode =
  | "missing_auth"
  | "invalid_token"
  | "user_not_found"
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
    case "missing_auth":
    case "invalid_token":
      return 401;
    case "user_not_found":
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
