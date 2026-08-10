import { Badge } from "@/components/ui/badge";
import { STATUS_TONE } from "@/lib/bookings/actions-map";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * A booking's status, as a badge.
 *
 * The tone comes from `STATUS_TONE`, so status colour is decided in one place
 * and every list, card and detail page agrees. `in_progress` also gets the
 * pulsing status dot — the site's signature element, reserved for genuinely live
 * state, and a job on the bench right now is the definition of that.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const live = status === "in_progress";

  return (
    <Badge variant={STATUS_TONE[status]} className={cn(className)}>
      {live ? (
        <span aria-hidden className="status-dot status-dot--live size-1.5" />
      ) : null}
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
