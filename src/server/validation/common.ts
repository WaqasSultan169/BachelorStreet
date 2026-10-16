import { z } from "zod";
import type { ZodType } from "zod";
import { ValidationError } from "@/lib/errors";
import { PAGINATION } from "@/lib/constants";

/** Mongo ObjectId string. */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Invalid identifier format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxPageSize)
    .default(PAGINATION.defaultPageSize),
});

export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
} {
  return validate(
    paginationSchema,
    {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    },
    "pagination",
  );
}

/**
 * Parse an unknown payload against a Zod schema and throw our typed
 * ValidationError (→ 400 VALIDATION_ERROR) on failure.
 */
export function validate<T>(
  schema: ZodType<T>,
  data: unknown,
  label = "payload",
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      [
        {
          field: label,
          message: result.error.issues
            .map((issue) => `${issue.path.join(".") ?? label}: ${issue.message}`)
            .join("; "),
        },
      ],
      "Validation failed",
    );
  }
  return result.data;
}