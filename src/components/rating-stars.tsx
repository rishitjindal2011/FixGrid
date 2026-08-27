import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn, formatRating } from "@/lib/utils";

/**
 * Rating display. The numeric value is set in mono because it is measured
 * data, matching the treatment of hours and coordinates elsewhere.
 */
export function RatingStars({
  rating,
  count,
  size = "sm",
  showCount = true,
  className,
}: {
  rating: number;
  count: number;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}) {
  const t = useTranslations("reviews");

  if (count === 0) {
    return (
      <span className={cn("font-mono text-eyebrow uppercase text-steel-soft", className)}>
        {t("noneYet")}
      </span>
    );
  }

  const rounded = Math.round(rating * 2) / 2;
  const starSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      /*
       * `pluralize` is gone from here. It appended an "s" to make "12 reviews",
       * which is a rule of exactly one of the seven languages this ships in —
       * and it also hard-coded the whole sentence's word order. The ICU plural in
       * the catalogue does both jobs per-language instead.
       */
      aria-label={t("ratingAria", { rating: formatRating(rating), count })}
    >
      <span aria-hidden className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((index) => (
          <Star
            key={index}
            className={cn(
              starSize,
              index <= rounded
                ? "fill-signal text-signal"
                : index - 0.5 === rounded
                  ? "fill-signal/40 text-signal"
                  : "fill-transparent text-hairline",
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "font-mono font-semibold text-enamel",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {formatRating(rating)}
      </span>
      {showCount ? (
        <span className="font-mono text-eyebrow text-steel-soft">({count})</span>
      ) : null}
    </span>
  );
}
