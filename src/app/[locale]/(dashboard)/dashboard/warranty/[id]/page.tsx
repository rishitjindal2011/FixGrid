import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, FileText, FileWarning, Paperclip, Scale } from "lucide-react";

import { DisputeThread } from "@/components/dashboard/dispute-thread";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EvidenceUpload } from "@/components/dashboard/evidence-upload";
import {
  ClaimStatusBadge,
  DESIRED_OUTCOME_LABELS,
  RESOLUTION_LABELS,
} from "@/components/dashboard/warranty-card";
import { Button } from "@/components/ui/button";
import { attachmentHrefs } from "@/lib/attachments/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDispute } from "@/lib/dashboard/warranty";
import { formatDateLong, formatMoney, formatRelative } from "@/lib/format";
import { BOOKING_STATUS_LABELS, type DisputeEvidenceRow } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Warranty claim",
  robots: { index: false, follow: false },
};

function EvidenceTile({
  item,
  url,
}: {
  item: DisputeEvidenceRow;
  url: string | null;
}) {
  const isImage = (item.mime_type ?? "").startsWith("image/");
  const label = item.file_name ?? "Evidence";

  // `unoptimized` deliberately: the route requires the caller's session cookie,
  // and the image optimiser fetches server-side without one — it would get a 404
  // and render a broken tile.
  if (url && isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="group block overflow-hidden rounded-machined border border-hairline bg-bench"
      >
        <Image
          src={url}
          alt={label}
          width={200}
          height={200}
          unoptimized
          className="h-24 w-full object-cover transition-opacity group-hover:opacity-90"
        />
        <span className="block truncate px-2 py-1.5 text-xs text-steel">{label}</span>
      </a>
    );
  }

  const chip = (
    <>
      <FileText aria-hidden className="size-4 shrink-0 text-steel-soft" />
      <span className="min-w-0 truncate">{label}</span>
    </>
  );

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm text-enamel hover:border-steel-soft"
    >
      {chip}
    </a>
  ) : (
    <span
      title="This file cannot be shown right now."
      className="flex items-center gap-2 rounded-machined border border-dashed border-hairline bg-bench/40 px-3 py-2.5 text-sm text-steel-soft"
    >
      {chip}
    </span>
  );
}

function BackLink() {
  return (
    <div>
      <Link
        href="/dashboard/warranty"
        className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Warranty and claims
      </Link>
    </div>
  );
}

/**
 * One claim: what was asked for, what has been said, and how it landed.
 *
 * A resolved claim keeps its thread — read-only — rather than collapsing to a
 * verdict. The transcript is the record of how the decision was reached, and it
 * is the thing a customer re-reads when they are deciding whether to accept it.
 *
 * A claim that cannot be read renders an empty state rather than a 404, the
 * same call `billing/[reference]` makes: `getDispute` returns null for "no such
 * claim", "RLS said no" and "the disputes table does not exist yet" alike, and
 * before the migration is run the last is the only case there is. The site's
 * not-found page would tell that customer nothing. All three still render the
 * same screen, so nothing here confirms which claim ids exist.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/warranty");

  const { id } = await params;
  const claim = await getDispute(user.id, id);

  if (!claim) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <EmptyState
          icon={FileWarning}
          title="Claim not found"
          description="We could not find that claim on your account. It may have been opened under a different sign-in, or the link may be out of date."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/warranty">Back to warranty</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const now = new Date();
  // URLs on this origin, served by `/dashboard/attachments/evidence/[id]`, which
  // re-checks `is_dispute_party` on every request. Previously these were signed
  // `supabase.co` URLs — a token in the address bar on the most sensitive files
  // a customer uploads.
  const evidenceUrls = attachmentHrefs("evidence", claim.evidence);

  const outcome = claim.desiredOutcome
    ? (DESIRED_OUTCOME_LABELS[claim.desiredOutcome] ?? claim.desiredOutcome)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <header className="relative overflow-hidden rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6">
        <div aria-hidden className="schematic schematic-fade absolute inset-0" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <p className="eyebrow">Claim</p>
              <ClaimStatusBadge status={claim.status} />
            </div>
            <h1 className="font-display text-display-sm uppercase text-enamel">
              {claim.serviceName ?? "Repair"}
            </h1>
            <p className="pt-1.5 text-sm text-steel">
              {claim.shopName} · Raised {formatRelative(claim.createdAt, now)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/bookings/${claim.reference}`}>View booking</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
            <h2 className="eyebrow">What you told us</h2>
            <p className="whitespace-pre-wrap break-words pt-3 text-sm leading-relaxed text-enamel">
              {claim.reason}
            </p>

            {outcome ? (
              <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4">
                <Scale aria-hidden className="size-4 shrink-0 text-steel-soft" />
                <p className="text-sm text-steel">
                  You asked for: <span className="text-enamel">{outcome}</span>
                </p>
              </div>
            ) : null}
          </section>

          {/* Rendered whenever the claim is open, not only when evidence
              exists: this is the one place a photo can actually be attached,
              since the row needs a dispute id that does not exist while the
              claim is being written. A settled claim keeps its thumbnails and
              loses the control, like the thread above it. */}
          {claim.evidence.length > 0 || claim.open ? (
            <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
              <h2 className="eyebrow flex items-center gap-2">
                <Paperclip aria-hidden className="size-3.5" />
                Evidence
              </h2>

              {claim.evidence.length > 0 ? (
                <div className="grid gap-2 pt-3 sm:grid-cols-3">
                  {claim.evidence.map((item) => (
                    <EvidenceTile
                      key={item.id}
                      item={item}
                      url={evidenceUrls.get(item.id) ?? null}
                    />
                  ))}
                </div>
              ) : (
                <p className="pt-2 text-sm text-steel">
                  Nothing attached yet. A photo of the fault is the single most useful thing
                  you can add.
                </p>
              )}

              {claim.open ? (
                <div className="pt-4">
                  <EvidenceUpload
                    disputeId={claim.id}
                    pathPrefix={`claims/${claim.bookingId}`}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          <DisputeThread
            disputeId={claim.id}
            messages={claim.messages}
            now={now}
            readOnly={!claim.open}
          />
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-2">
          {!claim.open && claim.resolution ? (
            <section className="rounded-machined border border-verdigris/30 bg-verdigris-wash p-5">
              <h2 className="eyebrow text-verdigris">Resolution</h2>
              <p className="pt-2 font-display text-lg uppercase tracking-wide text-enamel">
                {RESOLUTION_LABELS[claim.resolution]}
              </p>

              {claim.refundAmountPence !== null ? (
                <p className="pt-3">
                  <span className="eyebrow block pb-1">Refunded</span>
                  <span className="font-mono text-2xl leading-none tabular-nums text-enamel">
                    {formatMoney(claim.refundAmountPence)}
                  </span>
                </p>
              ) : null}

              {claim.resolutionNote ? (
                <p className="whitespace-pre-wrap break-words pt-3 text-sm leading-relaxed text-steel">
                  {claim.resolutionNote}
                </p>
              ) : null}

              {claim.resolvedAt ? (
                <p className="pt-3 font-mono text-xs tabular-nums text-steel">
                  Settled {formatDateLong(claim.resolvedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
            <h2 className="eyebrow">The booking</h2>

            <dl className="flex flex-col gap-3 pt-3 text-sm">
              <div>
                <dt className="eyebrow pb-1">Reference</dt>
                <dd className="font-mono uppercase tracking-[0.08em] text-enamel">
                  {claim.reference}
                </dd>
              </div>

              <div>
                <dt className="eyebrow pb-1">Shop</dt>
                <dd className="text-enamel">
                  {claim.shopSlug ? (
                    <Link href={`/expert/${claim.shopSlug}`} className="hover:text-signal">
                      {claim.shopName}
                    </Link>
                  ) : (
                    claim.shopName
                  )}
                </dd>
              </div>

              <div>
                <dt className="eyebrow pb-1">Booking status</dt>
                <dd className="text-enamel">{BOOKING_STATUS_LABELS[claim.bookingStatus]}</dd>
              </div>

              {claim.warrantyExpiresAt ? (
                <div>
                  <dt className="eyebrow pb-1">Warranty</dt>
                  <dd className="font-mono tabular-nums text-enamel">
                    {new Date(claim.warrantyExpiresAt).getTime() > now.getTime()
                      ? `Open until ${formatDateLong(claim.warrantyExpiresAt)}`
                      : `Closed ${formatDateLong(claim.warrantyExpiresAt)}`}
                  </dd>
                </div>
              ) : null}

              <div>
                <dt className="eyebrow pb-1">Last update</dt>
                <dd className="text-steel">{formatRelative(claim.updatedAt, now)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
