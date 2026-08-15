"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { requestPayout } from "@/lib/dashboard/expert-actions";
import { formatMoney } from "@/lib/format";

/**
 * Withdraw released earnings.
 *
 * Three states, and which one renders is decided before anything is drawn
 * rather than by disabling a button and hoping:
 *
 *   • **No destination.** `fixer_profiles.payout_email` is null, so there is
 *     nowhere to send money. A withdraw button here would fail on submit no
 *     matter what was typed, so the control is replaced by the link that fixes
 *     it. Same reasoning as leaving `website` off the profile form: a control
 *     that cannot succeed should not exist.
 *
 *   • **Nothing released.** Earnings exist but are still inside their warranty
 *     windows. The button stays visible and disabled — the shop needs to see
 *     that withdrawing is a thing that will be possible, and why it is not yet.
 *
 *   • **Money waiting.** The dialog, defaulted to the whole balance.
 *
 * The amount is posted as the rupees string the shop typed. `requestPayout` owns
 * the conversion to integer paise and rejects a third decimal rather than
 * rounding it — doing it in both places is how the two drift apart.
 */
export function WithdrawDialog({
  fixerId,
  availablePence,
  currency = "INR",
  payoutEmail,
}: {
  fixerId: string;
  availablePence: number;
  currency?: string;
  /** Where a payout would land. Null when the shop has not set one. */
  payoutEmail: string | null;
}) {
  if (!payoutEmail) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs leading-relaxed text-steel">
          Add a payout email before you withdraw — that is where we send the money.
        </p>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/expert/profile">
            <ArrowUpRight aria-hidden />
            Add payout details
          </Link>
        </Button>
      </div>
    );
  }

  if (availablePence <= 0) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full" disabled>
          <Banknote aria-hidden />
          Withdraw
        </Button>
        <p className="text-xs leading-relaxed text-steel">
          Nothing is released yet. Money lands here as each warranty window closes.
        </p>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm" className="w-full">
          <Banknote aria-hidden />
          Withdraw
        </Button>
      </DialogTrigger>

      {/* The form lives inside the content so Radix unmounting on close resets
          its action state — reopening starts blank rather than replaying the
          last attempt's error or its confirmation. */}
      <DialogContent>
        <WithdrawForm
          fixerId={fixerId}
          availablePence={availablePence}
          currency={currency}
          payoutEmail={payoutEmail}
        />
      </DialogContent>
    </Dialog>
  );
}

function WithdrawForm({
  fixerId,
  availablePence,
  currency,
  payoutEmail,
}: {
  fixerId: string;
  availablePence: number;
  currency: string;
  payoutEmail: string;
}) {
  const [state, formAction, pending] = useActionState(requestPayout, BOOKING_INITIAL_STATE);
  const amountId = React.useId();

  // Exact, not rounded: the balance is already integer paise, so two decimal
  // places reproduce it precisely and the server's parser accepts it as typed.
  const availableRupees = (availablePence / 100).toFixed(2);

  if (state.success) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Payout requested</DialogTitle>
          <DialogDescription>{state.message ?? "Payout requested."}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-enamel">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
            It is in the queue for{" "}
            <span className="font-mono text-xs">{payoutEmail}</span>. You will see it in
            your payout history below with its status.
          </p>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" size="sm">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="fixerId" value={fixerId} />

      <DialogHeader>
        <DialogTitle>Withdraw earnings</DialogTitle>
        <DialogDescription>
          Released money only — anything still inside a warranty window stays put until
          that window closes.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-machined border border-hairline bg-bench-sunk/40 px-3 py-2.5 text-sm">
          <dt className="eyebrow self-center">Available</dt>
          <dd className="text-right font-mono tabular-nums text-enamel">
            {formatMoney(availablePence, currency)}
          </dd>

          <dt className="eyebrow self-center">Destination</dt>
          <dd className="truncate text-right font-mono text-xs text-steel">{payoutEmail}</dd>
        </dl>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={amountId}>Amount in rupees</Label>
          <Input
            id={amountId}
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            // Text rather than number: a number input silently accepts "1e3"
            // and strips what the browser dislikes, which loses the two-decimal
            // rule the server enforces. The pattern gives the same refusal here.
            pattern="\d+(\.\d{1,2})?"
            defaultValue={availableRupees}
            aria-describedby={`${amountId}-hint`}
            className="font-mono tabular-nums"
          />
          <p id={`${amountId}-hint`} className="text-xs text-steel">
            Up to {formatMoney(availablePence, currency)}. Rupees and paise, like{" "}
            <span className="font-mono">{availableRupees}</span>.
          </p>
        </div>

        {state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Requesting…" : "Request payout"}
        </Button>
      </DialogFooter>
    </form>
  );
}
