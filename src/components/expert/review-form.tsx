"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/reviews/actions";
import { REVIEW_INITIAL_STATE } from "@/lib/reviews/state";
import { cn } from "@/lib/utils";

/**
 * Star picker built on a radio group.
 *
 * Radios rather than buttons-plus-hidden-input: this is a single choice from
 * five, which is what a radio group is, and it arrives with arrow-key
 * navigation, form association and screen-reader semantics already correct.
 * The stars are painted from `peer-checked` and hover state; the inputs
 * themselves are visually hidden but focusable.
 */
function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="eyebrow mb-1.5">Your rating</legend>

      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="cursor-pointer p-0.5"
            onMouseEnter={() => setHovered(star)}
          >
            <input
              type="radio"
              name="rating"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              required
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className={cn(
                "size-7 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal",
                star <= active ? "fill-signal text-signal" : "fill-transparent text-hairline",
              )}
            />
            <span className="sr-only">
              {star} {star === 1 ? "star" : "stars"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Posting…" : isEdit ? "Update review" : "Post review"}
    </Button>
  );
}

export function ReviewForm({
  fixerId,
  slug,
  existing,
}: {
  fixerId: string;
  slug: string;
  existing?: { rating: number; text: string | null } | undefined;
}) {
  const [state, formAction] = useActionState(submitReview, REVIEW_INITIAL_STATE);
  const [rating, setRating] = useState(existing?.rating ?? 0);

  return (
    <form
      action={formAction}
      className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench"
    >
      <input type="hidden" name="fixerId" value={fixerId} />
      <input type="hidden" name="slug" value={slug} />

      <p className="font-display text-lg uppercase text-enamel">
        {existing ? "Update your review" : "Write a review"}
      </p>

      <div className="mt-4">
        <RatingPicker value={rating} onChange={setRating} />
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="review-text" className="eyebrow">
          What happened? <span className="normal-case text-steel-soft">(optional)</span>
        </label>
        <textarea
          id="review-text"
          name="text"
          rows={4}
          maxLength={4000}
          defaultValue={existing?.text ?? ""}
          placeholder="What did they fix, how long did it take, and would you go back?"
          className="w-full rounded-machined border border-hairline bg-chalk px-3 py-2 text-[0.95rem] leading-relaxed text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="mt-4 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
        >
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          Thanks — your review is live.
        </p>
      ) : null}

      <div className="mt-5">
        <SubmitButton isEdit={Boolean(existing)} />
      </div>
    </form>
  );
}
