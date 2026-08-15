import "server-only";

import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { formatDateLong, formatSlot } from "@/lib/format";
import { notifyUser } from "@/lib/notifications/dispatch";
import { getRecipient } from "@/lib/notifications/recipients";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/site";

interface ReminderResult {
  appointmentReminders: number;
  warrantyReminders: number;
}

/**
 * Send scheduled reminder emails:
 *   • Confirmed bookings starting in the next 24 hours
 *   • Completed bookings whose warranty expires in 3 days
 */
export async function sendScheduledReminders(): Promise<ReminderResult> {
  const admin = createAdminClient();
  const now = Date.now();

  let appointmentReminders = 0;
  let warrantyReminders = 0;

  const { data: confirmed } = await admin
    .from("bookings")
    .select("id, reference, slot, customer_id, fixer_id, status")
    .eq("status", "confirmed");

  for (const booking of confirmed ?? []) {
    const start = slotStart(booking.slot);
    const end = slotEnd(booking.slot);
    if (!start || !end) continue;

    const hoursUntil = (start.getTime() - now) / (60 * 60 * 1000);
    if (hoursUntil < 0 || hoursUntil > 24) continue;

    const alreadySent = await hasReminder(booking.id, "booking_reminder");
    if (alreadySent) continue;

    const recipient = await getRecipient(booking.customer_id);
    const { data: shop } = await admin
      .from("fixer_profiles")
      .select("shop_name, timezone")
      .eq("id", booking.fixer_id)
      .maybeSingle();

    const when = formatSlot(start, end, shop?.timezone ?? recipient.timezone);

    await notifyUser({
      userId: booking.customer_id,
      kind: "booking_reminder",
      title: "Appointment tomorrow",
      body: `${shop?.shop_name ?? "Your shop"} — ${booking.reference} at ${when}.`,
      href: `/dashboard/bookings/${booking.reference}`,
      bookingId: booking.id,
      prefGate: "email_reminders",
      email: {
        preheader: `Reminder: your repair is coming up.`,
        title: "Appointment reminder",
        intro: `Hi ${recipient.name}, this is a reminder about your upcoming repair.`,
        bodyLines: [
          `Reference: ${booking.reference}`,
          `Shop: ${shop?.shop_name ?? "Your repair shop"}`,
          `When: ${when}`,
        ],
        ctaLabel: "View booking",
        ctaUrl: absoluteUrl(`/dashboard/bookings/${booking.reference}`),
      },
    });

    appointmentReminders += 1;
  }

  const in3days = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: warranties } = await admin
    .from("bookings")
    .select("id, reference, customer_id, warranty_expires_at, status")
    .eq("status", "completed")
    .not("warranty_expires_at", "is", null)
    .lte("warranty_expires_at", in3days)
    .gte("warranty_expires_at", new Date(now).toISOString());

  for (const booking of warranties ?? []) {
    const alreadySent = await hasReminder(booking.id, "warranty_expiring");
    if (alreadySent) continue;

    const recipient = await getRecipient(booking.customer_id);
    const expires = booking.warranty_expires_at
      ? formatDateLong(booking.warranty_expires_at, recipient.timezone)
      : "soon";

    await notifyUser({
      userId: booking.customer_id,
      kind: "warranty_expiring",
      title: "Warranty ending soon",
      body: `The warranty on ${booking.reference} ends ${expires}.`,
      href: `/dashboard/bookings/${booking.reference}`,
      bookingId: booking.id,
      prefGate: "email_reminders",
      email: {
        preheader: `Warranty ending on ${booking.reference}.`,
        title: "Warranty ending soon",
        intro: `Hi ${recipient.name}, the warranty window on your repair is closing soon.`,
        bodyLines: [`Reference: ${booking.reference}`, `Warranty ends: ${expires}`],
        ctaLabel: "View booking",
        ctaUrl: absoluteUrl(`/dashboard/bookings/${booking.reference}`),
        footer: "Raise a claim from your booking page if anything is not right.",
      },
    });

    warrantyReminders += 1;
  }

  return { appointmentReminders, warrantyReminders };
}

async function hasReminder(bookingId: string, kind: "booking_reminder" | "warranty_expiring"): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("kind", kind)
    .not("email_sent_at", "is", null);

  return (count ?? 0) > 0;
}
