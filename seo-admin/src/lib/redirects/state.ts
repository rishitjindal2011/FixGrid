/**
 * Form state for the redirect and settings actions.
 *
 * Split out of the action modules for the same reason `lib/pages/state.ts` is:
 * a `"use server"` file may only export async functions, so the state shape and
 * its constructors cannot live beside the actions that return them.
 */

export interface FormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
}

export const IDLE_FORM_STATE: FormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

export function formFailure(
  message: string,
  fieldErrors: Record<string, string> = {},
): FormState {
  return { status: "error", message, fieldErrors };
}

export function formSuccess(message: string): FormState {
  return { status: "success", message, fieldErrors: {} };
}
