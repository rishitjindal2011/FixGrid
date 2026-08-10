import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, Clock, MessagesSquare, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  ClaimCard,
  ExpiredWarrantyRow,
  WarrantyCard,
} from "@/components/dashboard/warranty-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getWarrantySummary,
  listDisputes,
  listWarranties,
  type DisputeEntry,
} from "@/lib/dashboard/warranty";

export const metadata: Metadata = {
  title: "Warranty and claims",
  robots: { index: false, follow: false },
};

/**
 * Cover, and anything being argued about.
 *
 * Reads run together and `now` is captured once, then threaded into every
 * function that compares against the clock — the summary tiles, the day counts
 * and the progress bars all have to agree, and three components each calling
 * `new Date()` is three chances for "0 days left" to sit next to a bar that
 * still shows a sliver.
 *
 * Every read here degrades to an empty array. Before the migration runs there
 * is no `disputes` table, and a customer who cannot load this page has no way
 * to find out whether their repair is still covered.
 */
export default async function WarrantyPage() {
  const user = await getCurrentUser();
  // The layout gates this already; the redirect is what narrows `user`.
  if (!user) redirect("/login?next=/dashboard/warranty");

  const now = new Date();

  const [summary, warranties, claims] = await Promise.all([
    getWarrantySummary(user.id, now),
    listWarranties(user.id, now),
    listDisputes(user.id),
  ]);

  const active = warranties.filter((entry) => entry.active);
  const expired = warranties.filter((entry) => !entry.active);
  const openClaims = claims.filter((claim) => claim.open);
  const settledClaims = claims.filter((claim) => !claim.open);

  /**
   * The newest claim per booking, so a card that already has one links to it
   * instead of offering to raise a second.
   *
   * Every claim counts, not just the open ones. Resolving a claim does not move
   * the booking out of `disputed` — only an admin or the close-out cron does —
   * and `openDispute` accepts nothing but `completed`. Indexing open claims
   * alone would put a "Raise a claim" button on a settled dispute, and it would
   * fail on submit every time.
   *
   * `listDisputes` returns newest first, so the first write per booking wins.
   */
  const claimByBooking = new Map<string, DisputeEntry>();
  for (const claim of claims) {
    if (!claimByBooking.has(claim.bookingId)) claimByBooking.set(claim.bookingId, claim);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Warranty"
        title="Cover and claims"
        description="Every repair carries a warranty window. While it is open you can raise a claim, and the payment stays held until it is settled."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/bookings">
              <CalendarDays aria-hidden />
              All bookings
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="In warranty"
          value={summary.activeCount}
          hint="Repairs covered right now"
          icon={ShieldCheck}
        />
        <StatTile
          label="Expiring soon"
          value={summary.expiringSoonCount}
          hint="Within 7 days"
          icon={Clock}
          // Live and actionable: the claim window on these shuts this week.
          emphasis={summary.expiringSoonCount > 0}
        />
        <StatTile
          label="Open claims"
          value={summary.openClaims}
          hint="Still being worked"
          icon={MessagesSquare}
          emphasis={summary.openClaims > 0}
        />
        <StatTile
          label="Settled"
          value={summary.resolvedClaims}
          hint="Resolved or withdrawn"
          icon={CheckCircle2}
        />
      </div>

      <section>
        <SectionHeader title="Active warranties" />

        {active.length > 0 ? (
          <div className="flex flex-col gap-3">
            {active.map((entry) => (
              <WarrantyCard
                key={entry.bookingId}
                entry={entry}
                now={now}
                existingClaim={claimByBooking.get(entry.bookingId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing under warranty"
            description="When a shop marks a repair complete, its warranty window opens and the countdown appears here."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/bookings">View your bookings</Link>
              </Button>
            }
          />
        )}
      </section>

      {expired.length > 0 ? (
        <section>
          <SectionHeader title="Expired cover" />
          <ul className="overflow-hidden rounded-machined border border-hairline bg-bench-sunk/40">
            {expired.map((entry) => (
              <ExpiredWarrantyRow key={entry.bookingId} entry={entry} />
            ))}
          </ul>
          <p className="pt-2 text-xs text-steel">
            The window has closed on these, so no new claim can be raised. Message the shop if
            something is still wrong — plenty will help anyway.
          </p>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Your claims" />

        {claims.length > 0 ? (
          <div className="flex flex-col gap-6">
            {openClaims.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="eyebrow">Open</p>
                {openClaims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} now={now} />
                ))}
              </div>
            ) : null}

            {settledClaims.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="eyebrow">Settled</p>
                {settledClaims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} now={now} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="No claims"
            description="If a repair fails inside its warranty window, raise a claim and the shop and our team both see it."
            action={
              active.length > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/warranty/new">Raise a claim</Link>
                </Button>
              ) : null
            }
          />
        )}
      </section>
    </div>
  );
}
