import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ERROR_CODES, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ApiMeta = {
  page?: number;
  pageSize?: number;
  total?: number;
  [key: string]: string | number | boolean | null | undefined;
};

/**
 * Consistent envelope for every API response.
 * Success:  { success, data, meta?, message? }
 * Failure:  { success, error: { code, message, details? } }
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
};

export function ok<T>(
  data: T,
  init?: { meta?: ApiMeta; message?: string; status?: number },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(init?.meta ? { meta: init.meta } : {}),
      ...(init?.message ? { message: init.message } : {}),
    } satisfies ApiSuccess<T>,
    { status: init?.status ?? 200 },
  );
}

export function created<T>(
  data: T,
  init?: { meta?: ApiMeta; message?: string },
): NextResponse<ApiSuccess<T>> {
  return ok(data, { ...init, status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Map any thrown value to the standard failure envelope. */
export function toApiFailure(error: unknown): ApiFailure {
  if (isAppError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }
  return {
    success: false,
    error: { code: ERROR_CODES.INTERNAL, message: "Something went wrong" },
  };
}

/** Centralized error → Response mapper. Logs unexpected errors server-side. */
export function toErrorResponse(
  error: unknown,
  fallbackStatus = 500,
): NextResponse<ApiFailure> {
  if (isAppError(error)) {
    logger.warn(`API ${error.code} (${error.status}): ${error.message}`);
    return NextResponse.json(toApiFailure(error), { status: error.status });
  }
  logger.error("Unexpected API error", error);
  return NextResponse.json(toApiFailure(error), { status: fallbackStatus });
}

export type ApiContext = { params: Promise<Record<string, string>> };
type ApiHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

/**
 * Wrap a route handler so every thrown error is normalized through
 * toErrorResponse. Handlers stay declarative:
 *
 *   export const GET = withApiHandler(async (req) => ok(data))
 */
export function withApiHandler(handler: ApiHandler) {
  return async (req: NextRequest, ctx: unknown): Promise<Response> => {
    try {
      return await handler(req, ctx as ApiContext);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}