import "server-only";

import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import type { TransitionActor } from "@/lib/bookings/machine";
import { formatMoney, formatSlot } from "@/lib/format";
import { queueNotification, type NotifyUserInput } from "@/lib/notifications/dispatch";
import { getRecipient } from "@/lib/notifications/recipients";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { BookingStatus } from "@/lib/types/marketplace";

interface BookingContext {
  id: string;
  reference: string;
  status: BookingStatus;
  slot: string;
  customer_id: string;
  fixer_id: string;
  quoted_amount: number | null;
  currency: string;
  device_details: string | null;
  shop_name: string;
  shop_owner_id: string | null;
  shop_timezone: string;
}

async function loadBookingContext(bookingId: string): Promise<BookingContext | null> {
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      "id, reference, status, slot, customer_id, fixer_id, quoted_amount, currency, device_details",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    console.error("[notifications] booking load failed", error?.message);
    return null;
  }

  const { data: shop } = await admin
    .from("fixer_profiles")
    .select("shop_name, owner_id, timezone")
    .eq("id", booking.fixer_id)
    .maybeSingle();

  return {
    ...booking,
    shop_name: shop?.shop_name ?? "the shop",
    shop_owner_id: shop?.owner_id ?? null,
    shop_timezone: shop?.timezone?.trim() || "Europe/London",
  };
}

function slotLabel(slot: string, timezone: string): string {
  const start = slotStart(slot);
  const end = slotEnd(slot);
  if (!start || !end) return "Time to be confirmed";
  return formatSlot(start, end, timezone);
}

function bookingUrl(reference: string, forShop: boolean): string {
  return absoluteUrl(
    forShop ? `/dashboard/expert/requests/${encodeURIComponent(reference)}` : `/dashboard/bookings/${encodeURIComponent(reference)}`,
  );
}

/** Customer submitted a new repair request. */
export async function notifyBookingCreated(bookingId: string): Promise<void> {
  const booking = await loadBookingContext(bookingId);
  if (!booking) return;

  const slot = slotLabel(booking.slot, booking.shop_timezone);
  const customer = await getRecipient(booking.customer_id);

  queueNotification({
    userId: booking.customer_id,
    kind: "booking_requested",
    title: "Request sent",
    body: `Your repair request ${booking.reference} was sent to ${booking.shop_name}.`,
    href: `/dashboard/bookings/${booking.reference}`,
    bookingId: booking.id,
    email: {
      preheader: `We sent your repair request to ${booking.shop_name}.`,
      title: "Your repair request is in",
      intro: `Hi ${customer.name}, we've sent your booking request to ${booking.shop_name}.`,
      bodyLines: [
        `Reference: ${booking.reference}`,
        `Appointment: ${slot}`,
        booking.device_details ? `Device: ${booking.device_details}` : "",
      ].filter(Boolean),
      ctaLabel: "View booking",
      ctaUrl: bookingUrl(booking.reference, false),
    },
  });

  if (!booking.shop_owner_id) return;

  queueNotification({
    userId: booking.shop_owner_id,
    kind: "booking_requested",
    title: "New repair request",
    body: `${customer.name} requested a repair — ${booking.reference}.`,
    href: `/dashboard/expert/requests/${booking.reference}`,
    bookingId: booking.id,
    email: {
      preheader: `New repair request ${booking.reference}.`,
      title: "New repair request",
      intro: `You have a new repair request from ${customer.name}.`,
      bodyLines: [
        `Reference: ${booking.reference}`,
        `Appointment: ${slot}`,
        booking.device_details ? `Device: ${booking.device_details}` : "",
      ].filter(Boolean),
      ctaLabel: "Review request",
      ctaUrl: bookingUrl(booking.reference, true),
    },
  });
}

/** Status changed on an existing booking. */
export async function notifyBookingTransition(params: {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  actor: TransitionActor;
}): Promise<void> {
  const booking = await loadBookingContext(params.bookingId);
  if (!booking) return;

  const slot = slotLabel(booking.slot, booking.shop_timezone);
  const customer = await getRecipient(booking.customer_id);
  const quote =
    booking.quoted_amount !== null
      ? formatMoney(booking.quoted_amount, booking.currency)
      : null;

  type BookingNotifyInput = Omit<NotifyUserInput, "userId" | "bookingId">;

  const notifyCustomer = (input: BookingNotifyInput) => {
    queueNotification({ ...input, userId: booking.customer_id, bookingId: booking.id });
  };

  const notifyShop = (input: BookingNotifyInput) => {
    if (!booking.shop_owner_id) return;
    queueNotification({ ...input, userId: booking.shop_owner_id, bookingId: booking.id });
  };

  switch (params.to) {
    case "accepted":
      notifyCustomer({
        kind: "booking_accepted",
        title: "Quote ready",
        body: `${booking.shop_name} sent a quote for ${booking.reference}.`,
        href: `/dashboard/bookings/${booking.reference}`,
        prefGate: "email_bookings",
        email: {
          preheader: `${booking.shop_name} sent you a quote.`,
          title: "Your quote is ready",
          intro: `Hi ${customer.name}, ${booking.shop_name} has quoted your repair.`,
          bodyLines: [
            `Reference: ${booking.reference}`,
            quote ? `Quote: ${quote}` : "",
            `Appointment: ${slot}`,
          ].filter(Boolean),
          ctaLabel: "Review quote",
          ctaUrl: bookingUrl(booking.reference, false),
        },
      });
      break;

    case "confirmed":
      notifyCustomer({
        kind: "booking_confirmed",
        title: "Booking confirmed",
        body: `${booking.reference} is confirmed for ${slot}.`,
        href: `/dashboard/bookings/${booking.reference}`,
        prefGate: "email_bookings",
        email: {
          preheader: `Your repair is confirmed for ${slot}.`,
          title: "Booking confirmed",
          intro: `Hi ${customer.name}, your repair with ${booking.shop_name} is confirmed.`,
          bodyLines: [`Reference: ${booking.reference}`, `When: ${slot}`, quote ? `Price: ${quote}` : ""].filter(Boolean),
          ctaLabel: "View booking",
          ctaUrl: bookingUrl(booking.reference, false),
        },
      });
      break;

    case "declined":
      notifyCustomer({
        kind: "booking_declined",
        title: "Request declined",
        body: `${booking.shop_name} couldn't take ${booking.reference}.`,
        href: `/dashboard/bookings/${booking.reference}`,
        prefGate: "email_bookings",
        email: {
          preheader: `${booking.shop_name} declined your request.`,
          title: "Request declined",
          intro: `Hi ${customer.name}, ${booking.shop_name} is unable to take this repair.`,
          bodyLines: [`Reference: ${booking.reference}`, `Original slot: ${slot}`],
          ctaLabel: "Find another shop",
          ctaUrl: absoluteUrl("/search"),
        },
      });
      break;

    case "in_progress":
      notifyCustomer({
        kind: "booking_started",
        title: "Repair started",
        body: `${booking.shop_name} has started work on ${booking.reference}.`,
        href: `/dashboard/bookings/${booking.reference}`,
        prefGate: "email_bookings",
        email: {
          preheader: `${booking.shop_name} has started your repair.`,
          title: "Work has started",
          intro: `Hi ${customer.name}, ${booking.shop_name} is now working on your repair.`,
          bodyLines: [`Reference: ${booking.reference}`],
          ctaLabel: "View booking",
          ctaUrl: bookingUrl(booking.reference, false),
        },
      });
      break;

    case "completed":
      notifyCustomer({
        kind: "booking_completed",
        title: "Repair complete",
        body: `${booking.shop_name} marked ${booking.reference} as complete.`,
        href: `/dashboard/bookings/${booking.reference}`,
        prefGate: "email_bookings",
        email: {
          preheader: `Your repair ${booking.reference} is complete.`,
          title: "Repair complete",
          intro: `Hi ${customer.name}, ${booking.shop_name} has finished your repair.`,
          bodyLines: [`Reference: ${booking.reference}`],
          ctaLabel: "View booking",
          ctaUrl: bookingUrl(booking.reference, false),
          footer: "Your warranty window is now open if anything isn't right.",
        },
      });
      break;

    case "cancelled_customer":
      notifyShop({
        kind: "booking_cancelled",
        title: "Booking cancelled",
        body: `${customer.name} cancelled ${booking.reference}.`,
        href: `/dashboard/expert/requests/${booking.reference}`,
        email: {
          preheader: `Booking ${booking.reference} was cancelled.`,
          title: "Booking cancelled",
          intro: `${customer.name} cancelled booking ${booking.reference}.`,
          bodyLines: [`Original slot: ${slot}`],
          ctaLabel: "View request",
          ctaUrl: bookingUrl(booking.reference, true),
        },
      });
      break;

    case "cancelled_shop":
    case "no_show":
      notifyCustomer({
        kind: "booking_cancelled",
        title: params.to === "no_show" ? "Marked as no-show" : "Booking cancelled",
        body: `${booking.shop_name} updated ${booking.reference}.`,
        href: `/dashboard/bookings/${booking.reference}`,
        email: {
          preheader: `Update on booking ${booking.reference}.`,
          title: params.to === "no_show" ? "Appointment missed" : "Booking cancelled",
          intro:
            params.to === "no_show"
              ? `Hi ${customer.name}, ${booking.shop_name} marked your appointment as a no-show.`
              : `Hi ${customer.name}, ${booking.shop_name} cancelled your booking.`,
          bodyLines: [`Reference: ${booking.reference}`, `Slot: ${slot}`],
          ctaLabel: "View booking",
          ctaUrl: bookingUrl(booking.reference, false),
        },
      });
      break;

    default:
      break;
  }
}

export async function notifyRescheduleRequested(params: {
  bookingId: string;
  actor: TransitionActor;
  proposedStart: Date;
  proposedEnd: Date;
  note?: string;
}): Promise<void> {
  const booking = await loadBookingContext(params.bookingId);
  if (!booking) return;

  const proposed = formatSlot(params.proposedStart, params.proposedEnd, booking.shop_timezone);
  const recipientId =
    params.actor === "customer" ? booking.shop_owner_id : booking.customer_id;
  if (!recipientId) return;

  const actorProfile = await getRecipient(
    params.actor === "customer" ? booking.customer_id : booking.shop_owner_id!,
  );

  queueNotification({
    userId: recipientId,
    kind: "booking_rescheduled",
    title: "New time proposed",
    body: `${actorProfile.name} proposed a new time for ${booking.reference}.`,
    href:
      params.actor === "customer"
        ? `/dashboard/expert/requests/${booking.reference}`
        : `/dashboard/bookings/${booking.reference}`,
    bookingId: booking.id,
    prefGate: "email_bookings",
    email: {
      preheader: `New time proposed for ${booking.reference}.`,
      title: "New time proposed",
      intro: `${actorProfile.name} suggested a new appointment time.`,
      bodyLines: [
        `Reference: ${booking.reference}`,
        `Proposed: ${proposed}`,
        params.note ? `Note: ${params.note}` : "",
      ].filter(Boolean),
      ctaLabel: "View booking",
      ctaUrl:
        params.actor === "customer"
          ? bookingUrl(booking.reference, true)
          : bookingUrl(booking.reference, false),
    },
  });
}

export async function notifyNewMessage(params: {
  threadId: string;
  senderId: string;
  preview: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: thread } = await admin
    .from("message_threads")
    .select("id, booking_id, customer_id, fixer_id")
    .eq("id", params.threadId)
    .maybeSingle();

  if (!thread) return;

  const { data: shop } = await admin
    .from("fixer_profiles")
    .select("owner_id, shop_name")
    .eq("id", thread.fixer_id)
    .maybeSingle();

  const recipientId =
    params.senderId === thread.customer_id ? shop?.owner_id : thread.customer_id;
  if (!recipientId || recipientId === params.senderId) return;

  const sender = await getRecipient(params.senderId);
  const { data: booking } = thread.booking_id
    ? await admin.from("bookings").select("reference").eq("id", thread.booking_id).maybeSingle()
    : { data: null };

  const reference = booking?.reference ?? "your booking";
  const href =
    params.senderId === thread.customer_id
      ? `/dashboard/expert/messages/${params.threadId}`
      : `/dashboard/messages/${params.threadId}`;

  queueNotification({
    userId: recipientId,
    kind: "message_received",
    title: "New message",
    body: `${sender.name}: ${params.preview.slice(0, 120)}`,
    href,
    bookingId: thread.booking_id ?? undefined,
    prefGate: "email_messages",
    email: {
      preheader: `New message about ${reference}.`,
      title: "New message",
      intro: `${sender.name} sent you a message about booking ${reference}.`,
      bodyLines: [params.preview.slice(0, 500)],
      ctaLabel: "Open conversation",
      ctaUrl: absoluteUrl(href),
    },
  });
}

export async function notifyDisputeOpened(bookingId: string): Promise<void> {
  const booking = await loadBookingContext(bookingId);
  if (!booking || !booking.shop_owner_id) return;

  const customer = await getRecipient(booking.customer_id);

  queueNotification({
    userId: booking.shop_owner_id,
    kind: "dispute_opened",
    title: "Warranty claim opened",
    body: `${customer.name} opened a claim on ${booking.reference}.`,
    href: `/dashboard/expert/disputes`,
    bookingId: booking.id,
    email: {
      preheader: `Claim opened on ${booking.reference}.`,
      title: "Warranty claim opened",
      intro: `${customer.name} has opened a warranty claim on booking ${booking.reference}.`,
      bodyLines: [`Reference: ${booking.reference}`],
      ctaLabel: "View disputes",
      ctaUrl: absoluteUrl("/dashboard/expert/disputes"),
      footer: `${SITE_NAME} will review the claim and be in touch.`,
    },
  });
}

export async function notifyQuoteSent(bookingId: string): Promise<void> {
  await notifyBookingTransition({ bookingId, from: "requested", to: "accepted", actor: "shop" });
}
