"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { PlanActionState } from "@/lib/plans/state";
import { SubscribeSchema, purchasePlanCore } from "@/lib/plans/core";

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

  const result = await purchasePlanCore(user.id, parsed.data);
  if (!result.ok) {
    return FAILED(result.message);
  }

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    error: null,
    success: true,
    message: result.data.message,
  };
}
