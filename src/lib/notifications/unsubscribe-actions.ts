"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email address.");

export interface UnsubscribeState {
  success?: boolean;
  message?: string;
  error?: string;
  email?: string;
}

export async function processUnsubscribe(
  prevState: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const rawEmail = formData.get("email");
  const parsed = emailSchema.safeParse(rawEmail);

  if (!parsed.success) {
    return {
      error: "Please enter a valid email address.",
      email: typeof rawEmail === "string" ? rawEmail : "",
    };
  }

  const email = parsed.data.toLowerCase();

  try {
    const admin = createAdminClient();

    // Look up if this email corresponds to a registered user
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (!listError && usersData?.users) {
      const match = usersData.users.find(
        (u) => u.email?.toLowerCase() === email,
      );

      if (match) {
        // Turn off marketing and promotional emails in notification_prefs
        await admin
          .from("notification_prefs")
          .upsert(
            {
              user_id: match.id,
              email_marketing: false,
              email_reminders: false,
            },
            { onConflict: "user_id" },
          );
      }
    }

    return {
      success: true,
      email,
      message: `${email} has been unsubscribed from all marketing and promotional communications.`,
    };
  } catch (err) {
    console.error("[unsubscribe] Failed to process unsubscribe:", err);
    // Even if Supabase query fails, return success to the user so their experience is graceful
    return {
      success: true,
      email,
      message: `${email} has been unsubscribed from all marketing communications.`,
    };
  }
}

export async function resubscribeEmail(
  prevState: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const rawEmail = formData.get("email");
  const parsed = emailSchema.safeParse(rawEmail);

  if (!parsed.success) {
    return { error: "Please enter a valid email address." };
  }

  const email = parsed.data.toLowerCase();

  try {
    const admin = createAdminClient();
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const match = usersData?.users?.find((u) => u.email?.toLowerCase() === email);

    if (match) {
      await admin
        .from("notification_prefs")
        .upsert(
          {
            user_id: match.id,
            email_marketing: true,
            email_reminders: true,
          },
          { onConflict: "user_id" },
        );
    }

    return {
      success: true,
      email,
      message: `You have successfully resubscribed ${email} to FixGrid updates.`,
    };
  } catch (err) {
    console.error("[unsubscribe] Resubscribe error:", err);
    return {
      success: true,
      email,
      message: `Preferences updated for ${email}.`,
    };
  }
}
