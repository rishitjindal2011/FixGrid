import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarRange,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCount, formatMoney, formatMoneyRounded, formatRelative } from "@/lib/format";
import { getPlatformStats, getRecentActivity, type ActivityKind } from "@/lib/queries/platform";
import { getTimeSeriesData } from "@/lib/dashboard/analytics";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

/**
 * `force-dynamic` because a cached operations dashboard is actively misleading:
 * you approve a claim, come back to the overview, and it still says three
 * pending. Most of the numbers below are `head: true` counts, so the cost of
 * being always-live is small.
 */
export const dynamic = "force-dynamic";

const ACTIVITY_ICONS: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  booking: CalendarRange,
  claim: ShieldCheck,
  dispute: Scale,
  payout: Banknote,
};

export default async function OverviewPage() {
  // One render pass, one instant. Every relative timestamp below is measured
  // against this, so two rows written a second apart cannot disagree about now.
  const now = new Date();

  const [stats, activity, timeSeries] = await Promise.all([
    getPlatformStats(),
    getRecentActivity(8),
    getTimeSeriesData(30)
  ]);

  const activeBookings = ACTIVE_BOOKING_STATUSES.reduce(
    (total, status) => total + stats.bookingsByStatus[status],
    0,
  );

  /*
   * The three queues that mean a human has to do something. Rendered even when
   * every count is zero — "nothing is waiting" is the answer an operator opens
   * this page for, and hiding the panel would make it indistinguishable from a
   * panel that failed to load.
   */
  const attention = [
    {
      label: "Pending claims",
      count: stats.pendingClaims,
      href: "/claims?status=pending",
      icon: ShieldCheck,
      blurb: "Someone is asking for control of a shop listing.",
    },
    {
      label: "Open disputes",
      count: stats.openDisputes,
      href: "/disputes",
      icon: Scale,
      blurb: "A job the customer and the shop cannot settle between them.",
    },
    {
      label: "Failed payouts",
      count: stats.failedPayouts,
      href: "/payouts?status=failed",
      icon: Banknote,
      blurb: "Money owed to a shop that the provider rejected.",
    },
  ];

  const clear = attention.every((row) => row.count === 0);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Platform health"
        description="Every shop, customer and booking on the marketplace. Counts are live on each load."
      />

      {/* ── Needs attention ────────────────────────────────────────────────
          First, above the vanity metrics. Gross volume is interesting; a
          two-week-old unanswered claim is the reason this console exists. */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="mb-3 text-lg">
          Needs attention
        </h2>

        {clear ? (
          <Card className="flex items-center gap-3 p-4">
            <span className="status-dot status-dot--open" aria-hidden />
            <p className="text-sm text-steel">
              Nothing is waiting. No pending claims, no open disputes, no failed payouts.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map(({ label, count, href, icon: Icon, blurb }) => {
              const waiting = count > 0;

              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "group flex items-start gap-3 rounded-machined border p-4 shadow-bench transition-colors",
                    waiting
                      ? "border-signal/30 bg-signal-wash hover:border-signal"
                      : "border-hairline bg-chalk hover:border-steel-soft",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", waiting ? "text-signal" : "text-steel-soft")}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow">{label}</p>
                    <p
                      className={cn(
                        "mt-2 font-mono text-display-sm leading-none tabular-nums",
                        waiting ? "text-signal" : "text-steel-soft",
                      )}
                    >
                      {formatCount(count)}
                    </p>
                    <p className="mt-2 text-sm leading-snug text-steel">{blurb}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Marketplace ────────────────────────────────────────────────────── */}
      <section aria-labelledby="marketplace-heading" className="mt-8">
        <h2 id="marketplace-heading" className="mb-3 text-lg">
          Marketplace
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Customers"
            value={formatCount(stats.customers)}
            href="/customers"
            hint="Registered accounts"
          />
          <StatTile
            label="Shops"
            value={formatCount(stats.shops)}
            href="/experts"
            hint={`${formatCount(stats.verifiedShops)} verified`}
          />
          <StatTile
            label="Bookings"
            value={formatCount(stats.totalBookings)}
            href="/bookings"
            hint={`${formatCount(activeBookings)} live right now`}
          />
          <StatTile
            label="Payouts pending"
            value={formatMoneyRounded(stats.payoutsPendingAmount)}
            href="/payouts"
            hint={`${formatCount(stats.payoutsPending)} awaiting settlement`}
          />
        </div>
      </section>

      {/* ── Money ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="money-heading" className="mt-8">
        <h2 id="money-heading" className="mb-3 text-lg">
          Money
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Gross volume"
            value={formatMoney(stats.grossVolume)}
            hint="Captured and partially-refunded payments"
          />
          <StatTile
            label="Platform fees"
            value={formatMoney(stats.platformFees)}
            tone="verdigris"
            hint="The platform's cut of the same payments"
          />
        </div>

        {/*
          Honesty about the aggregate. Both sums are computed by scanning rows,
          which is capped — see SCAN_LIMIT in queries/platform.ts. Saying so is
          better than quietly under-reporting revenue, and this note is the
          signal that it is time to move the aggregate into SQL.
        */}
        {stats.volumeTruncated ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-steel">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            <span>
              These totals are a floor, not a total: there are more rows than one pass reads.
              Move the aggregate into a SQL function to make them exact.
            </span>
          </p>
        ) : null}
      </section>

      {/* ── Real-time Analytics ────────────────────────────────────────────── */}
      <section aria-labelledby="analytics-heading" className="mt-8">
        <h2 id="analytics-heading" className="sr-only">
          Analytics Charts
        </h2>
        <AnalyticsCharts data={timeSeries} />
      </section>

      {/* ── Bookings by status ─────────────────────────────────────────────── */}
      <section aria-labelledby="status-heading" className="mt-8">
        <h2 id="status-heading" className="mb-3 text-lg">
          Bookings by status
        </h2>

        {stats.totalBookings === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No bookings yet"
            description="Either nobody has booked a repair, or supabase/migrations/001_marketplace.sql has not been run on this database. Every table this console reads comes from that file."
          />
        ) : (
          <Card className="p-5">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {/*
                Every status, including the zeroes. A dashboard that hides empty
                buckets changes shape as data arrives, and an operator learns the
                layout of this list, not its contents.
              */}
              {(
                Object.entries(stats.bookingsByStatus) as [
                  keyof typeof stats.bookingsByStatus,
                  number,
                ][]
              ).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2 last:border-0"
                >
                  <dt className="min-w-0 truncate text-sm text-steel">
                    {BOOKING_STATUS_LABELS[status]}
                  </dt>
                  <dd
                    className={cn(
                      "shrink-0 font-mono text-sm tabular-nums",
                      count === 0 ? "text-steel-soft" : "text-enamel",
                      // A disputed booking is the only status here that is a queue.
                      status === "disputed" && count > 0 && "text-signal",
                    )}
                  >
                    {formatCount(count)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </section>

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      <section aria-labelledby="activity-heading" className="mt-8">
        <h2 id="activity-heading" className="mb-3 text-lg">
          Recent activity
        </h2>

        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nothing has happened yet"
            description="Bookings, claims, disputes and payouts appear here as they are created. An empty feed on a database that should have data usually means the marketplace migration has not run."
          />
        ) : (
          <Card className="divide-y divide-hairline p-0">
            {activity.map((item) => {
              const Icon = ACTIVITY_ICONS[item.kind];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-bench"
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      item.needsAttention ? "text-signal" : "text-steel-soft",
                    )}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-enamel">{item.title}</p>
                    {item.detail ? (
                      <p className="mt-0.5 truncate text-xs text-steel">{item.detail}</p>
                    ) : null}
                  </div>

                  {item.needsAttention ? (
                    <Badge variant="signal">
                      <span className="status-dot status-dot--live" aria-hidden />
                      Open
                    </Badge>
                  ) : null}

                  {/*
                    `dateTime` carries the machine-readable instant so the
                    rendered "3 days ago" stays inspectable and copyable.
                  */}
                  <time
                    dateTime={item.at}
                    className="shrink-0 font-mono text-xs tabular-nums text-steel-soft"
                  >
                    {formatRelative(item.at, now)}
                  </time>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </>
  );
}
