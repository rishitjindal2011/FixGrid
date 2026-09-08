import { requireApiUser } from "@/lib/api/context";
import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getBookingByReference } from "@/lib/dashboard/booking-detail";

/**
 * `/api/v1/bookings/{reference}` — one booking in full.
 *
 * Addressed by `reference` (`FIX-7Q2M4X`) rather than by uuid, matching
 * `/dashboard/bookings/[reference]`: it is the identifier that appears in email,
 * that a customer can read down a phone, and that the shop and the customer both
 * already use for the same job.
 *
 * This is the *customer's* view of a booking, and `getBookingByReference` filters
 * on `customer_id` — so a shop owner asking for one of their own jobs here gets a
 * 404, exactly as they would on the customer-side page. That is deliberate rather
 * than an oversight: the shop's own read has different columns and different
 * wording, and it arrives with the expert endpoints. Note that the action
 * endpoints beside this one (`/transition`, `/cancel`) *are* open to both parties,
 * because a shop accepting a request is the whole point of them.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { reference } = await params;

    // Null is "no such reference", "not yours", and "the migration has not been
    // run" alike — all 404, and deliberately indistinguishable. Confirming that a
    // reference exists but belongs to somebody else turns this into a way to
    // enumerate other people's bookings.
    const booking = found(
      await getBookingByReference(user.id, reference),
      "That booking could not be found.",
    );

    return ok(booking);
  });
}
