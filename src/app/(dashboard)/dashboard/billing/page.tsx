import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Banknote, FileText, Receipt, RotateCcw, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { InvoiceTable, RefundTable } from "@/components/dashboard/invoice-table";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getBillingSummary,
  listInvoices,
  listRefunds,
  type Invoice,
} from "@/lib/dashboard/billing";
import { listWarranties, type WarrantyEntry } from "@/lib/dashboard/warranty";
import { daysUntil, formatDay, formatMoney } from "@/lib/format";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

/**
 * The customer's money: what they have spent, what is still held, and every
 * invoice behind those numbers.
 *
 * Four reads in one `Promise.all` — they have no interdependency, and running
 * them in sequence would be four serialised round-trips for one screen.
 *
 * `now` is captured once and threaded into both the summary and the escrow
 * maths. Letting each call read its own clock would let the "in escrow" total
 * and the bars underneath it disagree about which warranty windows are still
 * open, which is the one inconsistency a page about money cannot afford.
 */
export default async function BillingPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/billing");

  const now = new Date();

  const [summary, invoices, refunds, warranties] = await Promise.all([
    getBillingSummary(user.id, now),
    listInvoices(user.id),
    listRefunds(user.id),
    listWarranties(user.id, now),
  ]);

  // The summary carries no currency of its own — it is a fold over invoices
  // that may in principle mix currencies. Taking the newest invoice's currency
  // makes the tiles agree with the table directly beneath them, and GBP is the
  // schema default when there are no invoices at all.
  const currency = invoices[0]?.currency ?? "INR";

  const held = heldJobs(invoices, warranties);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Payments"
        title="Billing"
        description="Every repair you have paid for, what is still held against a warranty, and the invoices behind both."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total spent"
          value={formatMoney(summary.totalSpentPence, currency)}
          hint="Across finished repairs"
          icon={Banknote}
        />
        <StatTile
          label="In escrow"
          value={formatMoney(summary.inEscrowPence, currency)}
          hint="Held until warranty closes"
          icon={ShieldCheck}
          // Live state, not decoration: this is money still in flight, with a
          // window counting down against it. Settled totals stay in enamel.
          emphasis={summary.inEscrowPence > 0}
        />
        <StatTile
          label="Refunded"
          value={formatMoney(summary.refundedPence, currency)}
          hint="Returned to you"
          icon={RotateCcw}
        />
        <StatTile
          label="Open invoices"
          value={summary.openInvoices}
          // "Awaiting payment", never "unpaid": nothing has been presented for
          // collection yet, and the harsher wording would accuse the customer
          // of arrears that do not exist.
          hint="Awaiting payment"
          icon={Receipt}
        />
      </div>

      <EscrowTracker held={held} now={now} />

      <section>
        <SectionHeader
          title="Invoice history"
          action={
            invoices.length > 0 ? (
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {pluralize(invoices.length, "invoice")}
              </span>
            ) : null
          }
        />

        {invoices.length > 0 ? (
          <InvoiceTable invoices={invoices} />
        ) : (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Once a repair is finished, its invoice lands here with the full breakdown — service, platform fee and VAT."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/discover">Find an expert</Link>
              </Button>
            }
          />
        )}
      </section>

      <section>
        <SectionHeader title="Refunds" />

        {refunds.length > 0 ? (
          <RefundTable refunds={refunds} />
        ) : (
          <EmptyState
            icon={RotateCcw}
            title="No refunds"
            description="If a repair is put right with a refund, it is listed here separately from the invoice it reverses."
          />
        )}
      </section>
    </div>
  );
}

/* ── Escrow ───────────────────────────────────────────────────────────────── */

interface HeldJob {
  bookingId: string;
  reference: string;
  shopName: string;
  serviceName: string | null;
  amountPence: number;
  currency: string;
  /** When the repair finished — the start of the window. Null on old rows. */
  startedAt: string | null;
  expiresAt: string;
  daysLeft: number;
}

/**
 * The jobs whose money is still held, newest window first.
 *
 * Built by joining the active warranties onto the invoices rather than by a
 * fifth query: `listWarranties` already knows which windows are open and
 * `listInvoices` already knows what each job came to, and the two are keyed on
 * the same booking id. A warranty with no matching invoice is dropped — with no
 * amount there is nothing to hold, and a ₹0 bar would read as money released.
 */
function heldJobs(invoices: Invoice[], warranties: WarrantyEntry[]): HeldJob[] {
  const byBooking = new Map(invoices.map((invoice) => [invoice.bookingId, invoice]));

  return warranties
    .filter((warranty) => warranty.active)
    .flatMap((warranty) => {
      const invoice = byBooking.get(warranty.bookingId);
      if (!invoice) return [];

      return [
        {
          bookingId: warranty.bookingId,
          reference: warranty.reference,
          shopName: warranty.shopName,
          serviceName: warranty.serviceName,
          amountPence: invoice.totalPence,
          currency: invoice.currency,
          startedAt: warranty.completedAt,
          expiresAt: warranty.expiresAt,
          daysLeft: warranty.daysLeft,
        },
      ];
    });
}

/**
 * How much of a warranty window has elapsed, 0–100.
 *
 * Null when the window has no known start. `completed_at` is set by the
 * completion trigger, so its absence means a row completed before that trigger
 * existed — and a bar drawn from a guessed start date would be a made-up number
 * on a page about money. The caller shows the days-left line without a bar.
 */
function elapsedPercent(job: HeldJob, now: Date): number | null {
  if (!job.startedAt) return null;

  const start = new Date(job.startedAt).getTime();
  const end = new Date(job.expiresAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  return Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
}

function EscrowTracker({ held, now }: { held: HeldJob[]; now: Date }) {
  return (
    <section>
      <SectionHeader title="Held in escrow" />

      <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <p className="max-w-prose text-sm leading-relaxed text-steel">
          When a repair is finished your money is held until the warranty window
          closes, so there is something to put right if the fault comes back.
        </p>

        {held.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-4">
            {held.map((job) => {
              const percent = elapsedPercent(job, now);
              const days = daysUntil(job.expiresAt, now);

              return (
                <li
                  key={job.bookingId}
                  className="rounded-machined border border-hairline bg-bench-sunk/40 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/billing/${job.reference}`}
                        className="font-display text-base uppercase tracking-wide text-enamel hover:text-signal"
                      >
                        {job.shopName}
                      </Link>
                      <p className="truncate pt-0.5 text-xs text-steel">
                        {job.serviceName ?? "Repair"} ·{" "}
                        <span className="font-mono uppercase tracking-[0.06em]">
                          {job.reference}
                        </span>
                      </p>
                    </div>

                    <p className="font-mono tabular-nums text-enamel">
                      {formatMoney(job.amountPence, job.currency)}
                    </p>
                  </div>

                  {percent === null ? null : (
                    <Progress
                      value={percent}
                      // Signal, because an open window is live state: this is the
                      // money a claim could still reverse.
                      tone="signal"
                      aria-label={`Warranty window for ${job.reference}`}
                      className="mt-3"
                    />
                  )}

                  <p className="pt-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                    {days === 0
                      ? "Releases today"
                      : `Releases in ${pluralize(days, "day")}`}{" "}
                    <span className="text-steel-soft">
                      · {formatDay(job.expiresAt)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-machined border border-dashed border-hairline bg-bench/40 px-4 py-6 text-center text-sm text-steel">
            Nothing is being held right now. Money appears here between a repair
            being finished and its warranty window closing.
          </p>
        )}
      </div>
    </section>
  );
}
