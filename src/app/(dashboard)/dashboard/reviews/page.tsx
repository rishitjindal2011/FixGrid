import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, PenLine, Star } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { ReviewPromptCard } from "@/components/dashboard/review-prompt-card";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listMyReviews, listReviewableBookings, type MyReview } from "@/lib/dashboard/reviews";
import { formatDateLong } from "@/lib/format";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

/**
 * The customer's review centre: what they owe, then what they have written.
 *
 * Both reads run together — they share nothing and running them in sequence
 * would be two serialised round-trips for one screen. `now` is captured once
 * and threaded into the cards so every "finished 3 days ago" on the page agrees
 * with the others and survives hydration unchanged.
 */
export default async function ReviewsPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/reviews");

  const now = new Date();

  const [reviewable, myReviews] = await Promise.all([
    listReviewableBookings(user.id),
    listMyReviews(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Reviews"
        title="Your reviews"
        description="Rate the shops that have finished a repair for you, and read back what you have written."
      />

      <section>
        <SectionHeader
          title="Awaiting your review"
          action={
            reviewable.length > 0 ? (
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
                {pluralize(reviewable.length, "shop")}
              </span>
            ) : null
          }
        />

        {reviewable.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {reviewable.map((booking) => (
              <ReviewPromptCard key={booking.bookingId} booking={booking} now={now} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={PenLine}
            title="Nothing waiting"
            description="When a repair is finished, the shop that did it turns up here for a rating. One review per shop — a second job with the same shop updates the review you already left."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/bookings">See your bookings</Link>
              </Button>
            }
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="Your reviews"
          action={
            myReviews.length > 0 ? (
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {pluralize(myReviews.length, "review")}
              </span>
            ) : null
          }
        />

        {myReviews.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {myReviews.map((review) => (
              <MyReviewCard key={review.id} review={review} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Star}
            title="You have not written a review yet"
            description="Reviews are what the next person reads before trusting a shop with something broken. Yours carries more weight than you think."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/discover">Find an expert</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function MyReviewCard({ review }: { review: MyReview }) {
  // `updated_at` moves on the upsert, so a review that has been rewritten
  // should say when it was rewritten rather than when it was first posted.
  const edited = review.updatedAt > review.createdAt;
  const shownAt = edited ? review.updatedAt : review.createdAt;

  return (
    <li className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            href={`/expert/${review.slug}`}
            className="font-display text-base uppercase tracking-wide text-enamel hover:text-signal"
          >
            {review.shopName}
          </Link>

          {review.verified ? (
            <Badge variant="verified">
              <BadgeCheck aria-hidden />
              Verified booking
            </Badge>
          ) : null}
        </div>

        <time
          dateTime={shownAt}
          className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft"
        >
          {edited ? "Updated " : null}
          {formatDateLong(shownAt)}
        </time>
      </div>

      {/* `count={1}` because this is one person's rating, not an aggregate —
          `RatingStars` renders "No reviews yet" at zero, which would be wrong
          on a review that plainly exists. */}
      <RatingStars
        rating={review.rating}
        count={1}
        showCount={false}
        className="pt-2.5"
      />

      {review.text ? (
        <p className="max-w-prose pt-3 leading-relaxed text-steel">{review.text}</p>
      ) : (
        <p className="pt-3 text-sm italic text-steel-soft">
          You left a rating without a written review.
        </p>
      )}

      <p className="pt-4">
        <Link
          href={`/expert/${review.slug}`}
          className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
        >
          Edit on the shop&rsquo;s page
        </Link>
      </p>
    </li>
  );
}
