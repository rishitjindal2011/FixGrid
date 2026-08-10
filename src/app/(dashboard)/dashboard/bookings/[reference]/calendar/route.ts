import { getCurrentUser } from "@/lib/auth/session";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { getBookingByReference } from "@/lib/dashboard/booking-detail";
import { SITE_ORIGIN } from "@/lib/site";
import { DELIVERY_MODE_LABELS, type BookingStatus } from "@/lib/types/marketplace";

/**
 * `GET /dashboard/bookings/[reference]/calendar` — the booking as an `.ics`.
 *
 * Written by hand rather than pulled from a package. RFC 5545 for one VEVENT is
 * a dozen properties and three formatting rules, and every one of those rules
 * is a thing a dependency could get wrong on a version bump for a file format
 * that has not changed since 2009.
 *
 * The three rules, since they are the whole of the difficulty:
 *
 *   1. **CRLF, everywhere.** Bare `\n` is not a line break in iCalendar. Some
 *      clients tolerate it; Outlook does not, and the failure is a silently
 *      empty import rather than an error.
 *   2. **Lines fold at 75 octets** — octets, not characters — with the
 *      continuation prefixed by a single space.
 *   3. **UTC with a `Z`.** A floating `DTSTART` means "whatever local time the
 *      reader is in", which for an appointment at a physical counter is exactly
 *      the wrong answer. The slot is an absolute instant; it is written as one.
 *
 * Authorisation is the same read the page uses: `getBookingByReference` filters
 * on `customer_id`, so a reference belonging to someone else resolves to null
 * and 404s here — the URL is guessable, and it must not be a way to enumerate
 * other people's appointments.
 */

/** Auth-dependent by definition; never let this be prerendered or shared. */
export const dynamic = "force-dynamic";

const PRODID = "-//FixGrid//Booking//EN";

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

/** `2026-08-10T09:00:00.000Z` → `20260810T090000Z`. */
function icsStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Escape a TEXT value. Order matters: backslashes first, or the escapes added
 * for the separators would themselves be escaped a second time.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold one content line to 75 octets.
 *
 * Iterated by code point rather than by index so a fold never lands inside a
 * surrogate pair or a multi-byte sequence — an em dash split down the middle
 * produces two invalid bytes and a client that gives up on the file. The
 * continuation carries a leading space, so its own payload budget is one less.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    const budget = chunks.length === 0 ? 75 : 74;

    if (bytes + size > budget) {
      chunks.push(current);
      current = "";
      bytes = 0;
    }

    current += char;
    bytes += size;
  }

  chunks.push(current);
  return chunks.join("\r\n ");
}

/**
 * The event's own status, in the vocabulary calendars understand.
 *
 * A cancelled booking still downloads: someone who already imported the event
 * needs the CANCELLED update to clear it from their calendar, and refusing the
 * download would leave the stale entry in place forever.
 */
function eventStatus(status: BookingStatus): "TENTATIVE" | "CONFIRMED" | "CANCELLED" {
  switch (status) {
    case "requested":
    case "accepted":
      return "TENTATIVE";
    case "confirmed":
    case "in_progress":
    case "completed":
    case "closed":
    case "disputed":
      return "CONFIRMED";
    default:
      return "CANCELLED";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return text("Sign in to download this booking.", 401);

  const { reference } = await params;
  const booking = await getBookingByReference(user.id, reference);

  // Null is "no such reference", "not yours", and "the migration has not been
  // run" alike — all 404, for the same reason the page 404s on all three.
  if (!booking) return text("That booking could not be found.", 404);

  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);

  if (!start || !end) {
    return text("This booking has no confirmed time to add to a calendar yet.", 409);
  }

  const shopName = booking.shop?.shop_name ?? "Repair";
  const summary = `${booking.service?.name ?? booking.device_details ?? "Repair"} — ${shopName}`;

  const location =
    booking.delivery_mode === "in_shop"
      ? (booking.shop?.address ?? shopName)
      : [
          booking.address_line1,
          booking.address_line2,
          booking.address_city,
          booking.address_postcode,
        ]
          .filter((line): line is string => Boolean(line?.trim()))
          .join(", ");

  const url = `${SITE_ORIGIN}/dashboard/bookings/${encodeURIComponent(booking.reference)}`;

  const description = [
    `Booking ${booking.reference} with ${shopName}.`,
    DELIVERY_MODE_LABELS[booking.delivery_mode],
    booking.device_details?.trim() ? `Device: ${booking.device_details.trim()}` : null,
    booking.shop?.contact_phone ? `Shop: ${booking.shop.contact_phone}` : null,
    url,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable across every download of the same booking, so re-importing
    // updates the existing entry instead of duplicating it.
    `UID:${booking.reference}@fixgrid`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${escapeText(url)}`,
    `STATUS:${eventStatus(booking.status)}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  // The trailing CRLF is required: the final line has to be terminated, not
  // merely separated from a line that does not follow it.
  const body = `${lines.map(fold).join("\r\n")}\r\n`;

  // The reference is trigger-generated and already matched uppercase by the
  // read, but the filename lands in a response header — anything outside the
  // known alphabet is dropped rather than trusted.
  const fileName = `${booking.reference.replace(/[^A-Za-z0-9-]/g, "") || "booking"}.ics`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}
