"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { confirmTopUp, createTopUpIntent } from "@/lib/wallet/topup";
import { TOPUP_INITIAL_STATE, type TopUpMethod } from "@/lib/wallet/topup-state";
import { cn } from "@/lib/utils";

/**
 * One payment sheet, for anything the platform charges for.
 *
 * **Why it exists.** Both the plan picker and the join form used to debit the
 * wallet the instant you pressed the button. That is the wrong default for a
 * payment: money leaving an account should be a thing somebody chose, on a screen
 * that says how much and from where, not a side effect of pressing "Submit".
 *
 * **How it avoids a second gateway.** The sheet's only job is to make sure the
 * balance covers the amount, and then to run the caller's purchase. Paying from
 * balance skips straight to that; paying by card, UPI or net banking runs the same
 * mock gateway a top-up uses — for exactly the purchase amount — and then the
 * purchase settles against the balance like any other. So there is still one
 * gateway implementation, with the claim-then-credit guarantee already proven on
 * it, and the ledger honestly records both movements rather than inventing a
 * second kind of payment that bypasses the wallet.
 *
 * A consequence worth knowing: if the gateway succeeds and the purchase then
 * fails, the money is sitting in the customer's balance rather than lost. That is
 * the recoverable direction, it is visible on their own statement, and they can
 * simply press the button again.
 *
 * The three actions arrive as props rather than being imported, because the
 * purchase differs per caller while the funding never does.
 */

type Step = "choose" | "gateway" | "working" | "done" | "failed";

const METHODS: { key: TopUpMethod; label: string; icon: typeof CreditCard }[] = [
  { key: "card", label: "Card", icon: CreditCard },
  { key: "upi", label: "UPI", icon: Smartphone },
  { key: "netbanking", label: "Net banking", icon: Landmark },
];

/** What the simulated gateway asks for, and how to make it refuse. */
const METHOD_FIELDS: Record<
  TopUpMethod,
  { label: string; placeholder: string; hint: string } | null
> = {
  card: {
    label: "Card number",
    placeholder: "4111 1111 1111 1111",
    hint: "Any 16 digits works. End it in 0000 to see a declined payment.",
  },
  upi: {
    label: "UPI ID",
    placeholder: "you@bank",
    hint: "Any id in name@bank form works. Start it with fail@ to see a decline.",
  },
  netbanking: null,
};

function randomKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface PurchaseResult {
  error: string | null;
  success: boolean;
  message?: string;
}

export function PaymentSheet({
  open,
  onClose,
  amountMinor,
  balanceMinor,
  title,
  description,
  /** Extra fields the purchase action needs, forwarded verbatim. */
  purchaseFields,
  purchaseAction,
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  amountMinor: number;
  balanceMinor: number;
  title: string;
  description: string;
  purchaseFields: Record<string, string>;
  purchaseAction: (formData: FormData) => Promise<PurchaseResult>;
  confirmLabel?: string;
}) {
  const [step, setStep] = React.useState<Step>("choose");
  const [method, setMethod] = React.useState<TopUpMethod>("card");
  const [note, setNote] = React.useState<string | null>(null);
  const [key, setKey] = React.useState(randomKey);

  const [intentState, startIntent, starting] = useActionState(
    createTopUpIntent,
    TOPUP_INITIAL_STATE,
  );

  const canPayFromBalance = balanceMinor >= amountMinor;

  /** Run the caller's purchase. Shared by both routes into it. */
  const runPurchase = React.useCallback(async () => {
    setStep("working");

    const formData = new FormData();
    for (const [name, value] of Object.entries(purchaseFields)) {
      formData.set(name, value);
    }

    const result = await purchaseAction(formData);

    if (result.success) {
      setNote(result.message ?? "Payment complete.");
      setStep("done");
    } else {
      setNote(result.error ?? "That payment could not be completed.");
      setStep("failed");
    }
  }, [purchaseAction, purchaseFields]);

  /*
   * Confirm the gateway leg, then buy.
   *
   * Deliberately one handler rather than an effect watching the confirm's returned
   * state. Chaining through an effect means setting state from inside one, which is
   * a lint error here and a lint error for a reason (see the header of
   * `booking-form.tsx`) — and it is also the wrong shape: these two steps are one
   * user action, not two renders that happen to follow each other. A server action
   * is an ordinary async function when called directly, so it composes.
   */
  async function confirmAndBuy(formData: FormData) {
    setStep("working");

    const outcome = await confirmTopUp(TOPUP_INITIAL_STATE, formData);

    if (!outcome.outcome?.ok) {
      setNote(
        outcome.outcome?.message ?? outcome.error ?? "That payment was declined.",
      );
      setStep("failed");
      return;
    }

    // The balance now covers the amount, so the purchase settles against it.
    await runPurchase();
  }

  function reset() {
    setStep("choose");
    setNote(null);
    setKey(randomKey());
  }

  function close() {
    reset();
    onClose();
  }

  const intent = intentState.intent;
  const field = METHOD_FIELDS[method];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent>
      <DialogHeader>
        <DialogTitle id="payment-sheet-title">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <DialogBody>
        {/* The amount, always visible. Nothing below it changes what is being
            charged, so it sits outside the step machine. */}
        <p className="flex items-baseline justify-between gap-3 rounded-machined border border-hairline bg-bench px-3 py-2.5">
          <span className="text-sm text-steel">Amount</span>
          <span className="font-mono text-lg tabular-nums text-enamel">
            {formatMoney(amountMinor)}
          </span>
        </p>

        {step === "working" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 aria-hidden className="size-8 animate-spin text-signal" />
            <p className="text-sm text-steel" role="status">
              Completing your payment…
            </p>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            {/* A one-shot scale-in rather than a loop: the tick is a result, and
                something that keeps animating reads as still working. */}
            <CheckCircle2
              aria-hidden
              className="size-10 animate-in zoom-in-50 duration-300 text-verdigris"
            />
            <p className="text-sm leading-relaxed text-enamel" role="status">
              {note}
            </p>
          </div>
        ) : null}

        {step === "failed" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle aria-hidden className="size-8 text-rust" />
            <p className="text-sm leading-relaxed text-rust" role="alert">
              {note}
            </p>
            <p className="text-xs leading-relaxed text-steel">
              Nothing further has been charged.
            </p>
          </div>
        ) : null}

        {step === "choose" ? (
          <div className="flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={() => void runPurchase()}
              disabled={!canPayFromBalance}
              className={cn(
                "flex items-center justify-between gap-3 rounded-machined border px-3 py-3 text-left transition-colors",
                canPayFromBalance
                  ? "border-hairline bg-chalk hover:border-signal"
                  : "cursor-not-allowed border-hairline bg-bench opacity-60",
              )}
            >
              <span className="flex items-center gap-2">
                <Wallet aria-hidden className="size-4 shrink-0 text-steel-soft" />
                <span>
                  <span className="block text-sm text-enamel">Pay from balance</span>
                  <span className="block text-xs text-steel">
                    {formatMoney(balanceMinor)} available
                    {canPayFromBalance ? "" : " — not enough for this"}
                  </span>
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStep("gateway")}
              className="flex items-center gap-2 rounded-machined border border-hairline bg-chalk px-3 py-3 text-left transition-colors hover:border-signal"
            >
              <CreditCard aria-hidden className="size-4 shrink-0 text-steel-soft" />
              <span>
                <span className="block text-sm text-enamel">
                  Pay by card, UPI or net banking
                </span>
                <span className="block text-xs text-steel">
                  Simulated — nothing is charged to a real account
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {step === "gateway" && !intent ? (
          <form action={startIntent} className="flex flex-col gap-4 pt-4">
            <input type="hidden" name="idempotencyKey" value={key} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="amount" value={(amountMinor / 100).toFixed(2)} />

            <div className="flex flex-col gap-1.5">
              <span className="eyebrow">Pay with</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {METHODS.map(({ key: value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    aria-pressed={method === value}
                    className={cn(
                      "flex items-center gap-2 rounded-machined border px-3 py-2.5 text-sm transition-colors",
                      method === value
                        ? "border-signal bg-signal-wash text-enamel"
                        : "border-hairline bg-bench text-steel hover:border-steel-soft",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {intentState.error ? (
              <p role="alert" className="text-sm text-rust">
                {intentState.error}
              </p>
            ) : null}

            <Button type="submit" size="sm" disabled={starting}>
              {starting ? "Starting…" : "Continue"}
            </Button>
          </form>
        ) : null}

        {step === "gateway" && intent ? (
          <form action={confirmAndBuy} className="flex flex-col gap-4 pt-4">
            <input type="hidden" name="reference" value={intent.reference} />

            {field ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sheet-credential" className="eyebrow">
                  {field.label}
                </label>
                <Input
                  id="sheet-credential"
                  name="credential"
                  required
                  autoComplete="off"
                  inputMode={intent.method === "card" ? "numeric" : "text"}
                  placeholder={field.placeholder}
                  className="font-mono tabular-nums"
                />
                <p className="text-xs leading-relaxed text-steel">{field.hint}</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-steel">
                Net banking is simulated end to end — there is no login step.
              </p>
            )}

            <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
              {intent.reference}
            </p>

            <Button type="submit" size="sm">
              Pay {formatMoney(amountMinor)}
            </Button>
          </form>
        ) : null}
      </DialogBody>

      <DialogFooter>
        {step === "done" ? (
          <Button type="button" onClick={close}>
            {confirmLabel ?? "Done"}
          </Button>
        ) : step === "failed" ? (
          <>
            <Button type="button" variant="ghost" onClick={close}>
              Close
            </Button>
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={step === "working"}
          >
            Cancel
          </Button>
        )}
      </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
