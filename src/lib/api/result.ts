/**
 * What a write's "core" returns, and how a Postgres error becomes a status.
 *
 * The cores in `@/lib/bookings/core` (and every write extracted after them) are
 * called from two places that need opposite things from a failure:
 *
 *   • a Server Action, which needs a sentence to render in a form; and
 *   • a route handler, which needs an HTTP status and a machine-readable code.
 *
 * So a core returns all three and lets each caller take what it needs. Neither
 * caller re-derives the others' half, which is the whole point: one refusal,
 * worded once, classified once.
 *
 * Deliberately NOT `throw`. A core is called from a form action too, where a
 * throw surfaces as an unhandled rejection and loses the message the person
 * needed to read — the convention `@/lib/bookings/actions` documents. `ApiError`
 * is throwable because only HTTP handlers throw it.
 */

/** A refusal, carrying the same fact in the three shapes its callers need. */
export interface CoreFailure {
  ok: false;
  /** HTTP status the route handler answers with. */
  status: number;
  /** Stable slug a client may switch on. Never reworded. */
  code: string;
  /** A sentence for a person. May be reworded freely; never parse it. */
  message: string;
}

export type CoreResult<T> = { ok: true; data: T } | CoreFailure;

export function coreOk<T>(data: T): CoreResult<T> {
  return { ok: true, data };
}

export function coreFail(status: number, code: string, message: string): CoreFailure {
  return { ok: false, status, code, message };
}

/**
 * Postgres error codes into HTTP statuses.
 *
 * The mapping matters most for `23P01`, the exclusion constraint on `bookings`:
 * two people raced for one slot and this caller lost. That is a 409 — the
 * request was well-formed and the caller may usefully retry with a different
 * time — and answering it with a 400 or a 500 would tell a client to fix its
 * payload or give up, when neither is true.
 *
 * `42501` is an RLS refusal, which is a 403 rather than a 404 only because the
 * caller has already been established as the owner of the surrounding resource;
 * reads that must not confirm existence return 404 before reaching here.
 *
 * `42P01` (undefined table) means the migration has not been run. That is our
 * fault, not the caller's, so it is a 500 even though the message says something
 * more useful than "internal error".
 */
export function pgStatus(code: string | undefined): number {
  switch (code) {
    case "23P01": // exclusion violation — slot already taken
    case "23505": // unique violation — already recorded
    case "23503": // foreign key violation — referenced row is gone
      return 409;
    case "42501": // insufficient privilege — an RLS policy said no
      return 403;
    case "42P01": // undefined table — the migration has not been run
      return 500;
    default:
      return 400;
  }
}

/** The same codes as slugs, so a client can branch without string-matching prose. */
export function pgErrorCode(code: string | undefined): string {
  switch (code) {
    case "23P01":
      return "slot_taken";
    case "23505":
      return "already_exists";
    case "23503":
      return "missing_reference";
    case "42501":
      return "forbidden";
    case "42P01":
      return "not_provisioned";
    default:
      return "database_error";
  }
}
