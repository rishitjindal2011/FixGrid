import { ShieldCheck } from "lucide-react";

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
  if (days === null || days === undefined || days <= 0) return null;

  const label = formatWarrantyDays(days);

  if (variant === "line") {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm text-enamel", className)}>
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-verdigris" />
        <span>
          <strong className="font-semibold">{label} warranty</strong> on every repair
        </span>
      </p>
    );
  }

  return (
    <Badge variant="verified" className={className}>
      <ShieldCheck aria-hidden className="size-3" />
      {label} warranty
    </Badge>
  );
}

/**
 * `30` → "30-day", `90` → "3-month", `365` → "1-year".
 *
 * Rounded to the unit a person would actually say. "90-day" is not wrong but
 * nobody says it, and a warranty is a promise — it should read like one rather
 * than like a database column.
 */
export function formatWarrantyDays(days: number): string {
  if (days >= 365 && days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? "1-year" : `${years}-year`;
  }
  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "1-month" : `${months}-month`;
  }
  if (days === 7) return "1-week";
  return `${days}-day`;
}
