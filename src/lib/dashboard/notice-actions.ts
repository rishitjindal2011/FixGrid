"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Acknowledging an admin notice.
 *
 * Its own module rather than a function in `expert-actions.ts` because it is the
 * one expert-side write that is not gated on shop ownership *by this app* — RLS
 * does it, through `owns_shop(fixer_id)` on the `shop_notices` policy. Adding it
 * to a file whose every other export begins with `assertOwnership` would invite
 * the next reader to assume this one does too.
 */

const AcknowledgeSchema = z.object({
  noticeId: z.string().uuid("That notice could not be found."),
});

export async function acknowledgeNotice(noticeId: string): Promise<{ error: string | null }> {
  const parsed = AcknowledgeSchema.safeParse({ noticeId });
  if (!parsed.success) return { error: "That notice could not be found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session has expired. Sign in again." };

  // No ownership check here: the `owner acknowledges own notices` policy scopes
  // the update to shops this user owns, so a stranger's id matches zero rows.
  // `.select()` is what turns that into something detectable — a filtered-out
  // UPDATE reports success with no rows, not an error.
  const { data, error } = await supabase
    .from("shop_notices")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", parsed.data.noticeId)
    .is("acknowledged_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("[notices] acknowledge failed", {
      code: error.code,
      message: error.message,
    });
    return { error: "That could not be saved. Try again." };
  }

  // Already acknowledged in another tab is not a failure worth showing.
  if (!data) return { error: null };

  revalidatePath("/dashboard/expert", "layout");
  return { error: null };
}
