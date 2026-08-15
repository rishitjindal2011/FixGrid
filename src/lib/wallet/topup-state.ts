/**
 * State for the top-up portal.
 *
 * In its own module because `topup.ts` is `"use server"`, and such a module may
 * only export async functions — a plain `export const` there throws at module
 * evaluation. Same reason `src/lib/auth/state.ts` exists.
 */

export type TopUpMethod = "card" | "upi" | "netbanking";

export interface TopUpIntent {
  reference: string;
  amountMinor: number;
  method: TopUpMethod;
}

export interface TopUpOutcome {
  ok: boolean;
  reference: string;
  amountMinor: number;
  message: string;
}

export interface TopUpState {
  error: string | null;
  /**
   * Set once an intent exists. The form uses this to switch from "how much" to
   * the gateway step, so the step is server-driven rather than a client flag that
   * could disagree with what actually got created.
   */
  intent: TopUpIntent | null;
  /** Set once an attempt has finished, successfully or not. */
  outcome: TopUpOutcome | null;
}

export const TOPUP_INITIAL_STATE: TopUpState = {
  error: null,
  intent: null,
  outcome: null,
};

/** Bounds, mirrored by a check constraint on `wallet_topups.amount_minor`. */
export const TOPUP_MIN_MINOR = 5000;
export const TOPUP_MAX_MINOR = 1000000;

/** Preset amounts, in paise. Covers a few bookings' worth of fees. */
export const TOPUP_PRESETS: readonly number[] = [10000, 25000, 50000, 100000];
