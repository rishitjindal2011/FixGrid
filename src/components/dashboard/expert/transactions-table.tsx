import Link from "next/link";

import { PaymentStatusBadge } from "@/components/dashboard/invoice-table";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExpertTransaction } from "@/lib/dashboard/expert";
import { formatDay, formatMoney } from "@/lib/format";
import type { PayoutRow, PayoutStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * The shop's money ledger, and the payouts that empty it.
 *
 * Two tables rather than one because they answer different questions — a
 * transaction is what a customer paid, a payout is what left for the bank — and
 * netting them together would hide both.
 *
 * Every numeric column is mono and right-aligned so a column of figures can be
 * read down for its magnitude, which is the entire reason tabular figures
 * exist. `Table` already wraps itself in a horizontal scroller, so narrow
 * screens scroll rather than reflow: a ledger that stops lining up stops being
 * a ledger. The columns that would break first are hidden below `sm`/`md`
 * instead, and none of them is a figure the totals depend on.
 *
 * `payments` and `payouts` stay empty until the Stripe integration lands. That
 * is a deployment state, not an error, and the empty states below say so
 * plainly rather than implying something failed.
 */

export function TransactionsTable({
  transactions,
  customerNames,
  timezone,
}: {
  transactions: ExpertTransaction[];
  /**
   * Booking id → customer display name. `payments` hangs off the booking and
   * carries no customer of its own, so the name is stitched in by the page from
   * the bookings it already has. A missing entry renders as a dash rather than
   * dropping the row — an unnamed line of money is still money.
   */
  customerNames: Map<string, string>;
  /** The shop's own zone — a ledger dated in the deploy region's clock is wrong. */
  timezone: string;
}) {
  return (
    <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead className="hidden sm:table-cell">Customer</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="hidden text-right md:table-cell">Fee</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.map((transaction) => {
            // `captured_at` is the day the money actually moved; a pending
            // charge has none, so it falls back to when the row was raised.
            const date = transaction.capturedAt ?? transaction.createdAt;

            return (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-steel">
                  <time dateTime={date}>{formatDay(date, timezone)}</time>
                </TableCell>

                <TableCell>
                  <Link
                    href={`/dashboard/expert/bookings/${transaction.bookingReference}`}
                    className="font-mono text-xs uppercase tracking-[0.06em] text-enamel hover:text-signal hover:underline"
                  >
                    {transaction.bookingReference || "—"}
                  </Link>
                  {transaction.serviceName ? (
                    <p className="max-w-[22ch] truncate pt-0.5 text-xs text-steel-soft">
                      {transaction.serviceName}
                    </p>
                  ) : null}
                </TableCell>

                <TableCell className="hidden max-w-[20ch] truncate sm:table-cell">
                  {customerNames.get(transaction.bookingId) ?? "—"}
                </TableCell>

                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-enamel">
                  {formatMoney(transaction.grossPence, transaction.currency)}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-right font-mono tabular-nums text-steel md:table-cell">
                  −{formatMoney(transaction.feePence, transaction.currency)}
                </TableCell>

                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-enamel">
                  {formatMoney(transaction.netPence, transaction.currency)}
                </TableCell>

                <TableCell>
                  <PaymentStatusBadge status={transaction.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Payouts ──────────────────────────────────────────────────────────────── */

const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  scheduled: "Scheduled",
  in_transit: "On its way",
  paid: "Paid",
  failed: "Failed",
};

/**
 * Tone per payout state, following the token rule that signal orange is live
 * state only. `in_transit` is money genuinely moving right now, so it earns
 * signal; `paid` has landed, so verdigris. `failed` overrides to rust, which
 * `Badge` carries no variant for because nothing else here is destructive.
 */
const PAYOUT_STATUS_TONE: Record<
  PayoutStatus,
  { variant: "neutral" | "verified" | "signal" | "solid"; className?: string }
> = {
  scheduled: { variant: "neutral" },
  in_transit: { variant: "signal" },
  paid: { variant: "verified" },
  failed: { variant: "neutral", className: "border-rust/30 bg-rust-wash text-rust" },
};

export function PayoutsTable({
  payouts,
  timezone,
}: {
  payouts: PayoutRow[];
  timezone: string;
}) {
  return (
    <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Requested</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Settled</TableHead>
            <TableHead className="hidden md:table-cell">Reference</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {payouts.map((payout) => {
            const tone = PAYOUT_STATUS_TONE[payout.status];
            // Paid wins over scheduled: once the money has landed, the date it
            // was expected on is history nobody needs.
            const settled = payout.paid_at ?? payout.scheduled_for;

            return (
              <TableRow key={payout.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-steel">
                  <time dateTime={payout.created_at}>
                    {formatDay(payout.created_at, timezone)}
                  </time>
                </TableCell>

                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-enamel">
                  {formatMoney(payout.amount, payout.currency)}
                </TableCell>

                <TableCell>
                  <Badge variant={tone.variant} className={cn(tone.className)}>
                    {PAYOUT_STATUS_LABELS[payout.status]}
                  </Badge>
                </TableCell>

                <TableCell className="hidden whitespace-nowrap font-mono text-xs tabular-nums text-steel sm:table-cell">
                  {settled ? (
                    <time dateTime={settled}>{formatDay(settled, timezone)}</time>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="hidden max-w-[24ch] truncate font-mono text-xs text-steel-soft md:table-cell">
                  {payout.provider_payout_id ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
