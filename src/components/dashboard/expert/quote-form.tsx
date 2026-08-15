"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { sendQuote } from "@/lib/dashboard/expert-actions";
import { formatPriceRange } from "@/lib/format";
import type { PriceType } from "@/lib/types/marketplace";

/**
 * Answering a request with a price.
 *
 * Rendered inside a `DialogContent` rather than owning its own dialog, because
 * the trigger is the request's Accept button and that button lives with the
 * other two actions. Radix unmounts the content on close, so backing out and
 * reopening starts from a clean form instead of a stale amount and a stale
 * error.
 *
 * `sendQuote` does the work — it writes the price and moves the booking to
 * `accepted` in one go. This file never posts a status.
 */

/**
 * What the catalogue says this job should cost.
 *
 * Carried alongside the booking rather than read off it: `bookings` stores what
 * was agreed, and before anyone has agreed anything the only price in the system
 * is the one on the service. Null when the request names no service at all.
 */
export interface RequestPricing {
  priceType: PriceType;
  /** Pence. */
  minPence: number | null;
  /** Pence. */
  maxPence: number | null;
  currency: string;
}

/**
 * Does answering this request need a number typed first?
 *
 * `quote` and `from` do by definition — one advertises no price, the other only
 * a floor. So does a request with no service attached, and a `fixed` service
 * whose price was never filled in: in both of those there is no figure to commit
 * the shop to, and confirming without one would book the job at nothing.
 */
export function needsQuote(pricing: RequestPricing | null): boolean {
  if (!pricing) return true;
  if (pricing.priceType !== "fixed") return true;
  return pricing.minPence === null;
}

/**
 * Integer paise as the rupees string a money input expects. `4999` → "49.99".
 *
 * The only paise→rupees conversion in this screen, and it goes one way: the
 * server turns it back with `rupeesToPaise`, which rejects a third decimal
 * rather than rounding it. Two decimals here, always, so that round trip is
 * exact.
 */
export function paiseToRupeesInput(pence: number): string {
  return (pence / 100).toFixed(2);
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

export interface QuoteFormProps {
  bookingId: string;
  /** Shown so the shop can see what it is pricing without closing the dialog. */
  serviceName: string | null;
  pricing: RequestPricing | null;
  /** What the customer said is wrong — the thing being priced. */
  deviceDetails?: string | null;
}

export function QuoteForm({
  bookingId,
  serviceName,
  pricing,
  deviceDetails,
}: QuoteFormProps) {
  const [state, formAction, pending] = useActionState(sendQuote, BOOKING_INITIAL_STATE);

  const amountId = React.useId();
  const amountHintId = React.useId();
  const noteId = React.useId();

  // A `from` price is a floor the shop already published, so it is the honest
  // starting point. A `quote` service has published nothing, and prefilling a
  // number there would invent one.
  const suggested =
    pricing && pricing.priceType === "from" && pricing.minPence !== null
      ? paiseToRupeesInput(pricing.minPence)
      : undefined;

  if (state.success) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Quote sent</DialogTitle>
          <DialogDescription>{state.message ?? "Quote sent."}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-enamel">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
            The customer has it now. The slot is not held until they accept, so the job
            stays out of your schedule until it turns up as confirmed.
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
      <input type="hidden" name="bookingId" value={bookingId} />

      <DialogHeader>
        <DialogTitle>Send a quote</DialogTitle>
        <DialogDescription>
          The customer has to accept your price before the slot becomes theirs.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-4">
        {serviceName || deviceDetails ? (
          <div className="rounded-machined bg-bench-sunk px-3 py-2.5">
            {serviceName ? (
              <p className="text-sm text-enamel">{serviceName}</p>
            ) : null}
            {deviceDetails ? (
              <p className="pt-1 text-xs leading-relaxed text-steel">{deviceDetails}</p>
            ) : null}
            {pricing ? (
              <p className="pt-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Listed{" "}
                {formatPriceRange(
                  pricing.priceType,
                  pricing.minPence,
                  pricing.maxPence,
                  pricing.currency,
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={amountId} className="eyebrow">
            Your price — rupees
          </label>
          <Input
            id={amountId}
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={suggested}
            placeholder="49.99"
            // Mirrors the server's own test, so a stray third decimal is caught
            // before a round-trip rather than after one.
            pattern="₹?\d+(\.\d{1,2})?"
            title="Rupees and paise, like 49.99"
            aria-describedby={amountHintId}
            className="font-mono tabular-nums"
          />
          <p id={amountHintId} className="text-xs leading-relaxed text-steel">
            Rupees and paise, like 49.99. Two decimal places at most — a longer figure is
            refused rather than rounded. This is what you keep: our fee is charged to the
            customer on top, not taken out of your price.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="eyebrow">
            Note — optional
          </label>
          <Textarea
            id={noteId}
            name="note"
            rows={3}
            maxLength={2000}
            placeholder="What the price covers, parts you need to order, anything that helps them say yes."
          />
        </div>

        {state.error ? <FormError message={state.error} /> : null}
      </DialogBody>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Back
          </Button>
        </DialogClose>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send quote"}
        </Button>
      </DialogFooter>
    </form>
  );
}
