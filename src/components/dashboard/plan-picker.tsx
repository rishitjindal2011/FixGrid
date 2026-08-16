"use client";

import { useActionState } from "react";
import { Check, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { subscribeToPlan } from "@/lib/plans/actions";
import { PLAN_INITIAL_STATE } from "@/lib/plans/state";
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

              <form action={submit} className="pt-4">
                <input type="hidden" name="planCode" value={plan.code} />
                <Button
                  type="submit"
                  size="sm"
                  variant={current ? "outline" : "primary"}
                  className="w-full"
                  disabled={pending || current || !affordable}
                >
                  {current
                    ? "Your plan"
                    : plan.priceMinor === 0
                      ? "Switch to pay as you go"
                      : affordable
                        ? `Pay ${formatMoney(plan.priceMinor, plan.currency)}`
                        : "Not enough balance"}
                </Button>
              </form>

              {/* Named rather than left to a failed attempt. The fix is on another
                  page, and saying so here saves a round trip through an error. */}
              {!affordable && !current ? (
                <p className="pt-2 text-xs leading-relaxed text-steel">
                  Top up your balance first — you have{" "}
                  {formatMoney(balanceMinor, plan.currency)}.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
