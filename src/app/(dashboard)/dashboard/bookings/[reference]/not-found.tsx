import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Reached when the reference does not resolve — no such booking, or one that
 * belongs to someone else. Both are the same page on purpose: a distinct
 * "not yours" would confirm the reference exists to anyone guessing at them.
 */
export default function BookingNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="eyebrow">No such booking</p>
      <h1 className="mt-3 font-display text-display-sm uppercase text-enamel sm:text-display">
        We can&apos;t find that job
      </h1>
      <p className="mt-4 leading-relaxed text-steel">
        The reference may be mistyped, or the booking may belong to a different account.
        Check the list — every repair you have booked is there, live and finished.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button asChild size="md">
          <Link href="/dashboard/bookings">All bookings</Link>
        </Button>
        <Button asChild variant="outline" size="md">
          <Link href="/dashboard/discover">Find an expert</Link>
        </Button>
      </div>
    </div>
  );
}
