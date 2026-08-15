/**
 * Form state shared between the booking actions and the forms that drive them.
 *
 * Separate from `actions.ts` for the same reason as `@/lib/reviews/state` and
 * `@/lib/auth/state`: a `"use server"` module may only export async functions,
 * so a plain constant exported from there throws when the module is evaluated.
 */

export interface BookingActionState {
  error: string | null;
  success: boolean;
  /** Confirmation copy on success — "Quote sent", "Saved". */
  message?: string;
  bookingId?: string;
  reference?: string;
}

export const BOOKING_INITIAL_STATE: BookingActionState = {
  error: null,
  success: false,
};

/**
 * The saved-expert toggle carries the resulting state rather than a flag, so the
 * button can render the truth after the write instead of guessing from what it
 * submitted. Mirrors the shape `SaveExpertButton` already expects.
 */
export interface SavedExpertState {
  saved: boolean;
  error: string | null;
}
