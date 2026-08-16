/**
 * State for the plan picker.
 *
 * Its own module because `actions.ts` is `"use server"`, and such a module may
 * only export async functions — the mistake that broke the build earlier today
 * when a plain `export const` went into one. `tsc` does not catch it; the bundler
 * does.
 */
export interface PlanActionState {
  error: string | null;
  success: boolean;
  message?: string;
}

export const PLAN_INITIAL_STATE: PlanActionState = { error: null, success: false };
