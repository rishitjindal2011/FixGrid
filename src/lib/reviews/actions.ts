"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ReviewState } from "@/lib/reviews/state";
import { ReviewSchema, submitReviewCore } from "@/lib/reviews/core";

/**
 * Review submission.
 *
 * The RLS policies in `supabase/policies.sql` are the real enforcement — a
 * customer may only write a review carrying their own `customer_id`, and never
 * for a shop they own. The checks here exist to turn those database errors into
 * sentences a person can act on, not to replace them. Anything that reaches the
 * database without a session is rejected there regardless of what this file does.
 */

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

  const result = await submitReviewCore(user.id, parsed.data);

  if (!result.ok) {
    return { error: result.message, success: false };
  }

  // The rating average is maintained by the `reviews_sync_rating` trigger, so
  // the profile page has to re-read to show it. Both the page and the search
  // listing display the aggregate.
  revalidatePath(`/expert/${parsed.data.slug}`);

  return { error: null, success: true };
}
