"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewableBooking } from "@/lib/dashboard/reviews";
import { formatRelative } from "@/lib/format";
import { submitReview } from "@/lib/reviews/actions";
import { REVIEW_INITIAL_STATE } from "@/lib/reviews/state";
import { cn, pluralize } from "@/lib/utils";

/**
 * One finished repair, with the form to review it.
 *
 * A client component because the star picker holds a selection and the action
 * reports back through `useActionState`. It posts to the same `submitReview`
 * server action as the shop's public page — same field names, same upsert — so
 * a review written here and one written there are the same row, and reviewing
 * from the dashboard cannot produce a second review for a shop.
 *
 * The card stays on screen after a successful post rather than vanishing.
 * `submitReview` revalidates `/expert/[slug]`, which is where the review is
 * published; this page is not in its revalidation set, so a card that removed
 * itself would be lying about a refresh that has not happened. Confirming in
 * place is the honest version, and the next navigation clears the prompt.
 */

/**
 * Star picker on a radio group.
 *
 * Radios rather than buttons plus a hidden input: this is one choice out of
 * five, which is what a radio group is, and it arrives with arrow-key
 * navigation, form association and screen-reader semantics already right.
 * Matches `@/components/expert/review-form` deliberately — two star pickers
 * that behave differently in one product is a bug the user finds, not us.
 *
 * The `rating` name is shared by every card on the page, which is safe because
 * radio grouping is scoped to the owning form: each picker is rendered inside
 * its own `<form>`, so picking four stars on one card cannot clear the choice
 * on the next.
 */
function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
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
                "size-6 transition-colors",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal",
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Posting…" : "Post review"}
    </Button>
  );
}

export function ReviewPromptCard({
  booking,
  now,
}: {
  booking: ReviewableBooking;
  /**
   * Captured once by the page so every "finished 3 days ago" on the screen
   * agrees, and so the server render and its hydration compare equal.
   */
  now: Date;
}) {
  const [state, formAction] = useActionState(submitReview, REVIEW_INITIAL_STATE);
  const [rating, setRating] = useState(0);

  const textId = `review-text-${booking.bookingId}`;

  return (
    <li className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-display text-base uppercase tracking-wide text-enamel">
            {booking.shopName}
          </p>
          <p className="pt-0.5 text-sm text-steel">
            {booking.serviceName ?? "Repair"} ·{" "}
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-steel-soft">
              {booking.reference}
            </span>
          </p>
        </div>

        {booking.finishedAt ? (
          <time
            dateTime={booking.finishedAt}
            className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft"
          >
            Finished {formatRelative(booking.finishedAt, now)}
          </time>
        ) : null}
      </div>

      {booking.alsoCount > 0 ? (
        // One review per customer per shop is a schema rule, so the extra jobs
        // are named rather than given their own cards that would overwrite
        // each other.
        <p className="pt-2 text-xs text-steel-soft">
          Covers {pluralize(booking.alsoCount + 1, "repair")} with this shop.
        </p>
      ) : null}

      <form action={formAction} className="pt-4">
        <input type="hidden" name="fixerId" value={booking.fixerId} />
        <input type="hidden" name="slug" value={booking.slug} />

        <RatingPicker value={rating} onChange={setRating} />

        <div className="flex flex-col gap-1.5 pt-4">
          <label htmlFor={textId} className="eyebrow">
            What happened?{" "}
            <span className="normal-case tracking-normal text-steel-soft">(optional)</span>
          </label>
          <Textarea
            id={textId}
            name="text"
            rows={3}
            maxLength={4000}
            placeholder="What did they fix, how long did it take, and would you go back?"
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
            Thanks — your review of {booking.shopName} is live.
          </p>
        ) : null}

        <div className="pt-4">
          <SubmitButton />
        </div>
      </form>
    </li>
  );
}
