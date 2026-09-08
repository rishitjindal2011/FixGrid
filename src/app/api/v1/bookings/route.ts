import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/context";
import { handle, unwrap } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { parseWith, readJson, readLimit } from "@/lib/api/validate";
import {
  BOOKING_STATUSES,
  CreateBookingSchema,
  createBookingCore,
} from "@/lib/bookings/core";
import { listCustomerBookings } from "@/lib/dashboard/customer";

/**
 * `/api/v1/bookings` — the customer's own bookings, and raising a new one.
 *
 * The first two endpoints of the HTTP API, and the pattern the rest copy:
 *
 *   • **A read calls the query function the dashboard already calls.**
 *     `listCustomerBookings` is the same function the overview renders from, so
 *     there is no second definition of what a customer's booking list is and no
 *     way for the two to disagree. Reads needed no refactor to be exposed.
 *
 *   • **A write calls the core, never the Server Action.** `createBookingCore`
 *     holds the money ordering and the plan accounting; the form action in
 *     `@/lib/bookings/actions` is a sibling caller of the same function, not
 *     something this route goes through.
 *
 * Authorisation is the session cookie plus RLS, resolved in `requireApiUser()`.
 * Nothing here re-checks ownership, because `listCustomerBookings` scopes by
 * `customer_id` and the policies scope it again underneath.
 */

export const dynamic = "force-dynamic";

/**
 * `?status=` may repeat or be comma-separated — `?status=requested&status=accepted`
 * and `?status=requested,accepted` mean the same thing. Both spellings are common
 * enough in the wild that rejecting either would be a pointless 422.
 *
 * An unknown status is a 422 rather than being ignored. Silently dropping it
 * would answer a filtered question with an unfiltered list, which a caller has no
 * way to notice.
 */
const StatusFilterSchema = z.array(z.enum(BOOKING_STATUSES));

/** Same default as the dashboard; the ceiling exists because the API has no pager yet. */
const LIMIT = { fallback: 50, max: 200 };

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const params = request.nextUrl.searchParams;

    const statuses = parseWith(
      StatusFilterSchema,
      params
        .getAll("status")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const bookings = await listCustomerBookings(user.id, {
      statuses,
      limit: readLimit(params, LIMIT),
    });

    return ok(bookings);
  });
}

/**
 * Raise a request. 201 with the id and the human reference.
 *
 * `requireApiUser()` runs even though `createBookingCore` resolves the session
 * itself: reaching the core without one costs a wasted fee lookup and answers
 * 401 from inside a function whose job is bookings. Refusing at the door is both
 * cheaper and where a reader expects to find it.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await requireApiUser();

    const input = await readJson(request, CreateBookingSchema);
    const booking = unwrap(await createBookingCore(input));

    return created(booking);
  });
}
