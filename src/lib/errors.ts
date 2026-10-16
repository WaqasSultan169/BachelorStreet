import type { ZodError } from "zod";

/** Error codes exposed through the API envelope. Stable strings, not HTTP-only. */
export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL: "INTERNAL_SERVER_ERROR",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorDetail = { field?: string; message: string };

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];
  readonly cause?: unknown;

  constructor(opts: {
    code: ErrorCode;
    status: number;
    message: string;
    details?: ErrorDetail[];
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = "AppError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.cause = opts.cause;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super({ code: ERROR_CODES.BAD_REQUEST, status: 400, message });
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[], message = "Validation failed") {
    super({ code: ERROR_CODES.VALIDATION_ERROR, status: 400, message, details });
  }

  static fromZod(error: ZodError): ValidationError {
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return new ValidationError(details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to continue") {
    super({ code: ERROR_CODES.UNAUTHORIZED, status: 401, message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super({ code: ERROR_CODES.FORBIDDEN, status: 403, message });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found") {
    super({ code: ERROR_CODES.NOT_FOUND, status: 404, message });
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state") {
    super({ code: ERROR_CODES.CONFLICT, status: 409, message });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please slow down") {
    super({ code: ERROR_CODES.RATE_LIMITED, status: 429, message });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "This service is not available right now") {
    super({ code: ERROR_CODES.SERVICE_UNAVAILABLE, status: 503, message });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}