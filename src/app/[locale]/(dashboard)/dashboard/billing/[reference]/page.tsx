import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, FileWarning } from "lucide-react";

import { PrintInvoiceButton } from "@/app/(dashboard)/dashboard/billing/[reference]/print-button";
import { CostBreakdown } from "@/components/dashboard/cost-breakdown";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PaymentStatusBadge } from "@/components/dashboard/invoice-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvoice, type InvoiceDetail } from "@/lib/dashboard/billing";
import { formatDateLong, formatMoney, formatSlot } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { DELIVERY_MODE_LABELS } from "@/lib/types/marketplace";

/**
 * The invoice timezone.
 *
 * `getInvoice` returns the shop's name, slug and address but not its timezone,
 * so the slot cannot be rendered in the shop's own zone here. Stating the zone
 * explicitly is the rule that matters — a server render that used the machine's
 * local zone would hydrate to the reader's and disagree with itself — and every
 * shop on the platform trades in the UK, so this is the honest constant rather
 * than a guess.
 */
const INVOICE_TZ = "Europe/London";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;

  return {
    title: `Invoice ${reference}`,
    robots: { index: false, follow: false },
  };
}

/**
 * One invoice, laid out to be printed.
 *
 * The print rules are a real stylesheet rather than only Tailwind `print:`
 * variants because the chrome this page has to hide — the sidebar rail and the
 * sticky topbar — is rendered by `(dashboard)/layout.tsx`, which this route does
 * not own and cannot annotate. Selecting around the sheet is the one technique
 * that works without reaching into another component's markup. Everything
 * inside the sheet is then styled for paper with `print:` utilities as usual.
 *
 * A missing invoice renders an empty state instead of a 404. `getInvoice`
 * returns null both for "no such reference" and for "the bookings table does not
 * exist yet", and before the migration is run the second is the common case —
 * a customer following a link from a printed invoice should be told what is
 * wrong, not shown the site's not-found page.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect(`/login?next=/dashboard/billing/${reference}`);

  const invoice = await getInvoice(user.id, reference);

  if (!invoice) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <EmptyState
          icon={FileWarning}
          title="Invoice not found"
          description={`We could not find an invoice under ${reference} on your account. Check the reference, or open it from your billing history.`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print{
  @page{margin:14mm}
  html,body{background:#fff}
  /* Everything that is neither the invoice, inside it, nor on its ancestor
     chain. display:none rather than visibility:hidden so the hidden chrome
     takes up no space and cannot push a blank page onto the end. */
  body *:not(:has(#invoice-sheet)):not(#invoice-sheet):not(#invoice-sheet *){display:none!important}
  /* The ancestor chain stays, minus the sidebar gutter and page padding it
     carries for the screen. */
  body :has(#invoice-sheet){display:block!important;margin:0!important;padding:0!important;max-width:none!important}
}`,
        }}
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <BackLink />
          <PrintInvoiceButton />
        </div>

        <InvoiceSheet invoice={invoice} customerName={user.displayName} customerEmail={user.email} />
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/billing"
      className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-enamel"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Billing
    </Link>
  );
}

function InvoiceSheet({
  invoice,
  customerName,
  customerEmail,
}: {
  invoice: InvoiceDetail;
  customerName: string;
  customerEmail: string | null;
}) {
  const start = slotStart(invoice.slot);
  const end = slotEnd(invoice.slot);

  return (
    <article
      id="invoice-sheet"
      className="rounded-machined border border-hairline bg-chalk shadow-bench print:rounded-none print:border-0 print:bg-white print:shadow-none"
    >
      {/* ── Letterhead ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline px-5 py-6 sm:px-8 print:border-black/40 print:px-0">
        <div>
          <p className="eyebrow print:text-black">Invoice</p>
          <h1 className="pt-2 font-mono text-2xl uppercase tracking-[0.06em] text-enamel print:text-black">
            {invoice.reference}
          </h1>
          <p className="pt-2 text-sm text-steel print:text-black">
            Issued{" "}
            <time dateTime={invoice.date} className="font-mono tabular-nums">
              {formatDateLong(invoice.date, INVOICE_TZ)}
            </time>
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-lg uppercase tracking-wide text-enamel print:text-black">
            {SITE_NAME}
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <PaymentStatusBadge status={invoice.status} />
            <StatusBadge status={invoice.bookingStatus} />
          </div>
        </div>
      </header>

      {/* ── Parties ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 border-b border-hairline px-5 py-6 sm:grid-cols-2 sm:px-8 print:border-black/20 print:px-0">
        <section>
          <h2 className="eyebrow print:text-black">Billed to</h2>
          <p className="pt-2.5 font-display text-base uppercase tracking-wide text-enamel print:text-black">
            {customerName}
          </p>
          {customerEmail ? (
            <p className="pt-1 font-mono text-xs text-steel print:text-black">
              {customerEmail}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="eyebrow print:text-black">Repaired by</h2>
          <p className="pt-2.5 font-display text-base uppercase tracking-wide text-enamel print:text-black">
            {invoice.shopSlug ? (
              <>
                {/* The link is dead on paper, so print gets the name alone. */}
                <Link href={`/expert/${invoice.shopSlug}`} className="hover:text-signal print:hidden">
                  {invoice.shopName}
                </Link>
                <span className="hidden print:inline">{invoice.shopName}</span>
              </>
            ) : (
              invoice.shopName
            )}
          </p>
          {invoice.shopAddress ? (
            <p className="max-w-prose pt-1 text-sm leading-relaxed text-steel print:text-black">
              {invoice.shopAddress}
            </p>
          ) : null}
        </section>
      </div>

      {/* ── Line items ─────────────────────────────────────────────────── */}
      <div className="px-5 py-6 sm:px-8 print:px-0">
        <h2 className="eyebrow print:text-black">Line items</h2>

        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline print:border-black/40">
              <th className="py-2 text-left font-mono text-eyebrow uppercase tracking-[0.14em] font-normal text-steel print:text-black">
                Description
              </th>
              <th className="py-2 text-right font-mono text-eyebrow uppercase tracking-[0.14em] font-normal text-steel print:text-black">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hairline print:border-black/20">
              <td className="py-3 pr-4 align-top text-enamel print:text-black">
                <span className="block font-medium">
                  {invoice.serviceName ?? "Repair"}
                </span>
                <span className="block pt-1 text-xs text-steel print:text-black">
                  {DELIVERY_MODE_LABELS[invoice.deliveryMode]}
                  {start && end ? ` · ${formatSlot(start, end, INVOICE_TZ)}` : null}
                </span>
              </td>
              <td className="py-3 text-right align-top font-mono tabular-nums text-enamel print:text-black">
                {formatMoney(invoice.servicePence, invoice.currency)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Breakdown ────────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs">
            <CostBreakdown
              servicePence={invoice.servicePence}
              platformFeePence={invoice.platformFeePence}
              taxPence={invoice.taxPence}
              totalPence={invoice.totalPence}
              currency={invoice.currency}
              refundedPence={invoice.refundedPence}
            />
          </div>
        </div>
      </div>

      {/* ── Refunds ────────────────────────────────────────────────────── */}
      {invoice.refunds.length > 0 ? (
        <div className="border-t border-hairline px-5 py-6 sm:px-8 print:border-black/20 print:px-0">
          <h2 className="eyebrow print:text-black">Refunds against this invoice</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {invoice.refunds.map((refund) => (
              <li
                key={refund.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline pb-2 last:border-0 print:border-black/20"
              >
                <span className="text-sm text-steel print:text-black">
                  <time dateTime={refund.createdAt} className="font-mono tabular-nums">
                    {formatDateLong(refund.createdAt, INVOICE_TZ)}
                  </time>
                  {refund.reason ? ` · ${refund.reason}` : null}
                </span>
                <span className="font-mono tabular-nums text-verdigris print:text-black">
                  {formatMoney(refund.amountPence, refund.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className="border-t border-hairline px-5 py-5 sm:px-8 print:border-black/40 print:px-0">
        <p className="max-w-prose text-xs leading-relaxed text-steel print:text-black">
          Amounts are in {invoice.currency} and include the platform fee shown.
          Payment is held until the warranty window on this repair closes. Keep
          this invoice — its reference is what a shop or our support team will
          ask for.
        </p>
      </footer>
    </article>
  );
}
