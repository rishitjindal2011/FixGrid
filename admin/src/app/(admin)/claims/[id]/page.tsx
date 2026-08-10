import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ClaimActions } from "@/components/admin/claim-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { getClaim } from "@/lib/queries/claims";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ClaimStatus } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Claim",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<ClaimStatus, "neutral" | "verified" | "signal" | "danger"> = {
  pending: "signal",
  approved: "verified",
  rejected: "danger",
  withdrawn: "neutral",
};

/**
 * The public site runs as a separate process on another port, so its URL cannot
 * be derived from this request. An env var with a dev fallback keeps the link
 * working locally without hardcoding a production host.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="eyebrow w-40 shrink-0 text-steel">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [claim, session] = await Promise.all([getClaim(id), getSession()]);
  if (!claim) notFound();

  const canDecide = session !== null && session.role !== "viewer";
  const decided = claim.status !== "pending";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/claims"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All claims
        </Link>
      </div>

      <PageHeader
        eyebrow={<Badge variant={STATUS_VARIANT[claim.status]}>{claim.status}</Badge>}
        title={claim.shopName}
        description={`Claimed by ${claim.claimantName}, ${formatRelative(claim.createdAt)}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              The shop
            </h2>
            <dl>
              <Field label="Name">{claim.shopName}</Field>
              <Field label="Address">{claim.shopAddress || "—"}</Field>
              <Field label="Verified">
                {claim.shopVerified ? (
                  <Badge variant="verified">Verified</Badge>
                ) : (
                  <span className="text-steel">Not verified</span>
                )}
              </Field>
              <Field label="Directory status">
                {claim.shopIsHidden ? (
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Badge variant="signal">New submission</Badge>
                      <span className="text-steel">Hidden from the directory</span>
                    </span>
                    <span className="text-xs text-steel">
                      This shop was created through the join form and nobody has
                      vetted it yet. Approving publishes it to search for the
                      first time — check the evidence against a real business,
                      not just against this claimant.
                    </span>
                  </span>
                ) : (
                  <span className="text-steel">Live in the directory</span>
                )}
              </Field>
              <Field label="Current owner">
                {claim.shopOwnerId ? (
                  <span className="flex items-center gap-2">
                    {/* A hidden shop is owned by design — the submitter gets
                        their dashboard at once — so "already owned" would read
                        as a warning where none applies. */}
                    <Badge variant={claim.shopIsHidden ? "neutral" : "danger"}>
                      {claim.shopIsHidden ? "Owned by the submitter" : "Already owned"}
                    </Badge>
                    <span className="font-mono text-xs text-steel">{claim.shopOwnerId}</span>
                  </span>
                ) : (
                  <span className="text-steel">
                    Unowned — approving this claim gives it an owner for the first time.
                  </span>
                )}
              </Field>
              <Field label="Public page">
                {claim.shopSlug ? (
                  <a
                    href={`${SITE_URL}/expert/${claim.shopSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-signal hover:underline"
                  >
                    /expert/{claim.shopSlug}
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  "—"
                )}
              </Field>
            </dl>
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              The claimant
            </h2>
            <dl>
              <Field label="Account">{claim.claimantName}</Field>
              <Field label="Account id">
                <span className="font-mono text-xs">{claim.claimantId}</span>
              </Field>
              <Field label="Signed up">
                {claim.claimantJoinedAt ? formatDateTime(claim.claimantJoinedAt) : "—"}
              </Field>
              <Field label="Contact phone">
                {claim.contactPhone ? (
                  <a href={`tel:${claim.contactPhone}`} className="font-mono hover:text-signal">
                    {claim.contactPhone}
                  </a>
                ) : (
                  <span className="text-steel">Not given</span>
                )}
              </Field>
              <Field label="Profile phone">
                {claim.claimantPhone ? (
                  <span className="font-mono">{claim.claimantPhone}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
            </dl>
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              Evidence given
            </h2>
            {claim.evidence ? (
              <p className="whitespace-pre-wrap text-sm text-enamel">{claim.evidence}</p>
            ) : (
              <p className="text-sm text-steel">
                No evidence was supplied. That is not disqualifying on its own, but it is worth a
                phone call before handing over a listing.
              </p>
            )}
          </section>

          {decided ? (
            <section className="rounded-machined border border-hairline bg-bench-sunk p-4">
              <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
                Decision
              </h2>
              <dl>
                <Field label="Outcome">
                  <Badge variant={STATUS_VARIANT[claim.status]}>{claim.status}</Badge>
                </Field>
                <Field label="Decided">
                  {claim.reviewedAt ? formatDateTime(claim.reviewedAt) : "—"}
                </Field>
                <Field label="By">
                  <span className="font-mono text-xs">{claim.reviewedBy ?? "—"}</span>
                </Field>
                <Field label="Note">
                  {claim.reviewNote ? (
                    <span className="whitespace-pre-wrap">{claim.reviewNote}</span>
                  ) : (
                    <span className="text-steel">None</span>
                  )}
                </Field>
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          {decided ? (
            <p className="rounded-machined border border-hairline bg-bench-sunk px-4 py-3 text-sm text-steel">
              This claim has already been decided. Reopening it is not possible from here — ask the
              claimant to submit a fresh claim.
            </p>
          ) : canDecide ? (
            <ClaimActions
              claimId={claim.id}
              shopName={claim.shopName}
              shopAlreadyOwned={claim.shopOwnerId !== null}
            />
          ) : (
            <p className="rounded-machined border border-hairline bg-bench-sunk px-4 py-3 text-sm text-steel">
              You have viewer access. Deciding claims needs editor access — ask an owner to raise
              your role.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
