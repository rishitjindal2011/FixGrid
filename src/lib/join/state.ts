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
