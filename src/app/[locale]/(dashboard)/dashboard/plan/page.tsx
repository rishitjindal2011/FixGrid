import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, Sparkles, Wallet } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PlanPicker } from "@/components/dashboard/plan-picker";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement, listPlans, remainingBookings } from "@/lib/plans/server";
import { getWallet } from "@/lib/wallet/server";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = {
  title: "Plan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The customer's plan, and what it is currently worth to them.
 *
 * The three tiles answer the only questions a plan raises: what am I on, how much
 * of it have I used, and when does it run out. `remainingBookings` returns null for
 * an unlimited plan, which renders as "Unlimited" rather than as a number — a
 * counter on something uncountable reads as a limit nobody mentioned.
 */
export default async function PlanPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/plan");

  const [entitlement, plans, wallet] = await Promise.all([
    getEntitlement(),
    listPlans(),
    getWallet("user", user.id),
  ]);

  const remaining = remainingBookings(entitlement);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Plan"
        title="Your plan"
        description="A plan covers the booking fee on your repairs, and Pro puts your requests at the front of a shop's queue."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/wallet">
              <Wallet aria-hidden />
              Balance
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Current plan"
          value={entitlement.planName}
          hint={entitlement.priority ? "Priority in the queue" : "Standard queue"}
          icon={Sparkles}
        />
        <StatTile
          label="Fee-free repairs left"
          value={remaining === null ? "Unlimited" : String(remaining)}
          hint={
            entitlement.bookingsIncluded === null
              ? "No booking fees on this plan"
              : entitlement.bookingsIncluded === 0
                ? "Fees apply per repair"
                : `${entitlement.bookingsUsed} of ${entitlement.bookingsIncluded} used`
          }
          // The number that decides whether the next booking costs anything, so it
          // gets emphasis when it has run out.
          emphasis={remaining === 0}
        />
        <StatTile
          label="Renews"
          value={entitlement.periodEnd ? formatDay(entitlement.periodEnd) : "—"}
          hint={entitlement.periodEnd ? "Allowance resets when you renew" : "No active period"}
          icon={CalendarClock}
        />
      </div>

      <PlanPicker
        plans={plans}
        entitlement={entitlement}
        balanceMinor={wallet.balanceMinor}
      />

      <p className="rounded-machined border border-hairline bg-bench px-4 py-3 text-xs leading-relaxed text-steel">
        Plans are paid from your balance, and a plan change takes effect on your next
        repair request. Switching to a paid plan starts a fresh allowance straight
        away — nothing you have already used carries over.
      </p>
    </div>
  );
}
