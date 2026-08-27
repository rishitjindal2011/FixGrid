import { MessageSquarePlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { RatingStars } from "@/components/rating-stars";
import type { ReviewWithAuthor } from "@/lib/types/database";

/**
 * Relative date without pulling in a date library for one string.
 *
 * `locale` is threaded in rather than hard-coded to "en". `Intl.RelativeTimeFormat`
 * already knows how to say "2 दिन पहले" and "3 நாட்களுக்கு முன்" — the old
 * hard-coded "en" was the only thing stopping it.
 */
function formatRelativeDate(iso: string, locale: string, justNow: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of thresholds) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return justNow;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ReviewList({ reviews }: { reviews: ReviewWithAuthor[] }) {
  const t = useTranslations("reviews");
  const locale = useLocale();

  if (reviews.length === 0) {
    return (
      <div className="rounded-machined border border-dashed border-hairline bg-chalk p-8 text-center">
        <MessageSquarePlus aria-hidden className="mx-auto size-6 text-steel-soft" />
        <p className="mt-3 font-display text-lg uppercase text-enamel">{t("noneYet")}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-steel">
          {t("beFirst")}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => {
        // Not translated: a reviewer's own display name is their content, and the
        // fallback is a label we own, so only the fallback goes through `t`.
        const name = review.customer?.display_name ?? t("verifiedCustomer");
        return (
          <li
            key={review.id}
            className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-bench-sunk font-mono text-xs font-semibold text-steel"
              >
                {initials(name)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-display text-base uppercase text-enamel">{name}</span>
                  <time
                    dateTime={review.created_at}
                    className="font-mono text-eyebrow uppercase text-steel-soft"
                  >
                    {formatRelativeDate(review.created_at, locale, t("justNow"))}
                  </time>
                </div>

                <RatingStars
                  rating={review.rating}
                  count={1}
                  showCount={false}
                  className="mt-1.5"
                />

                {review.text ? (
                  <p className="mt-3 leading-relaxed text-steel">{review.text}</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
