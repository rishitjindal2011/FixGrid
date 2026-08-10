/**
 * Form state shared between the auth actions and the forms that call them.
 *
 * This lives outside `actions.ts` because a `"use server"` module may only
 * export async functions — every other export is treated as an attempted
 * server action and throws at module evaluation, taking down any route that
 * imports it. Types alone would be erased, but the initial-state constants are
 * real values, so the whole shape moves here.
 */

export interface AuthState {
  /** Shown in an alert. Deliberately vague for anything credential-related. */
  error: string | null;
  /** Shown as confirmation — "check your email", and similar. */
  notice: string | null;
}

export const AUTH_INITIAL_STATE: AuthState = { error: null, notice: null };
