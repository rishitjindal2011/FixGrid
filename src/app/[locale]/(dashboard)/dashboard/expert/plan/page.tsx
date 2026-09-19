import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Store, ShieldCheck, Wallet, Zap, Calendar, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { getShopProStatus } from "@/lib/plans/shop-pro";
import { getWallet } from "@/lib/wallet/server";
import { formatDateLong, formatMoney } from "@/lib/format";
import { ShopProUpgradeCard } from "@/components/dashboard/expert/shop-pro-upgrade-card";

export const metadata: Metadata = {
  title: "Shop Pro SaaS Plan · FixGrid Partner Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ExpertPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/plan");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const [proStatus, wallet] = await Promise.all([
    getShopProStatus(shop.id),
    getWallet("user", user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workshop SaaS"
        title="Shop Pro Plan & Upgrades"
        description="Unlock priority discovery on the hyperlocal radar, smart stock alerts, automated customer status SMS/WhatsApp, and our 5% completed-bill cashback rebate."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/wallet">
              <Wallet aria-hidden />
              <span>Wallet Balance: {formatMoney(wallet.balanceMinor)}</span>
            </Link>
          </Button>
        }
      />

      {/* Metric Tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Current Tier"
          value={proStatus.isPro ? "Shop Pro Active" : "Standard Partner"}
          hint={proStatus.isPro ? "Priority Radar Placement Active" : "Standard directory listing"}
          icon={Sparkles}
          emphasis={proStatus.isPro}
        />
        <StatTile
          label="Membership Period"
          value={proStatus.isPro ? `${proStatus.daysRemaining} Days Left` : "Free Tier"}
          hint={proStatus.expiresAt ? `Valid through ${formatDateLong(proStatus.expiresAt)}` : "Upgrade for full ERP tools"}
          icon={Calendar}
        />
        <StatTile
          label="Cashback Incentive"
          value="5% Rebate"
          hint="Cashback on all completed offline bills"
          icon={TrendingUp}
        />
      </div>

      {/* Upgrade / Management Card */}
      <ShopProUpgradeCard
        proStatus={proStatus}
        balanceMinor={wallet.balanceMinor}
        shopName={shop.shopName}
      />

      {/* Deep-Dive FAQ / Business Economics */}
      <div className="rounded-xl border border-hairline bg-bench p-6">
        <h3 className="font-display text-sm uppercase tracking-wide text-enamel">
          Why Top Neighborhood Workshops Upgrade to Shop Pro:
        </h3>
        <div className="mt-4 grid gap-4 text-xs leading-relaxed text-steel sm:grid-cols-2">
          <div>
            <strong className="text-enamel">Zero Platform Commission on Walk-ins:</strong>
            <p className="mt-0.5">
              Record all your offline walk-in repairs in FixGrid to generate digital receipts and tamper-proof QR passports. FixGrid charges 0% commission on your direct walk-in labor and rewards you with a 5% monthly cashback rebate.
            </p>
          </div>
          <div>
            <strong className="text-enamel">Automated WhatsApp Alerts:</strong>
            <p className="mt-0.5">
              Customers never have to call to ask: <em>&ldquo;Is my phone ready yet?&rdquo;</em> Status transitions in your dashboard instantly send automated WhatsApp notifications to customers at every step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
