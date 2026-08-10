/**
 * Form state shared between the review action and the review form.
 *
 * Separate from `actions.ts` for the same reason as `@/lib/auth/state`: a
 * `"use server"` module may only export async functions, so a plain constant
 * exported from there throws when the module is evaluated.
 */

export interface ReviewState {
  error: string | null;
  success: boolean;
}

export const REVIEW_INITIAL_STATE: ReviewState = { error: null, success: false };
