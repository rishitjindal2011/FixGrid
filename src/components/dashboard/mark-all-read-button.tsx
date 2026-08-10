"use client";

import { useActionState } from "react";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/bookings/actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";

/**
 * "Mark all read".
 *
 * Wrapped in `useActionState` rather than a bare form so a failure says so.
 * The read state drives the unread badge in the topbar, and a button that
 * appears to work while the count stays put is worse than one that reports the
 * error — the user's next move is to click it again.
 */
export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(
    () => markAllNotificationsRead(),
    BOOKING_INITIAL_STATE,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="outline" size="sm" disabled={disabled || pending}>
        <CheckCheck aria-hidden className="size-4" />
        {pending ? "Marking…" : "Mark all read"}
      </Button>

      {state.error ? (
        <p role="alert" className="text-xs text-rust">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
