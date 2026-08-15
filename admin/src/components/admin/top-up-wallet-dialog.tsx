"use client";

import { useActionState } from "react";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useCloseOnSuccess,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { topUpWallet } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import { formatMoney } from "@/lib/format";

/**
 * Put money into a customer's or a shop's balance.
 *
 * This dialog *is* the payment gateway. There is no card rail, so every rupee in
 * the system enters through here, and the platform wallet's balance is the running
 * total of what we have paid in minus what we have taken back in fees.
 *
 * Two deliberate frictions, because the button mints money:
 *
 *   • The current balance is shown next to the field. Topping up is almost always
 *     a response to a balance, and making the operator navigate away to check it
 *     is how the wrong account gets credited.
 *   • The note is optional but pre-filled with nothing, and the action stamps the
 *     acting admin's email when it is left blank — so every entry in the ledger
 *     can be traced to a person without relying on anyone to type it.
 *
 * Rendered only for owners. `topUpWallet` re-checks that for itself, because a
 * server action is a POST that never passes through a route match — hiding the
 * button is a courtesy, not the control.
 */
export function TopUpWalletDialog({
  ownerKind,
  ownerId,
  ownerName,
  balanceMinor,
}: {
  ownerKind: "user" | "shop";
  ownerId: string;
  /** Shown in the dialog so the operator can confirm who they are crediting. */
  ownerName: string;
  balanceMinor: number;
}) {
  const [state, submit, isSubmitting] = useActionState(topUpWallet, ADMIN_INITIAL_STATE);
  const [open, setOpen] = useCloseOnSuccess(state);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Wallet aria-hidden className="size-4" />
        Add funds
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="top-up-title">
        <DialogHeader>
          <DialogTitle id="top-up-title">Add funds</DialogTitle>
          <DialogDescription>
            Credits {ownerName}&rsquo;s balance. This stands in for a card payment
            while the gateway is being set up, so it is real money as far as the rest
            of the platform is concerned.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form id="top-up-form" action={submit} className="flex flex-col gap-4">
            <input type="hidden" name="ownerKind" value={ownerKind} />
            <input type="hidden" name="ownerId" value={ownerId} />

            <p className="flex items-baseline justify-between gap-3 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm">
              <span className="text-steel">Current balance</span>
              <span className="font-mono tabular-nums text-enamel">
                {formatMoney(balanceMinor)}
              </span>
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="top-up-amount" className="eyebrow text-steel">
                Amount — rupees
              </label>
              <Input
                id="top-up-amount"
                name="amount"
                required
                inputMode="decimal"
                autoComplete="off"
                placeholder="500"
                // Mirrors the server's own test, so a stray third decimal is
                // caught before a round-trip rather than after one.
                pattern="₹?\d+(\.\d{1,2})?"
                title="Rupees and paise, like 500 or 500.50"
                className="font-mono tabular-nums"
              />
              <p className="text-xs leading-relaxed text-steel">
                Two decimal places at most, and capped at ₹100,000 per entry — a
                slipped decimal is the likeliest mistake on this screen.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="top-up-memo" className="eyebrow text-steel">
                Note — optional
              </label>
              <Input
                id="top-up-memo"
                name="memo"
                maxLength={200}
                autoComplete="off"
                placeholder="Why this was credited"
              />
              <p className="text-xs leading-relaxed text-steel">
                Appears on their statement. Left blank, the entry records your email
                instead.
              </p>
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-rust">
                {state.error}
              </p>
            ) : null}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="top-up-form" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add funds"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
