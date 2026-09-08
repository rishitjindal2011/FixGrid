import { requireApiUser } from "@/lib/api/context";
import { handle, unwrap } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readJson } from "@/lib/api/validate";
import { TransitionFieldsSchema, transitionBookingCore } from "@/lib/bookings/core";

/**
 * `POST /api/v1/bookings/{reference}/transition` — move a booking's status.
 *
 * An action sub-resource rather than `PATCH /bookings/{reference}`, because the
 * domain is a guarded state machine and not a bag of editable fields. `PATCH`
 * invites `{"status":"completed"}` from a client that believes it may set any
 * value it likes; a named action makes the answer to "may I?" the endpoint's
 * subject rather than a validation footnote. Every write endpoint in this API
 * follows the same convention.
 *
 * Open to both parties on the booking. Which transitions each may make is
 * `canTransition()`'s answer, asked inside the core — the shop accepts, quotes,
 * starts and completes; the customer confirms and disputes. A move neither the
 * state nor the actor allows is a 409 carrying the reason as a sentence.
 *
 * Statuses reserved for `system` (cron expiry) are unreachable here by
 * construction: the actor resolves to `customer` or `shop`, and the transition
 * table lists no other origin for them.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  return handle(async () => {
    await requireApiUser();

    const { reference } = await params;
    const fields = await readJson(request, TransitionFieldsSchema);
    const booking = unwrap(await transitionBookingCore({ reference }, fields));

    return ok(booking);
  });
}
