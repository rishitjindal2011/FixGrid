"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireEditor, requireOwner } from "@/lib/auth/session";
import { checkDestination, checkSourcePath, isSelfLoop } from "@/lib/redirects/validate";
import { type FormState, formFailure, formSuccess } from "@/lib/redirects/state";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mutations for `seo_redirects`.
 *
 * Same three rules as `lib/pages/actions.ts`: authorise first, validate before
 * writing, return state rather than throwing for anything a person can fix.
 *
 * One addition specific to this table — every write revalidates `/redirects`
 * *and* nothing else. The consumer app reads redirects in its proxy on every
 * request and cannot be revalidated from here; it picks changes up on its own
 * cache interval. That lag is documented on the screen so nobody edits a rule,
 * tests it immediately, and concludes it did not save.
 */

/**
 * 301 is permanent and aggressively cached by browsers — a wrong one is close
 * to unrecoverable for anyone who has already hit it. 302 and 307 are the
 * temporary options; 308 is the method-preserving permanent form.
 */
const StatusCodeSchema = z.union([
  z.literal(301),
  z.literal(302),
  z.literal(307),
  z.literal(308),
]);

const IdSchema = z.string().uuid("That redirect id is not valid.");

export async function createRedirect(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireEditor();

  const source = checkSourcePath(String(formData.get("source_url") ?? ""));
  const destination = checkDestination(String(formData.get("destination_url") ?? ""));

  const fieldErrors: Record<string, string> = {};
  if (!source.ok && source.error) fieldErrors.source_url = source.error;
  if (!destination.ok && destination.error) fieldErrors.destination_url = destination.error;

  const parsedCode = StatusCodeSchema.safeParse(Number(formData.get("status_code")));
  if (!parsedCode.success) fieldErrors.status_code = "Choose 301, 302, 307 or 308.";

  if (Object.keys(fieldErrors).length > 0) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }
  if (isSelfLoop(source.value, destination.value)) {
    return formFailure("That redirect points at itself, which is an infinite loop.", {
      destination_url: "Choose a different destination.",
    });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("seo_redirects").insert({
    source_url: source.value,
    destination_url: destination.value,
    status_code: parsedCode.success ? parsedCode.data : 301,
  });

  if (error) {
    // 23505 is unique_violation. Reported against the field that caused it
    // rather than as a banner, because the fix is to edit that one input.
    if (error.code === "23505") {
      return formFailure("A redirect already exists for that path.", {
        source_url: "This path is already redirected. Edit the existing rule instead.",
      });
    }
    console.error("[redirects] insert failed:", error.message);
    return formFailure("Could not save that redirect. The error has been logged.");
  }

  revalidatePath("/redirects");
  revalidatePath("/");
  return formSuccess(`Redirecting ${source.value} → ${destination.value}.`);
}

export async function updateRedirect(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireEditor();

  const id = IdSchema.safeParse(formData.get("id"));
  if (!id.success) return formFailure("That redirect could not be identified.");

  const source = checkSourcePath(String(formData.get("source_url") ?? ""));
  const destination = checkDestination(String(formData.get("destination_url") ?? ""));

  const fieldErrors: Record<string, string> = {};
  if (!source.ok && source.error) fieldErrors.source_url = source.error;
  if (!destination.ok && destination.error) fieldErrors.destination_url = destination.error;

  const parsedCode = StatusCodeSchema.safeParse(Number(formData.get("status_code")));
  if (!parsedCode.success) fieldErrors.status_code = "Choose 301, 302, 307 or 308.";

  if (Object.keys(fieldErrors).length > 0) {
    return formFailure("Fix the highlighted fields.", fieldErrors);
  }
  if (isSelfLoop(source.value, destination.value)) {
    return formFailure("That redirect points at itself, which is an infinite loop.", {
      destination_url: "Choose a different destination.",
    });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("seo_redirects")
    .update({
      source_url: source.value,
      destination_url: destination.value,
      status_code: parsedCode.success ? parsedCode.data : 301,
    })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") {
      return formFailure("Another redirect already uses that source path.", {
        source_url: "This path is already redirected.",
      });
    }
    console.error("[redirects] update failed:", error.message);
    return formFailure("Could not save that change. The error has been logged.");
  }

  revalidatePath("/redirects");
  return formSuccess("Redirect updated.");
}

/**
 * Deleting is owner-only.
 *
 * Removing a redirect resurrects a 404 for every inbound link that depended on
 * it, and unlike a page there is no archived state to fall back to — the rule
 * is either there or it is not. Narrower permission than editing is the right
 * asymmetry.
 */
export async function deleteRedirect(formData: FormData): Promise<void> {
  await requireOwner();

  const id = IdSchema.safeParse(formData.get("id"));
  if (!id.success) throw new Error("INVALID_ID");

  const supabase = createAdminClient();
  const { error } = await supabase.from("seo_redirects").delete().eq("id", id.data);

  if (error) {
    console.error("[redirects] delete failed:", error.message);
    throw new Error("DELETE_FAILED");
  }

  revalidatePath("/redirects");
  revalidatePath("/");
}
