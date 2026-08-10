import "server-only";

/**
 * Read-failure logging for the dashboard data layer.
 *
 * Every read in `src/lib/dashboard/*` degrades to `[]`/`null` rather than
 * throwing, because before the marketplace migration is applied none of its
 * tables exist and a dashboard that 500s on a missing table is much harder to
 * diagnose than one that renders its empty states.
 *
 * That was right, but the logging around it was not. Each degraded read called
 * `console.error` directly, so one page load with the migration outstanding
 * produced a dozen red errors describing a *deployment state*, not a fault.
 * The cost is not noise for its own sake: when every read shouts on every
 * request, a genuine failure — a broken policy, a renamed column, a timeout —
 * is indistinguishable from the background.
 *
 * So failures are split in two:
 *
 *   • **The migration has not been run.** Expected, recoverable, and identical
 *     across every table. Reported once per process as a single warning naming
 *     the fix, then suppressed.
 *   • **Everything else.** A real error, logged in full, every time.
 */

/**
 * Postgres and PostgREST each have their own way of saying "no such table".
 *
 * `42P01` is Postgres's own undefined_table. `PGRST205` is PostgREST failing to
 * resolve the relation against its schema cache, which is what actually comes
 * back through supabase-js — the message reads "Could not find the table
 * 'public.messages' in the schema cache". The string check is a backstop for
 * client versions that surface the message without the code.
 */
export function isMissingRelation(error: {
  code?: string | null;
  message?: string | null;
} | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;

  const message = error.message ?? "";
  return (
    message.includes("schema cache") ||
    /relation .* does not exist/i.test(message)
  );
}

/**
 * `42703` — the table exists but a column this app selects does not. Almost
 * always a partially-applied migration, which is worth distinguishing from a
 * wholly absent one because the fix is different: re-run, do not assume fresh.
 */
export function isMissingColumn(error: {
  code?: string | null;
  message?: string | null;
} | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /column .* does not exist/i.test(error.message ?? "");
}

/**
 * Module-scoped, so the warning appears once per server process rather than
 * once per read. Not exported: nothing should be able to reset it and get the
 * spam back.
 */
let warnedMissingSchema = false;

/**
 * Report a degraded read.
 *
 * `scope` identifies the caller for a real error — "messages.transcript",
 * "expert.stats". It is deliberately unused in the missing-schema branch: which
 * particular read noticed the tables are absent tells nobody anything useful,
 * and naming it invites the reader to go looking at a file that is working
 * correctly.
 */
export function logReadFailure(
  scope: string,
  error: { code?: string | null; message?: string | null } | null | undefined,
): void {
  if (!error) return;

  if (isMissingRelation(error)) {
    if (!warnedMissingSchema) {
      warnedMissingSchema = true;
      console.warn(
        "[dashboard] The marketplace tables are not present in this database, " +
          "so booking, messaging and payment panels will render empty. " +
          "Apply supabase/migrations/001_marketplace.sql to populate them. " +
          "(Further missing-table notices are suppressed for this process.)",
      );
    }
    return;
  }

  if (isMissingColumn(error)) {
    if (!warnedMissingSchema) {
      warnedMissingSchema = true;
      console.warn(
        `[dashboard] A marketplace table is missing a column this app reads (${error.message}). ` +
          "The migration looks partially applied — re-run " +
          "supabase/migrations/001_marketplace.sql, which is safe to run again.",
      );
    }
    return;
  }

  console.error(`[dashboard] ${scope} failed`, error.message ?? error);
}
