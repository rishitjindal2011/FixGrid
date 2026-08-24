import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  Inbox,
  Scale,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

import { MiniCalendar } from "@/components/dashboard/expert/mini-calendar";
import { NoticeDialog } from "@/components/dashboard/expert/notice-dialog";
import { ExpertOnboardingPopup } from "@/components/dashboard/expert/onboarding-popup";
import {
  PendingCountBadge,
  PendingRequestsPanel,
} from "@/components/dashboard/expert/pending-requests-panel";
import { QuickActions } from "@/components/dashboard/expert/quick-actions";
import {
  ShopStatusBanner,
  ShopStatusPill,
} from "@/components/dashboard/expert/shop-status-banner";
import { TodaySchedule } from "@/components/dashboard/expert/today-schedule";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import {
  getExpertStats,
  getTodaySchedule,
  listExpertBookings,
  listPendingRequests,
} from "@/lib/dashboard/expert";
import { getShopStatus, listUnreadNotices } from "@/lib/dashboard/shop-status";
import { countOpenShopDisputes } from "@/lib/dashboard/warranty";
import { formatMoneyRounded } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop dashboard",
  robots: { index: false, follow: false },
};

/**
 * The shop owner's home screen.
 *
 * Ordered by what needs a human: unanswered requests first, then today's bench,
 * then the month and the tools. Everything else a shop does — earnings,
 * clients, services — has its own page and is reachable from here rather than
 * summarised twice.
 *
 * All four reads go out together. They have no interdependency, and four
 * sequential awaits would be four serialised round-trips for one screen. `now`
 * is captured once and threaded down so the waiting times, the calendar's idea
 * of today and the action gating cannot disagree.
 */
export default async function ExpertDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this is a narrowing step rather than a second query. A null shop cannot
  // reach here — the gate renders the claim screen instead of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();
  const { from, to } = monthWindow(shop.timezone, now);

  const [stats, pendingRequests, todayJobs, monthBookings, status, notices, openDisputes, profileRes] =
    await Promise.all([
      getExpertStats(shop.id, now),
      listPendingRequests(shop.id),
      getTodaySchedule(shop.id, shop.timezone, now),
      listExpertBookings(shop.id, {
        statuses: ["confirmed", "in_progress", "completed", "closed"],
        from,
        to,
        limit: 200,
      }),
      getShopStatus(shop.id),
      listUnreadNotices(shop.id),
      countOpenShopDisputes(shop.id),
      (await createClient()).from("fixer_profiles").select("photos, bio").eq("id", shop.id).single(),
    ]);

  const profile = profileRes.data;

  return (
    <div className="flex flex-col gap-6">
      {/*
        Above the header, not below it. A suspended or unreviewed shop is the
        single most important fact on this screen — the owner in that state is
        looking at zeroes everywhere and has no other way to learn why.
      */}
      {status ? <ShopStatusBanner status={status} /> : null}

      {/* Modal, and unacknowledged notices reappear until dismissed. An admin
          writing to one shop expects it to be read, not lost in a bell menu. */}
      <NoticeDialog notices={notices} />
      
      {profile && (
        <ExpertOnboardingPopup
          hasPhotos={profile.photos && profile.photos.length > 0}
          hasBio={!!profile.bio}
          shopSlug={shop.slug}
        />
      )}

      <PageHeader
        eyebrow="Your shop"
        title={shop.shopName}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* The signature status strip. A shop that is open for bookings
                right now is exactly the live state it was built for. */}
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "status-dot",
                  shop.acceptsBookings ? "status-dot--open" : "status-dot--closed",
                )}
              />
              <span className={shop.acceptsBookings ? "text-verdigris" : "text-steel"}>
                {shop.acceptsBookings ? "Accepting bookings" : "Not accepting bookings"}
              </span>
            </span>

            {/* Visibility first, trust second. Whether customers can find you
                is the more consequential fact, and the old "Not yet verified"
                badge was routinely misread as meaning exactly that. */}
            {status ? <ShopStatusPill status={status} /> : null}

            {shop.verified ? (
              <Badge variant="verified">
                <BadgeCheck aria-hidden />
                Verified
              </Badge>
            ) : null}

            {stats.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Star aria-hidden className="size-3.5 text-signal" />
                <span className="font-mono tabular-nums text-enamel">
                  {stats.ratingAvg.toFixed(1)}
                </span>
                <span className="text-steel-soft">
                  ({stats.ratingCount} {stats.ratingCount === 1 ? "review" : "reviews"})
                </span>
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/expert/requests">
                <Inbox aria-hidden />
                Requests
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/expert/${shop.slug}`}>
                <ExternalLink aria-hidden />
                Public page
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Pending requests"
          value={stats.pendingRequests}
          hint={stats.pendingRequests > 0 ? "Waiting on your answer" : "Nothing waiting"}
          icon={Inbox}
          href="/dashboard/expert/requests"
          // The one tile that earns signal orange: it is the only number here
          // that means somebody has to do something.
          emphasis={stats.pendingRequests > 0}
        />
        <StatTile
          label="Jobs today"
          value={stats.todayJobs}
          hint={`${stats.activeJobs} live in total`}
          icon={CalendarClock}
          href="/dashboard/expert/schedule"
        />
        <StatTile
          label="Earnings this month"
          value={formatMoneyRounded(stats.earningsThisMonthPence)}
          hint={`${stats.completedThisMonth} completed`}
          icon={Wallet}
          href="/dashboard/expert/earnings"
        />
        <StatTile
          label="Warranty claims"
          value={openDisputes}
          hint={openDisputes > 0 ? "Open against your shop" : "None open"}
          icon={Scale}
          href="/dashboard/expert/disputes"
          // Signal for the same reason as pending requests: an open claim is
          // waiting on this shop to answer, not a statistic about it.
          emphasis={openDisputes > 0}
        />
        <StatTile
          label="In warranty hold"
          value={formatMoneyRounded(stats.inWarrantyHoldPence)}
          hint={`${formatMoneyRounded(stats.availableForPayoutPence)} ready to pay out`}
          icon={ShieldCheck}
          href="/dashboard/expert/earnings"
        />
      </div>

      <section>
        <SectionHeader
          title="Needs your answer"
          action={
            <span className="flex items-center gap-3">
              <PendingCountBadge count={pendingRequests.length} />
              <Link
                href="/dashboard/expert/requests"
                className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
              >
                View all
              </Link>
            </span>
          }
        />
        <PendingRequestsPanel
          requests={pendingRequests.slice(0, 4)}
          timezone={shop.timezone}
          now={now}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader
            title="Today"
            action={
              <Link
                href="/dashboard/expert/schedule"
                className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
              >
                Full schedule
              </Link>
            }
          />
          <TodaySchedule bookings={todayJobs} timezone={shop.timezone} now={now} />
        </section>

        <section className="lg:col-span-2">
          <SectionHeader title="This month" />
          <MiniCalendar bookings={monthBookings} timezone={shop.timezone} now={now} />
        </section>
      </div>

      <section>
        <SectionHeader title="Quick actions" />
        <QuickActions slug={shop.slug} />
      </section>
    </div>
  );
}

/**
 * UTC bounds that comfortably contain the shop's current calendar month.
 *
 * A day of slack either side absorbs whatever the shop's UTC offset is, so the
 * range never clips a job on the 1st or the 31st. Being generous is free here:
 * `slot` is filtered with `overlaps`, and the calendar buckets what comes back
 * by day key in the shop's own zone anyway, so extra rows land outside the grid
 * rather than on the wrong square.
 */
function monthWindow(timezone: string, now: Date): { from: Date; to: Date } {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const parts = key.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  return {
    from: new Date(Date.UTC(year, month - 1, 0)),
    to: new Date(Date.UTC(year, month, 2)),
  };
}
