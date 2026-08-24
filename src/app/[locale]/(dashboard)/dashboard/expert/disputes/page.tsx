import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ScaleIcon, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listShopDisputes } from "@/lib/dashboard/warranty";
import { formatMoney, formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Warranty claims",
  robots: { index: false, follow: false },
};

/**
 * Claims filed against this shop.
 *
 * The customer has had `/dashboard/warranty` since the marketplace shipped; the
 * shop had no equivalent, so the first a repairer knew of a claim was a
 * notification with nowhere to go. This is the other half of that conversation.
 *
 * Open claims first, then resolved — not newest-first overall. A claim awaiting
 * a reply is work; a settled one is history, and burying the former under the
 * latter is how a claim goes unanswered for a week.
 */
export default async function ExpertDisputesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/disputes");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const disputes = await listShopDisputes(shop.id);

  const open = disputes.filter((dispute) => dispute.open);
  const settled = disputes.filter((dispute) => !dispute.open);

  const refundedPence = settled.reduce(
    (total, dispute) => total + (dispute.refundAmountPence ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Warranty claims"
        description="When a customer says a repair did not hold, it lands here. Reply with what you found — the record is what an adjudicator reads if it goes further."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Open claims"
          value={open.length}
          hint={open.length > 0 ? "Waiting on your reply" : "Nothing outstanding"}
          // The only number here that means somebody has to act.
          emphasis={open.length > 0}
        />
        <StatTile label="Settled" value={settled.length} hint="Closed or withdrawn" />
        <StatTile
          label="Refunded"
          value={formatMoney(refundedPence)}
          hint="Across all settled claims"
        />
      </div>

      {disputes.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No claims"
          description="Nobody has raised a warranty claim against your shop. Completed jobs stay covered for the warranty period you set, and any claim would appear here."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {open.length > 0 ? (
            <DisputeList title="Needs your reply" disputes={open} />
          ) : null}
          {settled.length > 0 ? (
            <DisputeList title="Settled" disputes={settled} muted />
          ) : null}
        </div>
      )}
    </div>
  );
}

function DisputeList({
  title,
  disputes,
  muted = false,
}: {
  title: string;
  disputes: Awaited<ReturnType<typeof listShopDisputes>>;
  muted?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg uppercase tracking-wide text-enamel">{title}</h2>

      <ul className="flex flex-col gap-2">
        {disputes.map((dispute) => (
          <li key={dispute.id}>
            <Link
              href={`/dashboard/expert/disputes/${dispute.id}`}
              className="flex flex-col gap-2 rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ScaleIcon aria-hidden className="size-4 shrink-0 text-steel-soft" />
                  <span className="font-mono text-sm text-enamel">{dispute.reference}</span>
                  {dispute.serviceName ? (
                    <span className="text-sm text-steel">{dispute.serviceName}</span>
                  ) : null}
                </span>

                <Badge variant={dispute.open ? "signal" : "neutral"}>
                  {dispute.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <p
                className={
                  muted
                    ? "line-clamp-2 text-sm text-steel-soft"
                    : "line-clamp-2 text-sm text-steel"
                }
              >
                {dispute.reason}
              </p>

              <p className="font-mono text-xs text-steel-soft">
                Raised {formatRelative(dispute.createdAt)}
                {dispute.refundAmountPence !== null
                  ? ` · refunded ${formatMoney(dispute.refundAmountPence)}`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
