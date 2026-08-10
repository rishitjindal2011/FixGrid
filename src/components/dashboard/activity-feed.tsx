import Link from "next/link";
import { History } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { STATUS_TONE } from "@/lib/bookings/actions-map";
import type { ActivityEntry } from "@/lib/dashboard/customer";
import { formatRelative } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Plain English for one audit row.
 *
 * `booking_events` records a status pair, not a sentence — deliberately, so the
 * wording can change without a migration. `note` wins when the actor typed one,
 * because "Waiting on a screen from our supplier" tells the customer more than
 * "Confirmed → In progress" ever will.
 */
function describe(entry: ActivityEntry): string {
  if (entry.note?.trim()) return entry.note.trim();

  if (entry.toStatus) {
    const label = BOOKING_STATUS_LABELS[entry.toStatus];
    const who =
      entry.actorRole === "shop"
        ? "The shop"
        : entry.actorRole === "customer"
          ? "You"
          : entry.actorRole === "admin"
            ? "Our team"
            : null;

    return who ? `${who} moved this to ${label.toLowerCase()}` : `Moved to ${label.toLowerCase()}`;
  }

  return "Booking updated";
}

/**
 * The overview's activity rail.
 *
 * A rule with dots rather than a card per row: eight cards would out-weigh the
 * booking list beside it, and this is a glance, not a destination.
 */
export function ActivityFeed({
  entries,
  now,
}: {
  entries: ActivityEntry[];
  now: Date;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nothing has happened yet"
        description="Every accept, quote and completion on your bookings lands here."
      />
    );
  }

  return (
    <ol className="rounded-machined border border-hairline bg-chalk shadow-bench">
      {entries.map((entry, index) => {
        const tone = entry.toStatus ? STATUS_TONE[entry.toStatus] : "neutral";

        return (
          <li
            key={entry.id}
            className={cn(
              "flex gap-3 p-4",
              index > 0 && "border-t border-hairline",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-machined",
                tone === "signal"
                  ? "bg-signal"
                  : tone === "verified"
                    ? "bg-verdigris"
                    : tone === "solid"
                      ? "bg-enamel"
                      : "bg-steel-soft",
              )}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-enamel">{describe(entry)}</p>

              <p className="flex flex-wrap items-center gap-x-2 pt-1 text-xs text-steel">
                {entry.shopName ? <span className="truncate">{entry.shopName}</span> : null}
                {entry.bookingReference ? (
                  <Link
                    href={`/dashboard/bookings/${entry.bookingReference}`}
                    className="font-mono uppercase tracking-[0.08em] text-signal hover:underline"
                  >
                    {entry.bookingReference}
                  </Link>
                ) : null}
                <span className="font-mono tabular-nums text-steel-soft">
                  {formatRelative(entry.createdAt, now)}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
