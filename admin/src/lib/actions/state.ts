/**
 * Form state shared by every admin action and the forms that drive them.
 *
 * Separate from `admin.ts` because a `"use server"` module may only export
 * async functions — a plain constant exported from there throws when the module
 * is evaluated. Same split as the consumer app's `bookings/state.ts`.
 */

export interface AdminActionState {
  error: string | null;
  success: boolean;
  /** Confirmation text on success, e.g. "Claim approved." */
  message?: string;
}

export const ADMIN_INITIAL_STATE: AdminActionState = { error: null, success: false };
