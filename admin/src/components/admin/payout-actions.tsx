"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markPayoutFailed, markPayoutPaid } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import { formatMoney } from "@/lib/format";

/**
 * Mark a payout paid or failed.
 *
 * Both are two-step on purpose. This is the one screen in the platform where a
 * single click asserts that real money moved, and an accidental "paid" is
 * discovered weeks later by a shop that never received anything. So the shop and
 * the exact amount are read back before the write, and neither action is
 * reachable in one click.
 *
 * Owner-only server-side. The parent hides these controls for lower roles, but
 * the action re-checks regardless — hiding a control is presentation, not
 * authorisation.
 */
export function PayoutActions({
  payoutId,
  shopName,
  amountPence,
  currency,
}: {
  payoutId: string;
  shopName: string;
  amountPence: number;
  currency: string;
}) {
  const [paidState, markPaid, payingOut] = useActionState(markPayoutPaid, ADMIN_INITIAL_STATE);
  const [failedState, markFailed, failing] = useActionState(
    markPayoutFailed,
    ADMIN_INITIAL_STATE,
  );
  const [mode, setMode] = useState<"idle" | "paid" | "failed">("idle");

  const state = paidState.error || paidState.success ? paidState : failedState;

  if (state.success) {
    return (
      <span role="status" className="font-mono text-xs text-verdigris">
        {state.message ?? "Saved."}
      </span>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setMode("paid")}>
          Mark paid
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("failed")}>
          Mark failed
        </Button>
        {state.error ? (
          <span role="alert" className="text-xs text-rust">
            {state.error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-machined border border-signal/30 bg-signal-wash p-3">
      <p className="flex items-start gap-2 text-sm text-enamel">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
        <span>
          {mode === "paid" ? (
            <>
              Confirming that <strong className="font-mono">{formatMoney(amountPence, currency)}</strong>{" "}
              has been sent to <strong>{shopName}</strong>.
            </>
          ) : (
            <>
              Recording that the payout of{" "}
              <strong className="font-mono">{formatMoney(amountPence, currency)}</strong> to{" "}
              <strong>{shopName}</strong> failed.
            </>
          )}
        </span>
      </p>

      {mode === "paid" ? (
        <form action={markPaid} className="flex flex-col gap-2">
          <input type="hidden" name="payoutId" value={payoutId} />
          <div className="flex flex-col gap-1">
            <label htmlFor={`ref-${payoutId}`} className="eyebrow text-steel">
              Provider payout reference — required
            </label>
            <Input
              id={`ref-${payoutId}`}
              name="providerPayoutId"
              required
              minLength={3}
              placeholder="po_1234567890"
              className="font-mono"
            />
            <p className="text-xs text-steel">
              Without this the payment cannot be reconciled against the bank later.
            </p>
          </div>
          {paidState.error ? (
            <p role="alert" className="text-xs text-rust">
              {paidState.error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={payingOut}>
              {payingOut ? "Saving…" : "Confirm paid"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form action={markFailed} className="flex flex-col gap-2">
          <input type="hidden" name="payoutId" value={payoutId} />
          <div className="flex flex-col gap-1">
            <label htmlFor={`reason-${payoutId}`} className="eyebrow text-steel">
              Reason — required
            </label>
            <Input
              id={`reason-${payoutId}`}
              name="reason"
              required
              minLength={3}
              placeholder="Bank rejected — account closed"
            />
          </div>
          {failedState.error ? (
            <p role="alert" className="text-xs text-rust">
              {failedState.error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="danger" disabled={failing}>
              {failing ? "Saving…" : "Confirm failed"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
