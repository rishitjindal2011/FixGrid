import Link from "next/link";
import { BadgeCheck, CalendarPlus, MapPin, Timer } from "lucide-react";

import {
  SaveExpertButton,
  type ToggleSavedExpert,
} from "@/components/dashboard/save-expert-button";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DiscoverExpert } from "@/lib/dashboard/discover";
import { formatDuration, formatMoney } from "@/lib/format";

/**
 * One shop in the directory grid.
 *
 * Deliberately not a single wrapping link. The card carries three separate
 * destinations — save, book, read the public profile — and nesting a button
 * inside an anchor is invalid HTML that browsers resolve by swallowing one of
 * the two. So the shop name is the link and the actions stand on their own.
 *
 * The response time is the shop's advertised `response_hours`, converted to
 * minutes for `formatDuration` rather than printed raw — a bare "24" beside a
 * price and a rating is one more number for the reader to classify.
 */
export function ExpertCard({
  expert,
  toggleSaved,
}: {
  expert: DiscoverExpert;
  toggleSaved: ToggleSavedExpert;
}) {
  const bookHref = `/dashboard/discover/${expert.slug}`;

  return (
    <article className="flex h-full flex-col rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base uppercase tracking-wide text-enamel">
            <Link href={bookHref} className="hover:text-signal">
              {expert.shopName}
            </Link>
            {expert.verified ? (
              <BadgeCheck
                aria-label="Verified shop"
                className="ml-1.5 inline-block size-4 -translate-y-px text-verdigris"
              />
            ) : null}
          </h3>

          <div className="pt-1.5">
            <RatingStars rating={expert.ratingAvg} count={expert.ratingCount} />
          </div>
        </div>

        <SaveExpertButton
          fixerId={expert.id}
          shopName={expert.shopName}
          saved={expert.isSaved}
          action={toggleSaved}
        />
      </div>

      <p className="flex items-start gap-1.5 pt-3 text-sm leading-snug text-steel">
        <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-steel-soft" />
        <span className="line-clamp-2">{expert.address}</span>
      </p>

      {expert.categories.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 pt-3">
          {expert.categories.slice(0, 3).map((category) => (
            <li key={category}>
              <Badge variant="neutral">{category}</Badge>
            </li>
          ))}
          {expert.categories.length > 3 ? (
            <li>
              <Badge variant="neutral">+{expert.categories.length - 3}</Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      <dl className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4 text-xs text-steel">
        <div className="flex items-baseline gap-1.5">
          <dt className="eyebrow">From</dt>
          <dd className="font-mono text-sm tabular-nums text-enamel">
            {/* No priced services is not "£0" — it is a shop that quotes on
                inspection, which is a legitimate way to sell a repair. */}
            {expert.priceFromPence === null
              ? "On quote"
              : formatMoney(expert.priceFromPence)}
          </dd>
        </div>

        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Typical reply time</dt>
          <dd className="flex items-center gap-1.5">
            <Timer aria-hidden className="size-3.5 text-steel-soft" />
            <span className="font-mono tabular-nums">
              Replies in {formatDuration(expert.responseHours * 60)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="flex items-center gap-2 pt-4">
        {expert.acceptsBookings ? (
          <Button asChild variant="primary" size="sm" className="flex-1">
            <Link href={bookHref}>
              <CalendarPlus aria-hidden />
              Book now
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/expert/${expert.slug}`}>Enquire</Link>
          </Button>
        )}

        <Button asChild variant="ghost" size="sm">
          <Link href={`/expert/${expert.slug}`}>Profile</Link>
        </Button>
      </div>
    </article>
  );
}
