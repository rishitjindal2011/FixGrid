import type { BlockValidationIssue } from "@/lib/cms/blocks";

/**
 * Form state shared between the page actions and the editor.
 *
 * This lives in its own module because a `"use server"` file may only export
 * async functions — Next.js turns every export into a callable endpoint, so a
 * plain object export is a build error. Types are erased and would be fine, but
 * `IDLE_STATE` is a real value, and splitting the two apart is clearer than
 * explaining why one constant is defined somewhere unexpected.
 *
 * It is also imported by Client Components, which must not pull in the server
 * module's dependency graph.
 */
export interface PageActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  /** Field-level errors, keyed by form field name. */
  fieldErrors: Record<string, string>;
  /** Block-level errors from `validateContentSections`. */
  blockIssues: BlockValidationIssue[];
}

export const IDLE_STATE: PageActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  blockIssues: [],
};

export function failureState(
  message: string,
  fieldErrors: Record<string, string> = {},
  blockIssues: BlockValidationIssue[] = [],
): PageActionState {
  return { status: "error", message, fieldErrors, blockIssues };
}

export function successState(message: string): PageActionState {
  return { status: "success", message, fieldErrors: {}, blockIssues: [] };
}
