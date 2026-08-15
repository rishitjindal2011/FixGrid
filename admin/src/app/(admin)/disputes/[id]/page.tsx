import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { AttachmentGallery } from "@/components/admin/attachment-gallery";
import { DisputeResolution } from "@/components/admin/dispute-resolution";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import {
  attachmentHrefs,
  type StoredAttachment,
} from "@/lib/attachments";
import { getDispute } from "@/lib/queries/disputes";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import {
  DISPUTE_RESOLUTION_LABELS,
  DISPUTE_STATUS_LABELS,
  type DisputeStatus,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Claim",
  robots: { index: false, follow: false },
};

function statusVariant(status: DisputeStatus): "neutral" | "verified" | "signal" | "danger" {
  if (status === "resolved") return "verified";
  if (status === "withdrawn") return "neutral";
  if (status === "open") return "danger";
  return "signal";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="eyebrow w-36 shrink-0 text-steel">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [dispute, session] = await Promise.all([getDispute(id), getSession()]);
  if (!dispute) notFound();

  const disputeAttachments: StoredAttachment[] = dispute.evidence.map((file) => ({
    id: file.id,
    storagePath: file.storage_path,
    fileName: file.file_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes ?? 0,
    kind: "evidence",
    createdAt: file.created_at,
  }));
  const signedDisputeEvidence =
    disputeAttachments.length > 0
      ? attachmentHrefs("evidence", disputeAttachments)
      : new Map<string, string>();

  const canResolve = session !== null && session.role !== "viewer";
  const decided = dispute.status === "resolved" || dispute.status === "withdrawn";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/disputes"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All claims
        </Link>
      </div>

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Link href={`/bookings/${dispute.reference}`} className="font-mono hover:text-signal">
              {dispute.reference || "—"}
            </Link>
            <Badge variant={statusVariant(dispute.status)}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </Badge>
          </span>
        }
        title="Warranty claim"
        description={`${dispute.customerName} against ${dispute.shopName}, raised ${formatRelative(dispute.createdAt)}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              The claim
            </h2>
            <dl>
              <Field label="Customer">
                <Link href={`/customers/${dispute.customerId}`} className="hover:text-signal">
                  {dispute.customerName}
                </Link>
              </Field>
              <Field label="Shop">
                {dispute.shopId ? (
                  <Link href={`/experts/${dispute.shopId}`} className="hover:text-signal">
                    {dispute.shopName}
                  </Link>
                ) : (
                  dispute.shopName
                )}
              </Field>
              <Field label="Job value">
                <span className="font-mono">
                  {formatMoney(dispute.finalPence, dispute.currency)}
                </span>
              </Field>
              <Field label="What went wrong">
                <span className="whitespace-pre-wrap">{dispute.reason}</span>
              </Field>
              <Field label="Asked for">
                {dispute.desiredOutcome ? (
                  <span className="whitespace-pre-wrap">{dispute.desiredOutcome}</span>
                ) : (
                  <span className="text-steel">Not stated</span>
                )}
              </Field>
            </dl>
          </section>

          {disputeAttachments.length > 0 ? (
            <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
              <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
                Evidence
              </h2>
              <AttachmentGallery items={disputeAttachments} hrefs={signedDisputeEvidence} />
            </section>
          ) : null}

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
              Conversation
            </h2>
            {dispute.messages.length === 0 ? (
              <p className="text-sm text-steel">
                Nothing said yet beyond the claim itself.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {dispute.messages.map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      "rounded-machined border px-3 py-2",
                      message.authorRole === "admin"
                        ? "border-enamel/20 bg-bench-sunk"
                        : "border-hairline bg-bench/40",
                    )}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="font-display text-xs uppercase tracking-wide text-enamel">
                        {message.authorName}
                        <span className="ml-2 text-steel-soft">{message.authorRole}</span>
                      </span>
                      <span className="font-mono text-xs text-steel">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-enamel">{message.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {decided ? (
            <section className="rounded-machined border border-hairline bg-bench-sunk p-4">
              <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
                Outcome
              </h2>
              <dl>
                <Field label="Decision">
                  {dispute.resolution ? DISPUTE_RESOLUTION_LABELS[dispute.resolution] : "—"}
                </Field>
                <Field label="Refund">
                  {dispute.refundPence !== null ? (
                    <span className="font-mono">
                      {formatMoney(dispute.refundPence, dispute.currency)}
                    </span>
                  ) : (
                    <span className="text-steel">None</span>
                  )}
                </Field>
                <Field label="Decided">
                  {dispute.resolvedAt ? formatDateTime(dispute.resolvedAt) : "—"}
                </Field>
                <Field label="Reasoning">
                  {dispute.resolutionNote ? (
                    <span className="whitespace-pre-wrap">{dispute.resolutionNote}</span>
                  ) : (
                    <span className="text-steel">—</span>
                  )}
                </Field>
              </dl>
            </section>
          ) : canResolve ? (
            <DisputeResolution
              disputeId={dispute.id}
              bookingTotalPence={dispute.finalPence}
              currency={dispute.currency}
            />
          ) : (
            <p className="rounded-machined border border-hairline bg-bench-sunk px-4 py-3 text-sm text-steel">
              You have viewer access. Resolving a claim needs editor access.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
