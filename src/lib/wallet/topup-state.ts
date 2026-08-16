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
  /**
   * The scannable QR as an inline SVG, and the URL it encodes. Only present for
   * UPI — a card has nothing to scan.
   *
   * The SVG travels rather than the token: the token is a bearer credential and
   * has no business in a client component beyond the QR that has to carry it.
   */
  qrSvg?: string | null;
  /** Shown under the QR so a phone that will not scan can be typed into. */
  payUrl?: string | null;
  /** True when payUrl points at loopback, which a phone cannot reach. */
  payUrlUnreachable?: boolean;
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

/**
 * Ceiling on what one account can add in a day, in paise.
 *
 * The per-attempt cap alone bounds nothing that matters: a loop of ₹10,000 top-ups
 * mints money as fast as the requests go through. This is the limit that actually
 * constrains a self-serve funding endpoint, which is why it exists separately.
 *
 * Counted against *succeeded* attempts only — a declined card should not consume
 * somebody's daily allowance.
 */
export const TOPUP_DAILY_MAX_MINOR = 2000000;

/** Preset amounts, in paise. Covers a few bookings' worth of fees. */
export const TOPUP_PRESETS: readonly number[] = [10000, 25000, 50000, 100000];
