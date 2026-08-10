import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Paperclip } from "lucide-react";

import { DisputeThread } from "@/components/dashboard/dispute-thread";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { getShopDispute } from "@/lib/dashboard/warranty";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Claim",
  robots: { index: false, follow: false },
};

/**
 * One warranty claim, from the shop's side.
 *
 * Deliberately a separate route from the customer's `/dashboard/warranty/[id]`
 * rather than one page branching on who is looking. The two need different
 * authorisation (shop-on-the-booking versus customer-on-the-booking), different
 * wording, and different actions — and a single page carrying both is one `if`
 * away from showing a claimant the shop's view of their own claim.
 */
export default async function ExpertDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/dashboard/expert/disputes/${id}`);

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  // Null covers "no such claim", "not against this shop" and "RLS refused it".
  // All three are a 404 — distinguishing them would let someone probe which
  // claim ids exist.
  const dispute = await getShopDispute(shop.id, user.id, id);
  if (!dispute) notFound();

  const settled = !dispute.open;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/expert/disputes"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-steel transition-colors hover:text-enamel"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All claims
      </Link>

      <PageHeader
        eyebrow={`Claim on ${dispute.reference}`}
        title={dispute.serviceName ?? "Warranty claim"}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge variant={dispute.open ? "signal" : "neutral"}>
              {dispute.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-steel">
              Raised {formatDateTime(dispute.createdAt)}
            </span>
          </span>
        }
      />

      <section className="flex flex-col gap-3 rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <div>
          <p className="eyebrow text-steel">What the customer says</p>
          <p className="pt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-enamel">
            {dispute.reason}
          </p>
        </div>

        {dispute.desiredOutcome ? (
          <div className="border-t border-hairline pt-3">
            <p className="eyebrow text-steel">What they have asked for</p>
            <p className="pt-1.5 text-sm text-enamel">{dispute.desiredOutcome}</p>
          </div>
        ) : null}

        {dispute.evidence.length > 0 ? (
          <div className="border-t border-hairline pt-3">
            <p className="eyebrow pb-1.5 text-steel">Evidence attached</p>
            <ul className="flex flex-col gap-1">
              {dispute.evidence.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 text-sm text-steel"
                >
                  <Paperclip aria-hidden className="size-3.5 shrink-0 text-steel-soft" />
                  {file.file_name ?? "Attachment"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {settled ? (
          <div className="border-t border-hairline pt-3">
            <p className="eyebrow text-steel">Outcome</p>
            <p className="pt-1.5 text-sm text-enamel">
              {dispute.resolution
                ? dispute.resolution.replace(/_/g, " ")
                : "Closed without a recorded resolution."}
              {dispute.refundAmountPence !== null
                ? ` — ${formatMoney(dispute.refundAmountPence)} refunded`
                : ""}
            </p>
            {dispute.resolutionNote ? (
              <p className="pt-1.5 whitespace-pre-wrap text-sm text-steel">
                {dispute.resolutionNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* The same component the customer uses. One transcript, one set of
          wording rules — a second implementation would drift on who is "you". */}
      <DisputeThread
        disputeId={dispute.id}
        messages={dispute.messages}
        now={new Date()}
        readOnly={settled}
      />

      <p className="text-xs leading-relaxed text-steel">
        FixGrid decides the outcome if the two of you cannot agree. What
        you write here is what we read, so describe what you found and what you
        did rather than only disagreeing.
      </p>
    </div>
  );
}
