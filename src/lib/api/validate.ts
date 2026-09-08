import { z } from "zod";

import { ApiError } from "@/lib/api/response";

/**
 * Input validation at the HTTP edge.
 *
 * The zod schemas themselves live next to the logic they guard — the same
 * `CreateBookingSchema` the booking form parses is the one a `POST` body is
 * parsed with, exported from `@/lib/bookings/core`. That is the point of the
 * core split: one definition of what a valid booking is, two ways in.
 *
 * The difference is only in what a failure looks like. A form action returns the
 * first issue's message as UI copy; an endpoint answers 422 and hands back every
 * issue, because the caller is a program that can fix all of them at once rather
 * than a person reading one line above an input.
 */

/** 422 with the full issue list. `message` is the first issue, for logs and humans. */
function validationError(error: z.ZodError): ApiError {
  return new ApiError(
    422,
    "validation_error",
    error.issues[0]?.message ?? "That request body is not valid.",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    })),
  );
}

/** Parse anything against a schema, or throw a 422. */
export function parseWith<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

/**
 * The request body, validated.
 *
 * An absent or empty body parses as `{}` rather than failing as malformed JSON.
 * That is deliberate: `POST /bookings` with no body is a caller who forgot the
 * fields, and a 422 listing what is missing tells them that, whereas a 400
 * "invalid JSON" sends them looking for a syntax error they did not make. A body
 * that is present but genuinely broken still gets the 400.
 */
export async function readJson<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  const raw = await request.text();

  if (!raw.trim()) return parseWith(schema, {});

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "That request body is not valid JSON.");
  }

  return parseWith(schema, body);
}

/**
 * A positive integer query parameter, clamped rather than rejected.
 *
 * `?limit=0` and `?limit=9999` are both a caller reaching for "as much as
 * possible", not a mistake worth a 422 — and an unbounded limit is a hole in the
 * only ceiling these list endpoints have. Anything unparseable falls back to the
 * default for the same reason.
 */
export function readLimit(
  params: URLSearchParams,
  { fallback, max }: { fallback: number; max: number },
): number {
  const raw = params.get("limit");
  if (raw === null) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;

  return Math.min(Math.floor(value), max);
}
