import { z } from "zod";

import { requireApiUser } from "@/lib/api/context";
import { handle, unwrap } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readJson } from "@/lib/api/validate";
import { cancelBookingCore } from "@/lib/bookings/core";

/**
 * `POST /api/v1/bookings/{reference}/cancel` — withdraw the job.
 *
 * Separate from `/transition` even though it ends in one, because the caller must
 * not be the one choosing between `cancelled_customer` and `cancelled_shop`.
 * Those two statuses carry blame — the fee is refunded on one and kept on the
 * other — so the core derives it from who is asking rather than from the body. A
 * shop posting `to: "cancelled_customer"` through `/transition` is refused by the
 * transition table for exactly this reason.
 *
 * `reason` is optional and free text. It lands on the booking as
 * `cancellation_reason` and in the audit trail as the event note, so the other
 * party sees why without a second request.
 */

export const dynamic = "force-dynamic";

const CancelSchema = z.object({
  reason: z.string().trim().max(2000).nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  return handle(async () => {
    await requireApiUser();

    const { reference } = await params;
    const { reason } = await readJson(request, CancelSchema);
    const booking = unwrap(await cancelBookingCore({ reference }, reason));

    return ok(booking);
  });
}
