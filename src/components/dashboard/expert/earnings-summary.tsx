import * as React from "react";
import { Banknote, ShieldCheck, Wallet } from "lucide-react";

import type { EarningsBucket, ExpertStats } from "@/lib/dashboard/expert";
import { formatMoney } from "@/lib/format";
import { cn, pluralize } from "@/lib/utils";

/**
 * The three numbers a shop owner opens this page for: what they have earned,
 * what is still being held, and what they can take out today.
 *
 * Deliberately not three `StatTile`s. A tile carries a label, a number and a
 * short hint, and two of these need more than that — escrow has to explain
 * itself in a full sentence, and the payout balance has to carry the control
 * that acts on it. Rather than widen `StatTile` for one screen, these repeat its
 * visual grammar exactly: eyebrow label, mono value, quiet supporting line.
 *
 * The totals are folded here rather than passed in, so the headline figure and
 * the chart below it can only ever come from the same twelve buckets.
 */
export function EarningsSummary({
  earnings,
  stats,
  currency = "GBP",
  withdraw,
}: {
  earnings: EarningsBucket[];
  stats: ExpertStats;
  currency?: string;
  /** The withdraw control, injected so this stays a server component. */
  withdraw?: React.ReactNode;
}) {
  const totals = earnings.reduce(
    (sum, bucket) => ({
      gross: sum.gross + bucket.grossPence,
      fee: sum.fee + bucket.feePence,
      net: sum.net + bucket.netPence,
      jobs: sum.jobs + bucket.jobs,
    }),
    { gross: 0, fee: 0, net: 0, jobs: 0 },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        label="Total earnings"
        value={formatMoney(totals.net, currency)}
        icon={Banknote}
      >
        <p className="text-xs leading-relaxed text-steel">
          {pluralize(totals.jobs, "job")} over the last {earnings.length} months, after{" "}
          <span className="font-mono tabular-nums">{formatMoney(totals.fee, currency)}</span>{" "}
          in platform fees.
        </p>
      </MetricCard>

      <MetricCard
        label="Pending in escrow"
        value={formatMoney(stats.inWarrantyHoldPence, currency)}
        icon={ShieldCheck}
        // Money in flight with a clock running against it — the live state the
        // token rule reserves signal orange for. A settled total stays enamel.
        emphasis={stats.inWarrantyHoldPence > 0}
      >
        <p className="text-xs leading-relaxed text-steel">
          Each job&apos;s share is released the day its own warranty window closes, so this
          figure falls job by job rather than all at once.
        </p>
      </MetricCard>

      <MetricCard
        label="Available for payout"
        value={formatMoney(stats.availableForPayoutPence, currency)}
        icon={Wallet}
        // Two-up at tablet leaves this one on a row of its own, which is where
        // the only control in the group wants to be anyway.
        className="sm:col-span-2 lg:col-span-1"
      >
        {withdraw}
      </MetricCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  emphasis = false,
  className,
  children,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  emphasis?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-machined border border-hairline bg-chalk p-4 shadow-bench",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <Icon
          aria-hidden
          className={cn("size-4 shrink-0", emphasis ? "text-signal" : "text-steel-soft")}
        />
      </div>

      <p
        className={cn(
          "pt-3 font-mono text-2xl leading-none tabular-nums",
          emphasis ? "text-signal" : "text-enamel",
        )}
      >
        {value}
      </p>

      {children ? <div className="pt-3">{children}</div> : null}
    </div>
  );
}
