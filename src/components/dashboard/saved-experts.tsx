import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SavedExpert } from "@/lib/dashboard/customer";

/**
 * Saved shops, as a compact grid.
 *
 * Links go to the public profile (`/expert/[slug]`), not to a dashboard-local
 * copy of it. There is one canonical page for a shop and it already exists; a
 * second, signed-in-only rendering of the same content would be two pages to
 * keep in step and would break the "share this shop" link.
 */
export function SavedExpertList({ experts }: { experts: SavedExpert[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {experts.map((expert) => (
        <li key={expert.id}>
          <Link
            href={`/expert/${expert.slug}`}
            className="flex h-full flex-col rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 font-display text-sm uppercase tracking-wide text-enamel">
                {expert.shopName}
              </p>
              {expert.verified ? (
                <BadgeCheck aria-label="Verified" className="size-4 shrink-0 text-verdigris" />
              ) : null}
            </div>

            <p className="flex items-start gap-1.5 pt-2 text-xs leading-snug text-steel">
              <MapPin aria-hidden className="mt-0.5 size-3 shrink-0 text-steel-soft" />
              <span className="line-clamp-2">{expert.address}</span>
            </p>

            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-enamel">
                <Star aria-hidden className="size-3 text-signal" />
                {expert.ratingCount > 0 ? expert.ratingAvg.toFixed(1) : "—"}
                <span className="text-steel-soft">({expert.ratingCount})</span>
              </span>

              {expert.acceptsBookings ? (
                <Badge variant="verified">Bookable</Badge>
              ) : (
                <Badge variant="neutral">Enquire</Badge>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
