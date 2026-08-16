/**
 * Form state for the shop-submission flow.
 *
 * Separate from `actions.ts` because a `"use server"` module may export nothing
 * but async functions — Next turns every export into a callable endpoint, so a
 * plain constant alongside them fails at module evaluation with
 * `A "use server" file can only export async functions, found object`.
 *
 * Same split as `@/lib/bookings/state` and `@/lib/reviews/state`.
 */

export interface JoinState {
  error: string | null;
  /** Which input to mark, so the error lands next to the field that caused it. */
  field?: "shopName" | "address" | "contactPhone" | "evidence" | null;
}

export const JOIN_INITIAL_STATE: JoinState = { error: null, field: null };

/**
 * What it costs to list a shop, in paise.
 *
 * Flat rather than per-category: the categories differ in what a *repair* is
 * worth, not in what a listing is worth. Charged on submission, not on approval —
 * a fee taken only from the shops we accept would deter nobody from submitting —
 * and returned in full if the listing is rejected.
 *
 * Lives here rather than in `actions.ts` because that module is `"use server"`,
 * and such a module may only export async functions; a plain `export const` there
 * is a build error. Same reason `src/lib/auth/state.ts` exists. Note that `tsc`
 * does not catch it — only the bundler does — so it surfaces as a build failure
 * rather than a type error.
 */
export const ENROLLMENT_FEE_MINOR = 50000;
