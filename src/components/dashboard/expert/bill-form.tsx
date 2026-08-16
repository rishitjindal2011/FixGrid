"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { submitBill } from "@/lib/dashboard/expert-actions";
import { formatMoney } from "@/lib/format";

/**
 * Filing the bill on a finished job, and claiming the 5% against it.
 *
 * Two things worth knowing from the shop's side, and the form says both:
 *
 *   • **The fee is not deducted from this.** The customer pays the platform fee on
 *     top of the repair. What is typed here is what the shop is owed, in full.
 *   • **The 5% is not instant.** It is credited after we have checked the bill,
 *     because a self-approved rebate would be a shop writing its own cheque.
 *     Promising it immediately and then not paying it for a day is worse than
 *     saying so up front.
 *
 * One bill per job, enforced by a unique index rather than by this form — so the
 * already-filed state below is a report of what the database said, not a guess.
 */
export function BillForm({
  bookingId,
  quotedMinor,
  currency,
  existing,
}: {
  bookingId: string;
  /** Prefills the field: the quote is the shop's own best starting figure. */
  quotedMinor: number | null;
  currency: string;
  /** The bill already on this job, if there is one. */
  existing: {
    amountMinor: number;
    status: "pending" | "approved" | "rejected";
    rebateMinor: number | null;
    reviewNote: string | null;
  } | null;
}) {
  const [state, action, pending] = useActionState(submitBill, BOOKING_INITIAL_STATE);

  if (existing) {
    const tone =
      existing.status === "approved"
        ? "border-verdigris/30 bg-verdigris-wash"
        : existing.status === "rejected"
          ? "border-rust/30 bg-rust-wash"
          : "border-hairline bg-bench";

    return (
      <div className={`rounded-machined border px-3 py-2.5 ${tone}`}>
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-steel">Bill filed</span>
          <span className="font-mono tabular-nums text-enamel">
            {formatMoney(existing.amountMinor, currency)}
          </span>
        </p>

        {existing.status === "pending" ? (
          <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-steel">
            <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Waiting on us to check it. Your{" "}
            {formatMoney(Math.floor(existing.amountMinor * 0.05), currency)} rebate is
            credited once it is approved.
          </p>
        ) : null}

        {existing.status === "approved" ? (
          <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-enamel">
            <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-verdigris" />
            {formatMoney(existing.rebateMinor ?? 0, currency)} paid into your balance.
            {/* Shown only when it differs, because a cap that did not bite is not
                worth explaining — but one that did, silently, would look like an
                error in our arithmetic. */}
            {existing.rebateMinor !== null &&
            existing.rebateMinor < Math.floor(existing.amountMinor * 0.05)
              ? " Capped at 5% of the job's own total."
              : ""}
          </p>
        ) : null}

        {existing.status === "rejected" ? (
          <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-rust">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {existing.reviewNote ?? "This bill was not accepted."}
          </p>
        ) : null}
      </div>
    );
  }

  if (state.success) {
    return (
      <p className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-enamel">
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
        {state.message ?? "Bill filed."}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bill-amount" className="eyebrow">
          What the job came to — rupees
        </label>
        <Input
          id="bill-amount"
          name="amount"
          required
          inputMode="decimal"
          autoComplete="off"
          defaultValue={quotedMinor !== null ? (quotedMinor / 100).toFixed(2) : undefined}
          placeholder="1200"
          pattern="₹?\d+(\.\d{1,2})?"
          title="Rupees and paise, like 1200 or 1200.50"
          className="font-mono tabular-nums"
        />
        <p className="text-xs leading-relaxed text-steel">
          This is the full amount you are owed — our fee is charged to the customer
          separately, not taken out of it. We add <strong>5% on top</strong> once the
          bill is checked.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-rust">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          <Receipt aria-hidden />
          {pending ? "Filing…" : "File the bill"}
        </Button>
      </div>
    </form>
  );
}
