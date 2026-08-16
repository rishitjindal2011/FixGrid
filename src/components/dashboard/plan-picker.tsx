"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { purchasePlan, subscribeToPlan } from "@/lib/plans/actions";
import { PLAN_INITIAL_STATE } from "@/lib/plans/state";
import { PaymentSheet } from "@/components/dashboard/payment-sheet";
import type { Entitlement, Plan } from "@/lib/plans/server";
import { cn } from "@/lib/utils";

/**
 * The plan picker.
 *
 * Prices and included counts come from the server; this component sends a plan
 * *code* and nothing else. Anything about what that code costs is read from the
 * database in the action, so a tampered form cannot buy Pro at the Plus price.
 *
 * The current plan renders as a state rather than a button, because the useful
 * action on a plan you already have is nothing at all.
 */
export function PlanPicker({
  plans,
  entitlement,
  balanceMinor,
}: {
  plans: Plan[];
  entitlement: Entitlement;
  balanceMinor: number;
}) {
  const [state, submit, pending] = useActionState(subscribeToPlan, PLAN_INITIAL_STATE);

  /**
   * Which paid plan the sheet is open for, by code.
   *
   * A code rather than a boolean, so the sheet is told exactly what is being bought
   * and there is no second piece of state that could disagree with it.
   */
  const [paying, setPaying] = React.useState<string | null>(null);
  const payingPlan = plans.find((plan) => plan.code === paying) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust">
          {state.error}
        </p>
      ) : null}

      {state.success && state.message ? (
        <p role="status" className="rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-enamel">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.code === entitlement.planCode;
          const affordable = plan.priceMinor === 0 || balanceMinor >= plan.priceMinor;

          return (
            <div
              key={plan.code}
              className={cn(
                "flex flex-col rounded-machined border p-5 shadow-bench",
                current ? "border-signal bg-signal-wash" : "border-hairline bg-chalk",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base uppercase tracking-wide text-enamel">
                  {plan.name}
                </h3>
                {current ? <Badge variant="signal">Current</Badge> : null}
              </div>

              <p className="pt-2 font-mono text-display-xs tabular-nums text-enamel">
                {plan.priceMinor === 0 ? "Free" : formatMoney(plan.priceMinor, plan.currency)}
                {plan.priceMinor > 0 ? (
                  <span className="pl-1 font-sans text-xs text-steel">
                    / {plan.periodDays} days
                  </span>
                ) : null}
              </p>

              {plan.blurb ? (
                <p className="pt-2 text-sm leading-relaxed text-steel">{plan.blurb}</p>
              ) : null}

              <ul className="flex flex-col gap-1.5 pt-4 text-sm">
                <li className="flex items-start gap-2 text-enamel">
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-verdigris" />
                  {plan.bookingsIncluded === null
                    ? "Unlimited repairs, no booking fee"
                    : plan.bookingsIncluded === 0
                      ? "Booking fee applies to every repair"
                      : `${plan.bookingsIncluded} repairs a month with no booking fee`}
                </li>
                {plan.priority ? (
                  <li className="flex items-start gap-2 text-enamel">
                    <Zap aria-hidden className="mt-0.5 size-3.5 shrink-0 text-signal" />
                    Your requests go to the front of a shop&rsquo;s queue
                  </li>
                ) : null}
              </ul>

              <div className="grow" />

              {plan.priceMinor === 0 ? (
                /* The free tier takes nothing, so there is nothing to choose a
                   payment method for — it stays a plain form. */
                <form action={submit} className="pt-4">
                  <input type="hidden" name="planCode" value={plan.code} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={current ? "outline" : "primary"}
                    className="w-full"
                    disabled={pending || current}
                  >
                    {current ? "Your plan" : "Switch to pay as you go"}
                  </Button>
                </form>
              ) : (
                <div className="pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant={current ? "outline" : "primary"}
                    className="w-full"
                    disabled={current}
                    onClick={() => setPaying(plan.code)}
                  >
                    {current
                      ? "Your plan"
                      : `Pay ${formatMoney(plan.priceMinor, plan.currency)}`}
                  </Button>
                </div>
              )}

              {/* No longer says "top up first". The sheet offers a card, UPI or
                  net-banking route, so an empty balance is not a dead end. */}
              {!affordable && !current ? (
                <p className="pt-2 text-xs leading-relaxed text-steel">
                  Pay by card or UPI, or top up your{" "}
                  {formatMoney(balanceMinor, plan.currency)} balance first.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {payingPlan ? (
        <PaymentSheet
          open
          onClose={() => setPaying(null)}
          amountMinor={payingPlan.priceMinor}
          balanceMinor={balanceMinor}
          title={`Subscribe to ${payingPlan.name}`}
          description={`${payingPlan.periodDays} days of ${payingPlan.name}. Choose how you want to pay — nothing leaves your balance until you do.`}
          purchaseFields={{ planCode: payingPlan.code }}
          purchaseAction={purchasePlan}
          confirmLabel="Done"
        />
      ) : null}
    </div>
  );
}
