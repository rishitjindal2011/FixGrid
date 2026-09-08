import "server-only";

import { z } from "zod";

import { coreFail, coreOk, type CoreResult } from "@/lib/api/result";
import { createClient } from "@/lib/supabase/server";

export const ReviewSchema = z.object({
  fixerId: z.string().uuid("That expert could not be found."),
  slug: z.string().min(1).max(200),
  rating: z.coerce
    .number()
    .int("Pick a rating between 1 and 5 stars.")
    .min(1, "Pick a rating between 1 and 5 stars.")
    .max(5, "Pick a rating between 1 and 5 stars."),
  text: z.string().trim().max(4000, "Keep it under 4000 characters.").optional(),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

export async function submitReviewCore(
  userId: string,
  input: ReviewInput,
): Promise<CoreResult<{ success: true }>> {
  const supabase = await createClient();

  const { error } = await supabase.from("reviews").upsert(
    {
      fixer_id: input.fixerId,
      customer_id: userId,
      rating: input.rating,
      text: input.text || null,
    },
    { onConflict: "fixer_id,customer_id" },
  );

  if (error) {
    if (error.code === "42501") {
      return coreFail(403, "forbidden", "You can't review your own shop.");
    }
    console.error("[reviews] submit failed", { code: error.code, message: error.message });
    return coreFail(500, "server_error", "We couldn't save that review. Try again in a moment.");
  }

  return coreOk({ success: true });
}
