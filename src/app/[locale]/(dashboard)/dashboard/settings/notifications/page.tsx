import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";

import { NotificationPrefsForm } from "@/components/dashboard/notification-prefs-form";
import { SectionHeader } from "@/components/dashboard/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationPrefs, getProfile } from "@/lib/dashboard/settings";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings/notifications");

  // `getNotificationPrefs` never returns null — the row is missing for every
  // account created before the migration, so the defaults are the normal case
  // rather than an error path.
  const [prefs, profile] = await Promise.all([
    getNotificationPrefs(user.id),
    getProfile(user.id),
  ]);

  const hasPhone = Boolean(profile?.phone?.trim());

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="What we send you" />

        <NotificationPrefsForm
          values={{
            emailBookings: prefs.email_bookings,
            emailMessages: prefs.email_messages,
            emailReminders: prefs.email_reminders,
            emailMarketing: prefs.email_marketing,
            smsReminders: prefs.sms_reminders,
          }}
          hasPhone={hasPhone}
        />
      </section>

      {!hasPhone ? (
        <p className="flex items-start gap-2 rounded-machined border border-hairline bg-bench-sunk/60 px-3 py-2.5 text-sm leading-relaxed text-steel">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          <span>
            Text reminders need a phone number.{" "}
            <Link
              href="/dashboard/settings/profile"
              className="font-medium text-enamel underline decoration-hairline underline-offset-2 transition-colors hover:text-signal hover:decoration-signal"
            >
              Add one to your profile
            </Link>{" "}
            and the switch above turns on.
          </span>
        </p>
      ) : null}

      <p className="max-w-prose text-sm leading-relaxed text-steel">
        Everything here is a copy of what already appears in your dashboard — turning
        an email off never means missing an update, only that you have to come and
        look for it. Notifications about a dispute or a refund are always sent, because
        they carry deadlines you can lose money by missing.
      </p>
    </div>
  );
}
