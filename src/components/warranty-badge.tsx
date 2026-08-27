import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The warranty a shop stands behind, as a badge.
 *
 * This is the product's strongest claim and it was buried. `warranty_days`,
 * `warranty_expires_at`, the escrow view and the whole dispute flow have existed
 * since the marketplace migration, but nothing said so until a customer had already
 * booked and gone looking for a detail page. The incumbent advertises no warranty
 * at all, so saying it on the card is the cheapest advantage available.
 *
 * One component rather than the same JSX in three files, because the number and the
 * wording have to agree everywhere a shop is listed. A card promising "30-day
 * warranty" next to a profile promising "1 month" reads as two different claims.
 *
 * Renders nothing when there is no warranty. A shop that offers none should not get
 * a reassuring grey badge saying "0 days" — absence is quieter and more honest.
 */
export function WarrantyBadge({
  days,
  variant = "badge",
  className,
}: {
  days: number | null | undefined;
  /** `badge` for cards and lists, `line` for a profile's detail column. */
  variant?: "badge" | "line";
  className?: string;
}) {
  const t = useTranslations("warranty");

  if (days === null || days === undefined || days <= 0) return null;

  const { unit, count } = warrantyUnit(days);
  const label = t(unit, { count });

  if (variant === "line") {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm text-enamel", className)}>
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-verdigris" />
        {/*
          The whole line is emphasised rather than just the duration. English can
          bold "30-day warranty" and leave "on every repair" plain because the two
          halves sit in that order; in Hindi the same sentence is "हर मरम्मत पर
          30-दिन की वारंटी" and the emphasised fragment has moved to the end. A
          catalogue can re-order words, but it cannot re-order two JSX children.
        */}
        <span className="font-semibold">{t("line", { label })}</span>
      </p>
    );
  }

  return (
    <Badge variant="verified" className={className}>
      <ShieldCheck aria-hidden className="size-3" />
      {t("badge", { label })}
    </Badge>
  );
}

/**
 * `30` → month×1, `90` → month×3, `365` → year×1, `7` → week.
 *
 * Rounded to the unit a person would actually say. "90-day" is not wrong but
 * nobody says it, and a warranty is a promise — it should read like one rather
 * than like a database column.
 *
 * Returns the unit and the number instead of a formatted string, because the
 * formatted string is the catalogue's job: "3-month" is a hyphenated compound in
 * English, two separate words in Kannada ("3 ತಿಂಗಳು"), and the count sits on the
 * other side of the noun in neither reliably.
 */
export function warrantyUnit(days: number): {
  unit: "day" | "week" | "month" | "year";
  count: number;
} {
  if (days >= 365 && days % 365 === 0) return { unit: "year", count: days / 365 };
  if (days >= 30 && days % 30 === 0) return { unit: "month", count: days / 30 };
  if (days === 7) return { unit: "week", count: 1 };
  return { unit: "day", count: days };
}
