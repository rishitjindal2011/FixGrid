import { NextResponse } from "next/server";

/**
 * The one envelope every endpoint under `/api/v1` speaks.
 *
 * Success is `{ "data": … }` and failure is `{ "error": { code, message } }` —
 * never both, never a bare array, never a 200 carrying an error inside it. A
 * client can therefore branch on the HTTP status alone and only then look at the
 * body, which is the property that makes the surface machine-usable at all.
 *
 * Two deliberate choices:
 *
 *   • **`data` is a wrapper, even for lists.** Returning a top-level JSON array
 *     paints you into a corner the first time a list needs a cursor or a total,
 *     because adding it is a breaking change. A wrapper leaves room to grow
 *     without a `/v2`.
 *
 *   • **`code` is for programs, `message` is for people.** The code is a stable
 *     snake_case slug that may be switched on; the message is a sentence that
 *     may be reworded at any time and must never be parsed. Every message here
 *     is one the existing dashboards already show, so the API and the UI refuse
 *     things in the same words.
 */

/** The body of a failure response. `details` carries zod issues, when there are any. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * A failure a handler can throw from anywhere in its call stack.
 *
 * Throwing rather than returning is the opposite of the convention in
 * `@/lib/bookings/actions`, and for a reason: a Server Action's return value IS
 * the UI state, so throwing loses it, whereas an HTTP handler has a wrapper
 * (`route()`) that can turn a throw into a correct status. That lets guards like
 * `requireApiUser()` be one-liners at the top of a handler instead of a nullable
 * result every caller has to thread onwards.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 200 with a body. `init` is for the rare handler that adds a header. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

/**
 * 201 for a resource that now exists.
 *
 * No `Location` header: the identifiers this API creates are not all addressable
 * on their own (a booking is, a ledger entry is not), and a header that is
 * present on some creates and absent on others is worse than one that is never
 * there. The body carries the id and the reference.
 */
export function created<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 201, ...init });
}

/** 204 for a write with nothing to say. Must not carry a body. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Anything thrown inside a handler, as an HTTP response.
 *
 * An unrecognised throw is a bug, so it is logged in full and answered with a
 * flat 500 — the caller gets no stack, no Postgres hint, and no table name.
 * Leaking those from a public endpoint is how a schema gets mapped from the
 * outside.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const payload: ApiErrorPayload = { code: error.code, message: error.message };
    if (error.details !== undefined) payload.details = error.details;
    return NextResponse.json({ error: payload }, { status: error.status });
  }

  console.error("[api] unhandled error", error);

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "Something went wrong on our side. Try again shortly.",
      } satisfies ApiErrorPayload,
    },
    { status: 500 },
  );
}

/**
 * True for the control-flow errors Next throws through userland — `redirect()`
 * and `notFound()` signal themselves by throwing an object carrying a `digest`.
 *
 * Handlers here do not call either, but `route()` wraps everything in a
 * `try`/`catch`, and a catch-all that swallowed one of these would turn a
 * redirect into a 500 for whoever adds the first one. Cheaper to let them pass
 * than to debug later.
 */
export function isFrameworkError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}
