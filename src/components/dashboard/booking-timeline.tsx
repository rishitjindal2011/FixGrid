import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/dashboard/empty-state";
import { STATUS_TONE } from "@/lib/bookings/actions-map";
import type { BookingTimelineEvent } from "@/lib/dashboard/booking-detail";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Who did it, in the customer's voice.
 *
 * `system` and a null actor are the same thing to a reader — the cron job that
 * expired a request is not a person, and saying "system" would invite the
 * question of who that is. Both render without an actor, and the sentence is
 * written to still read: "Expired" rather than "Nobody expired this".
 */
function actorLabel(role: BookingTimelineEvent["actorRole"]): string | null {
  switch (role) {
    case "customer":
      return "You";
    case "shop":
      return "The shop";
    case "admin":
      return "Our team";
    default:
      return null;
  }
}

/**
 * The headline for one audit row.
 *
 * `booking_events` stores a status pair, never a sentence — deliberately, so
 * the wording can change without a migration. The trigger writes the pair; the
 * `note` is only there when a person typed a reason, which is why it renders
 * below as a quote rather than replacing the line. On the overview's compact
 * feed the note *does* replace it; here there is room for both, and a
 * cancellation reason without the word "cancelled" above it is ambiguous.
 */
function headline(
  event: BookingTimelineEvent,
  tStatus: (key: string) => string,
): string {
  if (!event.toStatus) return "Booking updated";

  const label = tStatus(event.toStatus).toLowerCase();
  const who = actorLabel(event.actorRole);

  if (!event.fromStatus) {
    return who ? `${who} sent this request` : "Request sent";
  }

  return who ? `${who} moved this to ${label}` : `Moved to ${label}`;
}

const DOT_CLASS = {
  signal: "bg-signal",
  verified: "bg-verdigris",
  solid: "bg-enamel",
  neutral: "bg-steel-soft",
} as const;

/**
 * The job's history, oldest first, as a vertical rail.
 *
 * Top-to-bottom in chronological order because this is a story with an end —
 * the reader wants to arrive at "where is it now", and the current status sits
 * at the bottom next to whatever action is offered. The overview's feed reverses
 * that on purpose: a feed is scanned, a case history is read.
 *
 * Timestamps render in the **shop's** timezone for the same reason the slot
 * does. "Started at 09:00" has to mean the clock on the wall where the work
 * happened, or a customer comparing the timeline to their appointment sees two
 * different mornings.
 */
export function BookingTimeline({
  events,
  now,
  timeZone,
}: {
  events: BookingTimelineEvent[];
  now: Date;
  timeZone: string;
}) {
  const tStatus = useTranslations("statuses");

  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nothing recorded yet"
        description="Every accept, quote, start and completion on this job is logged here as it happens."
      />
    );
  }

  return (
    <ol className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      {events.map((event, index) => {
        const tone = event.toStatus ? STATUS_TONE[event.toStatus] : "neutral";
        const last = index === events.length - 1;

        return (
          <li key={event.id} className={cn("relative flex gap-4", !last && "pb-5")}>
            {/* The rail is drawn per row rather than as one absolute line down
                the list, so it stops at the final dot instead of overshooting
                past it. */}
            {last ? null : (
              <span
                aria-hidden
                className="absolute left-[4px] top-3.5 h-full w-px bg-hairline"
              />
            )}

            <span
              aria-hidden
              className={cn(
                "relative mt-1.5 size-2 shrink-0 rounded-machined",
                DOT_CLASS[tone],
              )}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-enamel">{headline(event, tStatus)}</p>

              {event.note?.trim() ? (
                <p className="mt-1.5 border-l-2 border-hairline pl-3 text-sm leading-relaxed text-steel">
                  {event.note.trim()}
                </p>
              ) : null}

              <p className="flex flex-wrap items-center gap-x-2 pt-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                <time dateTime={event.createdAt}>
                  {formatDateTime(event.createdAt, timeZone)}
                </time>
                <span aria-hidden>·</span>
                <span className="normal-case tracking-normal">
                  {formatRelative(event.createdAt, now)}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
