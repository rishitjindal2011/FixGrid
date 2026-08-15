import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPrefsRow } from "@/lib/types/marketplace";

export interface RecipientProfile {
  userId: string;
  email: string | null;
  name: string;
  timezone: string;
  prefs: NotificationPrefsRow;
}

const DEFAULT_PREFS: NotificationPrefsRow = {
  user_id: "",
  email_bookings: true,
  email_messages: true,
  email_reminders: true,
  email_marketing: false,
  sms_reminders: false,
  created_at: "",
  updated_at: "",
};

/** Load email, display name, timezone, and notification prefs for one user. */
export async function getRecipient(userId: string): Promise<RecipientProfile> {
  const admin = createAdminClient();

  const [{ data: authData }, { data: profile }, { data: prefs }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("users").select("display_name, full_name, timezone").eq("id", userId).maybeSingle(),
    admin.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const name =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    authData.user?.email?.split("@")[0] ||
    "there";

  return {
    userId,
    email: authData.user?.email ?? null,
    name,
    timezone: profile?.timezone?.trim() || "Europe/London",
    prefs: prefs ?? { ...DEFAULT_PREFS, user_id: userId },
  };
}
