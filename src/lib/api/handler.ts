import { ApiError, errorResponse, isFrameworkError } from "@/lib/api/response";
import type { CoreFailure, CoreResult } from "@/lib/api/result";

/**
 * The wrapper every handler body runs inside.
 *
 * Takes a thunk rather than wrapping the exported `GET`/`POST` function itself,
 * so the exported symbols keep the exact signature Next generates its route
 * types against — `export async function GET(request, { params })`, the same
 * shape as the existing handlers in `src/app/api` and the booking calendar route.
 * A clever `export const GET = route(fn)` would work until it silently did not,
 * and the failure would land at build time on a type nobody wrote.
 *
 * What it buys: handlers read as a straight line. Guards throw `ApiError` from
 * wherever they are (`requireApiUser()`, `readJson()`, `unwrap()`) and land here
 * as the right status, so there is no nullable-result threading between the top
 * of the handler and the response at the bottom.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    // `redirect()` and `notFound()` signal by throwing. No handler here calls
    // either, but a catch-all that swallowed one would turn it into a 500 for
    // whoever adds the first, so it is let through instead.
    if (isFrameworkError(error)) throw error;
    return errorResponse(error);
  }
}

/** A core's refusal, as something `handle` can catch. */
export function coreError(failure: CoreFailure): ApiError {
  return new ApiError(failure.status, failure.code, failure.message);
}

/**
 * A core's result, or the failure as a thrown `ApiError`.
 *
 * This is the whole bridge between the two callers of a write core: the Server
 * Action maps the same `CoreFailure` onto form state, and an endpoint maps it
 * onto a status. Neither invents its own wording, and neither can forget to
 * check `ok` — `unwrap` returns `T`, not `T | undefined`.
 */
export function unwrap<T>(result: CoreResult<T>): T {
  if (!result.ok) throw coreError(result);
  return result.data;
}

/**
 * A read that resolves to nothing, as a 404.
 *
 * The query functions in `@/lib/dashboard` return null for three different
 * situations — no such row, a row RLS will not show this caller, and the
 * migration not having been run — and the pages 404 on all three. The API does
 * the same, and deliberately does not distinguish them: telling an unauthorised
 * caller that a reference exists but is not theirs turns the endpoint into an
 * enumeration oracle for other people's bookings.
 */
export function found<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new ApiError(404, "not_found", message);
  }
  return value;
}
