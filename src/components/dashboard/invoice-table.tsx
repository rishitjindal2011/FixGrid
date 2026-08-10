import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Invoice, RefundEntry } from "@/lib/dashboard/billing";
import { formatDay, formatMoney } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Invoice and refund history.
 *
 * Every numeric column — date, reference, amount — is mono and the money is
 * right-aligned, so a column of totals can be read down for its magnitude
 * rather than parsed row by row. That is the whole reason tabular figures exist.
 *
 * The `Table` primitive already wraps itself in a horizontal scroller, so the
 * narrow screen case is a scroll rather than a reflow into cards: an invoice
 * history is a ledger, and a ledger that stops lining up stops being readable.
 * The columns that would break the layout first are hidden below `sm` instead.
 */

/**
 * How each payment state is worded to the person who owes the money.
 *
 * `pending` is deliberately not "unpaid". Until the payment provider is wired
 * up no invoice has ever been presented for collection, so wording it as
 * arrears would accuse the customer of something that has not happened.
 */
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  authorized: "Authorised",
  captured: "Paid",
  refunded: "Refunded",
  partially_refunded: "Part refunded",
  failed: "Payment failed",
};

/**
 * Badge tone per payment state, following the token rule that signal orange is
 * live state only. `authorized` is money on hold — genuinely in flight — so it
 * earns signal; `captured` is settled, so verdigris; everything else is neutral.
 * `failed` overrides to rust, which the `Badge` variants do not carry because
 * nothing else in the app has a destructive badge.
 */
const PAYMENT_STATUS_TONE: Record<
  PaymentStatus,
  { variant: "neutral" | "verified" | "signal" | "solid"; className?: string }
> = {
  pending: { variant: "neutral" },
  authorized: { variant: "signal" },
  captured: { variant: "verified" },
  refunded: { variant: "neutral" },
  partially_refunded: { variant: "neutral" },
  failed: { variant: "neutral", className: "border-rust/30 bg-rust-wash text-rust" },
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const tone = PAYMENT_STATUS_TONE[status];

  return (
    <Badge variant={tone.variant} className={cn(tone.className, className)}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="hidden sm:table-cell">Shop</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            {/* The chevron column is labelled for screen readers only — a
                visible "Invoice" header above a row of chevrons is noise. */}
            <TableHead className="w-10">
              <span className="sr-only">Invoice</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.bookingId}>
              <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-steel">
                <time dateTime={invoice.date}>{formatDay(invoice.date)}</time>
              </TableCell>

              <TableCell>
                <Link
                  href={`/dashboard/billing/${invoice.reference}`}
                  className="font-mono text-xs uppercase tracking-[0.06em] text-enamel hover:text-signal hover:underline"
                >
                  {invoice.reference}
                </Link>
              </TableCell>

              <TableCell className="hidden max-w-[22ch] truncate sm:table-cell">
                {invoice.shopName}
              </TableCell>

              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-enamel">
                {formatMoney(invoice.totalPence, invoice.currency)}
              </TableCell>

              <TableCell>
                <PaymentStatusBadge status={invoice.status} />
              </TableCell>

              <TableCell className="text-right">
                <Link
                  href={`/dashboard/billing/${invoice.reference}`}
                  className="inline-grid size-8 place-items-center rounded-machined text-steel-soft transition-colors hover:bg-bench hover:text-enamel"
                >
                  <ChevronRight aria-hidden className="size-4" />
                  <span className="sr-only">View invoice {invoice.reference}</span>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Refunds, listed apart from the invoices they reverse.
 *
 * Kept separate rather than folded in as negative rows: a refund is its own
 * event with its own date and reason, and netting it against the original total
 * would hide both the fact that something went wrong and when it was put right.
 */
export function RefundTable({ refunds }: { refunds: RefundEntry[] }) {
  return (
    <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="hidden sm:table-cell">Shop</TableHead>
            <TableHead className="hidden md:table-cell">Reason</TableHead>
            <TableHead className="text-right">Refunded</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {refunds.map((refund) => (
            <TableRow key={refund.id}>
              <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-steel">
                <time dateTime={refund.createdAt}>{formatDay(refund.createdAt)}</time>
              </TableCell>

              <TableCell>
                <Link
                  href={`/dashboard/billing/${refund.reference}`}
                  className="font-mono text-xs uppercase tracking-[0.06em] text-enamel hover:text-signal hover:underline"
                >
                  {refund.reference}
                </Link>
              </TableCell>

              <TableCell className="hidden max-w-[22ch] truncate sm:table-cell">
                {refund.shopName}
              </TableCell>

              <TableCell className="hidden max-w-[32ch] truncate text-steel md:table-cell">
                {refund.reason ?? "—"}
              </TableCell>

              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-verdigris">
                {formatMoney(refund.amountPence, refund.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
