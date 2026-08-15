import "server-only";

import { sendEmail } from "@/lib/email/client";
import { renderEmailTemplate, renderPlainText, type EmailTemplateInput } from "@/lib/email/templates";
import { getRecipient } from "@/lib/notifications/recipients";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationKind, NotificationPrefsRow } from "@/lib/types/marketplace";

type PrefGate = keyof Pick<
  NotificationPrefsRow,
  "email_bookings" | "email_messages" | "email_reminders" | "email_marketing"
>;

export interface NotifyUserInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  bookingId?: string;
  email: EmailTemplateInput;
  /** When omitted, email is always sent (transactional). */
  prefGate?: PrefGate;
}

/**
 * Insert an in-app notification and send the matching email when allowed.
 * Failures are logged and never thrown — booking writes must not depend on email.
 */
export async function notifyUser(input: NotifyUserInput): Promise<void> {
  const admin = createAdminClient();

  const { data: notification, error: insertError } = await admin
    .from("notifications")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      booking_id: input.bookingId ?? null,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError) {
    console.error("[notifications] insert failed", insertError.message);
    return;
  }

  const recipient = await getRecipient(input.userId);
  if (!recipient.email) return;

  const allowed =
    input.prefGate === undefined ? true : Boolean(recipient.prefs[input.prefGate]);
  if (!allowed) return;

  const html = renderEmailTemplate(input.email);
  const text = renderPlainText(input.email);
  const result = await sendEmail({
    to: recipient.email,
    subject: input.email.title,
    html,
    text,
  });

  if (result.ok && notification?.id) {
    await admin
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", notification.id);
  }
}

/** Fire-and-forget wrapper for server actions. */
export function queueNotification(input: NotifyUserInput): void {
  void notifyUser(input).catch((error) => {
    console.error("[notifications] dispatch failed", error);
  });
}
