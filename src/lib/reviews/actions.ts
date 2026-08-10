"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ReviewState } from "@/lib/reviews/state";

/**
 * Review submission.
 *
 * The RLS policies in `supabase/policies.sql` are the real enforcement — a
 * customer may only write a review carrying their own `customer_id`, and never
 * for a shop they own. The checks here exist to turn those database errors into
 * sentences a person can act on, not to replace them. Anything that reaches the
 * database without a session is rejected there regardless of what this file does.
 */

const ReviewSchema = z.object({
  fixerId: z.string().uuid(),
  slug: z.string().min(1).max(200),
  rating: z.coerce
    .number()
    .int("Pick a rating between 1 and 5 stars.")
    .min(1, "Pick a rating between 1 and 5 stars.")
    .max(5, "Pick a rating between 1 and 5 stars."),
  // Matches the `length(text) <= 4000` check constraint on the column.
  text: z.string().trim().max(4000, "Keep it under 4000 characters.").optional(),
});

export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const parsed = ReviewSchema.safeParse({
    fixerId: formData.get("fixerId"),
    slug: formData.get("slug"),
    rating: formData.get("rating"),
    text: formData.get("text") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to leave a review.", success: false };
  }

  // `upsert` on the (fixer_id, customer_id) unique constraint, so revisiting a
  // shop edits the existing review rather than failing on a duplicate. The
  // "one review per customer per shop" rule in the schema exists to stop rating
  // inflation, and this is the honest way to honour it from the UI.
  const { error } = await supabase.from("reviews").upsert(
    {
      fixer_id: parsed.data.fixerId,
      customer_id: user.id,
      rating: parsed.data.rating,
      text: parsed.data.text || null,
    },
    { onConflict: "fixer_id,customer_id" },
  );

  if (error) {
    // 42501 is insufficient_privilege — the RLS check failed. In practice that
    // means the shop belongs to this user, which is the one case worth naming.
    if (error.code === "42501") {
      return { error: "You can't review your own shop.", success: false };
    }
    console.error("[reviews] submit failed", { code: error.code, message: error.message });
    return { error: "We couldn't save that review. Try again in a moment.", success: false };
  }

  // The rating average is maintained by the `reviews_sync_rating` trigger, so
  // the profile page has to re-read to show it. Both the page and the search
  // listing display the aggregate.
  revalidatePath(`/expert/${parsed.data.slug}`);

  return { error: null, success: true };
}
