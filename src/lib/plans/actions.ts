"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { chargeToPlatform } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";
import type { PlanActionState } from "@/lib/plans/state";

/**
 * Subscribing to a plan.
 *
 * Charged from the wallet, like every other movement in the system — there is no
 * second payment path, so a plan is bought with balance the customer topped up.
 *
 * Two orderings decide the safety of this, and both go the same way as the
 * booking fee:
 *
 *   1. **Charge, then grant.** A charge with no plan is visible on the customer's
 *      own statement and refundable. A plan with no charge is free Pro that nobody
 *      notices until the revenue is short.
 *   2. **The period is set from the server clock**, never from the request, and the
 *      allowance resets to zero with it. A client-supplied period would be a
 *      client-supplied subscription length.
 *
 * The plan's price and length are read from `subscription_plans`, not taken from
 * the form. The form sends a code; anything about what that code costs comes from
 * the database.
 */

const FAILED = (error: string): PlanActionState => ({ error, success: false });

const SubscribeSchema = z.object({
  planCode: z.string().trim().min(2).max(40),
});

export async function subscribeToPlan(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  return purchasePlan(formData);
}

/**
 * The same purchase, without the `useActionState` prefix argument.
 *
 * `PaymentSheet` calls the purchase itself once funds are assured, so it needs a
 * plain `(formData) => result` shape rather than a reducer. Both entry points share
 * one body — a second copy of a charge is a second place for the charge to be
 * wrong.
 */
export async function purchasePlan(formData: FormData): Promise<PlanActionState> {
  const parsed = SubscribeSchema.safeParse({ planCode: formData.get("planCode") });
  if (!parsed.success) return FAILED("Pick a plan.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FAILED("Sign in to change your plan.");

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("code, name, price_minor, period_days, is_active")
    .eq("code", parsed.data.planCode)
    .maybeSingle<{
      code: string;
      name: string;
      price_minor: number;
      period_days: number;
      is_active: boolean;
    }>();

  if (planError || !plan || !plan.is_active) {
    return FAILED("That plan is not available.");
  }

  const admin = createAdminClient();

  /*
   * The free tier is a cancellation, not a purchase.
   *
   * Deleting the row rather than storing `plan_code = 'free'` keeps one meaning for
   * "no row": `my_entitlement` already falls back to free, so an explicit free row
   * would be a second way to say the same thing and a second thing to keep correct.
   */
  if (plan.price_minor === 0) {
    const { error } = await admin
      .from("user_subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return FAILED("Your plan could not be changed. Try again in a moment.");
    }

    revalidatePath("/dashboard/plan");
    revalidatePath("/dashboard/wallet");
    return {
      error: null,
      success: true,
      message: "You are on pay as you go. Booking fees apply per repair.",
    };
  }

  const charge = await chargeToPlatform({
    kind: "subscription",
    amountMinor: plan.price_minor,
    from: { kind: "user", ownerId: user.id },
    memo: `${plan.name} plan — ${plan.period_days} days`,
    fallbackError: "That plan could not be started — the payment could not be taken.",
  });

  if (!charge.ok) {
    return FAILED(
      `${plan.name} costs ${formatMoney(plan.price_minor)}. ${charge.error}`,
    );
  }

  const now = new Date();
  const end = new Date(now.getTime() + plan.period_days * 24 * 60 * 60 * 1000);

  /*
   * `upsert` on the primary key, resetting the counter.
   *
   * A customer moving from Plus to Pro mid-period starts a fresh allowance, which
   * is the generous reading and the defensible one: they have just paid a second
   * time, and carrying used bookings across a paid upgrade would mean charging for
   * an allowance they cannot use.
   */
  const { error: grantError } = await admin.from("user_subscriptions").upsert(
    {
      user_id: user.id,
      plan_code: plan.code,
      period_start: now.toISOString(),
      period_end: end.toISOString(),
      bookings_used: 0,
    },
    { onConflict: "user_id" },
  );

  if (grantError) {
    // The money moved. Logged rather than refunded automatically, because a
    // refund plus a retry could take the payment twice; an operator can see both
    // the ledger entry and this line and settle it once.
    console.error("[plans] PAID BUT NOT GRANTED — needs manual correction", {
      userId: user.id,
      planCode: plan.code,
      amountMinor: plan.price_minor,
      message: grantError.message,
    });

    return FAILED(
      "Your payment went through but the plan could not be activated. " +
        "Contact us with your balance statement and we will sort it out.",
    );
  }

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    error: null,
    success: true,
    message: `${plan.name} is active until ${end.toLocaleDateString("en-IN")}.`,
  };
}
