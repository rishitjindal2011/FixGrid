import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/dashboard/notifications";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

/**
 * The notification centre.
 *
 * The bell in the topbar has always linked here; the page simply did not exist,
 * so every click 404'd. Each row links to `href` when the notification carries
 * one — a booking update is only useful if it takes you to the booking.
 */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/notifications");

  const notifications = await listNotifications(user.id, 50);
  const unread = notifications.filter((n) => n.read_at === null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your account"
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread of the last ${notifications.length}.`
            : "Booking updates, messages and warranty reminders."
        }
        actions={
          notifications.length > 0 ? <MarkAllReadButton disabled={unread === 0} /> : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          description="When a shop replies to a request, updates a repair or your warranty is about to lapse, it shows up here."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/discover">Find an expert</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => {
            const isUnread = notification.read_at === null;

            const body = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "text-sm",
                      isUnread ? "font-medium text-enamel" : "text-steel",
                    )}
                  >
                    {notification.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-steel-soft">
                    {formatRelative(notification.created_at)}
                  </span>
                </span>
                {notification.body ? (
                  <span className="mt-1 block text-sm text-steel">{notification.body}</span>
                ) : null}
              </>
            );

            return (
              <li key={notification.id}>
                {notification.href ? (
                  <Link
                    href={notification.href}
                    className={cn(
                      "block rounded-machined border px-4 py-3 shadow-bench transition-shadow hover:shadow-lift",
                      isUnread
                        ? "border-signal/30 bg-signal-wash"
                        : "border-hairline bg-chalk",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    className={cn(
                      "rounded-machined border px-4 py-3 shadow-bench",
                      isUnread
                        ? "border-signal/30 bg-signal-wash"
                        : "border-hairline bg-chalk",
                    )}
                  >
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
