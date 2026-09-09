import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarClock, Sparkles, Wallet } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PlanPicker } from "@/components/dashboard/plan-picker";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement, listPlans, remainingBookings } from "@/lib/plans/server";
import { getWallet } from "@/lib/wallet/server";
import { formatDay } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.plan");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

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
  const t = await getTranslations("dashboard.plan");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/wallet">
              <Wallet aria-hidden />
              {t("balance")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("currentPlan")}
          value={entitlement.planName}
          hint={entitlement.priority ? t("priorityQueue") : t("standardQueue")}
          icon={Sparkles}
        />
        <StatTile
          label={t("feeFreeLeft")}
          value={remaining === null ? t("unlimited") : String(remaining)}
          hint={
            entitlement.bookingsIncluded === null
              ? t("noFees")
              : entitlement.bookingsIncluded === 0
                ? t("feesApply")
                : t("usage", {
                    used: entitlement.bookingsUsed,
                    included: entitlement.bookingsIncluded,
                  })
          }
          // The number that decides whether the next booking costs anything, so it
          // gets emphasis when it has run out.
          emphasis={remaining === 0}
        />
        <StatTile
          label={t("renews")}
          value={entitlement.periodEnd ? formatDay(entitlement.periodEnd) : "—"}
          hint={entitlement.periodEnd ? t("allowanceResets") : t("noPeriod")}
          icon={CalendarClock}
        />
      </div>

      <PlanPicker
        plans={plans}
        entitlement={entitlement}
        balanceMinor={wallet.balanceMinor}
      />

      <p className="rounded-machined border border-hairline bg-bench px-4 py-3 text-xs leading-relaxed text-steel">
        {t("footer")}
      </p>
    </div>
  );
}
