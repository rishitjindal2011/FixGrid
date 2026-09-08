import "server-only";

import { z } from "zod";

import { coreFail, coreOk, type CoreResult } from "@/lib/api/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { chargeToPlatform } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";

export const SubscribeSchema = z.object({
  planCode: z.string().trim().min(2).max(40),
});

export type SubscribeInput = z.infer<typeof SubscribeSchema>;

export async function purchasePlanCore(
  userId: string,
  input: SubscribeInput,
): Promise<CoreResult<{ message: string }>> {
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("code, name, price_minor, period_days, is_active")
    .eq("code", input.planCode)
    .maybeSingle<{
      code: string;
      name: string;
      price_minor: number;
      period_days: number;
      is_active: boolean;
    }>();

  if (planError || !plan || !plan.is_active) {
    return coreFail(404, "not_found", "That plan is not available.");
  }

  const admin = createAdminClient();

  if (plan.price_minor === 0) {
    const { error } = await admin
      .from("user_subscriptions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      return coreFail(500, "server_error", "Your plan could not be changed. Try again in a moment.");
    }

    return coreOk({ message: "You are on pay as you go. Booking fees apply per repair." });
  }

  const charge = await chargeToPlatform({
    kind: "subscription",
    amountMinor: plan.price_minor,
    from: { kind: "user", ownerId: userId },
    memo: `${plan.name} plan — ${plan.period_days} days`,
    fallbackError: "That plan could not be started — the payment could not be taken.",
  });

  if (!charge.ok) {
    return coreFail(400, "bad_request", `${plan.name} costs ${formatMoney(plan.price_minor)}. ${charge.error}`);
  }

  const now = new Date();
  const end = new Date(now.getTime() + plan.period_days * 24 * 60 * 60 * 1000);

  const { error: grantError } = await admin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      plan_code: plan.code,
      period_start: now.toISOString(),
      period_end: end.toISOString(),
      bookings_used: 0,
    },
    { onConflict: "user_id" },
  );

  if (grantError) {
    console.error("[plans] PAID BUT NOT GRANTED — needs manual correction", {
      userId,
      planCode: plan.code,
      amountMinor: plan.price_minor,
      message: grantError.message,
    });

    return coreFail(
      500,
      "server_error",
      "Your payment went through but the plan could not be activated. Contact us with your balance statement and we will sort it out.",
    );
  }

  return coreOk({
    message: `${plan.name} is active until ${end.toLocaleDateString("en-IN")}.`,
  });
}
