import { formatMoney } from "@/lib/format";

/**
 * How an invoice total is made up.
 *
 * A ruled, right-aligned mono column — the one place the site treats money as
 * a ledger rather than a display number, so everything sits on the same right
 * edge and reads down for a running sum.
 *
 * `refundedPence` is not part of the breakdown itself but is owed by the same
 * figures: an invoice that was refunded still carries its original total, and
 * the person looking at it should not have to subtract to see what happened.
 * The refund line renders only when it is non-zero, because a "£0 refunded"
 * row on every paid invoice is noise.
 */
export function CostBreakdown({
  servicePence,
  platformFeePence,
  taxPence,
  totalPence,
  currency = "GBP",
  refundedPence = 0,
}: {
  /** The repair itself, before fee and tax. */
  servicePence: number;
  platformFeePence: number;
  taxPence: number;
  totalPence: number;
  currency?: string;
  refundedPence?: number;
}) {
  return (
    <dl className="flex flex-col gap-2">
      <Row label="Service" value={formatMoney(servicePence, currency)} />
      <Row label="Platform fee" value={formatMoney(platformFeePence, currency)} />
      {/* A shop that charges no VAT must not be asked to explain a £0 row. */}
      {taxPence > 0 ? (
        <Row label="VAT" value={formatMoney(taxPence, currency)} />
      ) : null}

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-2.5">
        <dt className="font-display text-sm uppercase tracking-wide text-enamel">Total</dt>
        <dd className="font-mono text-lg font-semibold tabular-nums text-enamel">
          {formatMoney(totalPence, currency)}
        </dd>
      </div>

      {refundedPence > 0 ? (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-steel">Refunded</dt>
          <dd className="font-mono tabular-nums text-verdigris">
            {formatMoney(refundedPence, currency)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-steel">{label}</dt>
      <dd className="font-mono tabular-nums text-enamel">{value}</dd>
    </div>
  );
}
