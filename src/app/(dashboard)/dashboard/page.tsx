import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Heart,
  MessagesSquare,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";

import { NextBookingPanel } from "@/components/dashboard/next-booking";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BookingCard } from "@/components/dashboard/booking-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { SavedExpertList } from "@/components/dashboard/saved-experts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCustomerStats,
  getNextBooking,
  listCustomerActivity,
  listCustomerBookings,
  listSavedExperts,
} from "@/lib/dashboard/customer";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The customer's home screen.
 *
 * Every read happens here, in one `Promise.all`, and the pieces below are pure
 * presentation. That is what keeps the page a single round-trip: five sequential
 * awaits would be five serialised database calls for data that has no
 * interdependency.
 *
 * `now` is captured once and threaded down. Each component calling
 * `new Date()` for itself would let the countdown, the relative timestamps and
 * the warranty maths disagree by a few milliseconds — harmless in effect, but it
 * also means a server render and its hydration can't be compared.
 */
export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard");

  const now = new Date();

  const [nextBooking, stats, activeBookings, activity, savedExperts] = await Promise.all([
    getNextBooking(user.id, now),
    getCustomerStats(user.id, now),
    listCustomerBookings(user.id, { statuses: ACTIVE_BOOKING_STATUSES, limit: 4 }),
    listCustomerActivity(user.id, 6),
    listSavedExperts(user.id, 4),
  ]);

  const firstName = user.displayName.split(/\s+/)[0] ?? user.displayName;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title={`Hello, ${firstName}`}
        description="Your repairs, your shops and anything waiting on you — all in one place."
        actions={
          <>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/discover">
                <Search aria-hidden />
                Find an expert
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/bookings">
                <CalendarDays aria-hidden />
                All bookings
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active"
          value={stats.active}
          hint="Bookings on the go"
          icon={CalendarCheck}
          href="/dashboard/bookings"
        />
        <StatTile
          label="Awaiting reply"
          value={stats.awaitingShop}
          hint={stats.awaitingShop === 1 ? "Request sent" : "Requests sent"}
          icon={Clock}
          href="/dashboard/bookings"
          emphasis={stats.awaitingShop > 0}
        />
        <StatTile
          label="In warranty"
          value={stats.inWarranty}
          hint="Covered right now"
          icon={ShieldCheck}
          href="/dashboard/warranty"
        />
        <StatTile
          label="Completed"
          value={stats.completed}
          hint="Repairs done"
          icon={Star}
          href="/dashboard/reviews"
        />
      </div>

      <NextBookingPanel booking={nextBooking} now={now} />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader
            title="Active bookings"
            action={
              <Link
                href="/dashboard/bookings"
                className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
              >
                View all
              </Link>
            }
          />

          {activeBookings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {activeBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nothing on the bench"
              description="When you book a repair it shows up here, from request through to warranty."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/discover">Find an expert</Link>
                </Button>
              }
            />
          )}
        </section>

        <section className="lg:col-span-2">
          <SectionHeader title="Recent activity" />
          <ActivityFeed entries={activity} now={now} />
        </section>
      </div>

      <section>
        <SectionHeader
          title="Saved experts"
          action={
            <Link
              href="/dashboard/discover"
              className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
            >
              Browse all
            </Link>
          }
        />
        {savedExperts.length > 0 ? (
          <SavedExpertList experts={savedExperts} />
        ) : (
          <EmptyState
            icon={Heart}
            title="No saved shops yet"
            description="Save the shops you trust and they will be one tap away next time something breaks."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/discover">Discover experts</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/dashboard/discover"
          icon={Search}
          title="Find an expert"
          description="Search by device, area or rating"
        />
        <QuickAction
          href="/dashboard/messages"
          icon={MessagesSquare}
          title="Message inbox"
          description="Talk to a shop about a job"
        />
        <QuickAction
          href="/dashboard/bookings"
          icon={CalendarDays}
          title="Manage bookings"
          description="Reschedule, cancel or track"
        />
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-bench text-enamel transition-colors group-hover:bg-enamel group-hover:text-bench">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-sm uppercase tracking-wide text-enamel">
          {title}
        </span>
        <span className="block truncate text-xs text-steel">{description}</span>
      </span>
    </Link>
  );
}
