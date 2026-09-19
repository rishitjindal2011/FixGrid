"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { PaymentSheet } from "@/components/dashboard/payment-sheet";
import { purchaseShopProDirect } from "@/lib/plans/shop-pro-actions";
import type { ShopProStatus } from "@/lib/plans/shop-pro";

interface ShopProUpgradeCardProps {
  proStatus: ShopProStatus;
  balanceMinor: number;
  shopName: string;
}

export function ShopProUpgradeCard({
  proStatus,
  balanceMinor,
  shopName,
}: ShopProUpgradeCardProps) {
  const router = useRouter();
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* If pro is active, show banner */}
      {proStatus.isPro && proStatus.expiresAt && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Shop Pro is active until{" "}
              {new Date(proStatus.expiresAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              . All Pro benefits are unlocked!
            </span>
          </div>
        </div>
      )}

      {/* Main SaaS Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#ea580c]/30 bg-chalk p-6 shadow-xl sm:p-8">
        
        {/* Glow & Badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="signal" className="px-2.5 py-0.5 text-xs">
                OFFICIAL WORKSHOP PLAN
              </Badge>
              {proStatus.isPro && (
                <Badge variant="verified">
                  Active
                </Badge>
              )}
            </div>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-tight text-enamel sm:text-3xl">
              FixGrid Shop Pro SaaS
            </h2>
            <p className="mt-1 text-sm text-steel">
              High-velocity operating system for <strong className="text-enamel">{shopName}</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-bench p-4 text-left sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="font-mono text-3xl font-black text-enamel">₹999</span>
              <span className="text-xs text-steel">/ month</span>
            </div>
            <p className="text-[11px] text-steel-soft">Billed monthly · Cancel anytime</p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proStatus.benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-bench p-4 transition-all hover:border-[#ea580c]/40"
            >
              <div className="flex items-center gap-2 font-semibold text-enamel">
                <CheckCircle2 className="size-4 shrink-0 text-[#ea580c]" />
                <span className="text-sm">{benefit.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-steel">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Subscription Action Bar */}
        <div className="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Wallet Balance Readout */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-bench text-steel">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-steel">
                Available Wallet Balance
              </p>
              <p className="font-mono text-base font-bold text-enamel">
                {formatMoney(balanceMinor)}
              </p>
            </div>
          </div>

          {/* Action Button: Opens PaymentSheet for full confirmation and method choice */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => setIsPaymentOpen(true)}
              className="gap-2 bg-[#ea580c] hover:bg-[#c2410c] px-6 text-white shadow-lg shadow-orange-500/20"
            >
              <Sparkles className="size-4" />
              <span>
                {proStatus.isPro
                  ? "Extend Shop Pro (+30 Days for ₹999)"
                  : "Activate Shop Pro (₹999 / mo)"}
              </span>
            </Button>
          </div>
        </div>

      </div>

      {isPaymentOpen && (
        <PaymentSheet
          open
          onClose={() => {
            setIsPaymentOpen(false);
            router.refresh();
          }}
          amountMinor={proStatus.priceMinor}
          balanceMinor={balanceMinor}
          title="FixGrid Shop Pro SaaS Subscription"
          description="30-day Pro workshop tier: priority map discovery, 5% cashback rebate, automated SMS/WhatsApp alerts, smart inventory ERP, and unlimited QR warranties."
          purchaseFields={{}}
          purchaseAction={purchaseShopProDirect}
          confirmLabel="Done"
        />
      )}
    </div>
  );
}
