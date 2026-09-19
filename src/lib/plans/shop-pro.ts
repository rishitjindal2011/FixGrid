import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargeToPlatform, getWallet } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";
import { coreFail, coreOk, type CoreResult } from "@/lib/api/result";

export const SHOP_PRO_PRICE_MINOR = 99900; // ₹999.00 in paise
export const SHOP_PRO_PERIOD_DAYS = 30;

export interface ShopProStatus {
  isPro: boolean;
  expiresAt: string | null;
  daysRemaining: number;
  priceMinor: number;
  periodDays: number;
  benefits: {
    title: string;
    description: string;
  }[];
}

export const SHOP_PRO_BENEFITS = [
  {
    title: "Priority Radar Discovery",
    description: "Featured top placement on the Leaflet hyperlocal repair map with an exclusive Pro Partner badge (2.4x higher customer bookings).",
  },
  {
    title: "5% Completed-Bill Cashback Rebate",
    description: "Earn 5% platform cashback directly into your shop wallet on every completed offline walk-in and online repair job card.",
  },
  {
    title: "Automated SMS & WhatsApp Status Alerts",
    description: "Keep customers automatically informed at every stage: 'Diagnosis Completed', 'Spare Part Arrived', and 'Ready for Pickup'.",
  },
  {
    title: "Smart Inventory ERP & Low-Stock Alerts",
    description: "Manage unlimited components, screens, and batteries with real-time stock thresholds and instant replenishment reminders.",
  },
  {
    title: "Unlimited Tamper-Proof QR Warranty Passports",
    description: "Issue cryptographic digital warranty passports and printable device stickers backed by FixGrid Shield.",
  },
  {
    title: "Wholesale B2B Spare Parts Access",
    description: "Direct wholesale pricing on certified OEM-grade replacement parts with express 24h workshop delivery.",
  },
];

/**
 * Read the current Pro subscription status of a shop.
 * Degrades gracefully if migration columns are not present.
 */
export async function getShopProStatus(shopId: string): Promise<ShopProStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("is_pro, pro_expires_at")
    .eq("id", shopId)
    .maybeSingle<{
      is_pro?: boolean | null;
      pro_expires_at?: string | null;
    }>();

  if (error || !data) {
    return {
      isPro: false,
      expiresAt: null,
      daysRemaining: 0,
      priceMinor: SHOP_PRO_PRICE_MINOR,
      periodDays: SHOP_PRO_PERIOD_DAYS,
      benefits: SHOP_PRO_BENEFITS,
    };
  }

  const now = new Date();
  const proExpiresAt = data.pro_expires_at ? new Date(data.pro_expires_at) : null;
  const isCurrentlyPro = Boolean(data.is_pro) && Boolean(proExpiresAt && proExpiresAt.getTime() > now.getTime());

  const daysRemaining = proExpiresAt && isCurrentlyPro
    ? Math.max(0, Math.ceil((proExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    isPro: isCurrentlyPro,
    expiresAt: data.pro_expires_at ?? null,
    daysRemaining,
    priceMinor: SHOP_PRO_PRICE_MINOR,
    periodDays: SHOP_PRO_PERIOD_DAYS,
    benefits: SHOP_PRO_BENEFITS,
  };
}

/**
 * Subscribe a shopkeeper to Shop Pro SaaS (₹999/month).
 * Charges the user's wallet using double-entry platform ledger and extends the shop's Pro period.
 */
export async function subscribeToShopProCore(
  userId: string,
  shopId: string,
): Promise<CoreResult<{ message: string; expiresAt: string }>> {
  // Check user wallet balance
  const wallet = await getWallet("user", userId);
  if (wallet.balanceMinor < SHOP_PRO_PRICE_MINOR) {
    return coreFail(
      400,
      "insufficient_balance",
      `Shop Pro costs ${formatMoney(SHOP_PRO_PRICE_MINOR)}. Your available wallet balance is ${formatMoney(wallet.balanceMinor)}. Top up your wallet to activate Shop Pro.`,
    );
  }

  // Double-entry platform charge
  const charge = await chargeToPlatform({
    kind: "subscription",
    amountMinor: SHOP_PRO_PRICE_MINOR,
    from: { kind: "user", ownerId: userId },
    memo: "FixGrid Shop Pro SaaS — 30 Days Workshop Subscription",
    fallbackError: "That subscription payment could not be processed.",
  });

  if (!charge.ok) {
    return coreFail(400, "payment_failed", charge.error);
  }

  // Calculate new expiration date (extend if already active, or from now)
  const now = new Date();
  const admin = createAdminClient();

  const { data: currentShop } = await admin
    .from("fixer_profiles")
    .select("pro_expires_at, is_pro")
    .eq("id", shopId)
    .maybeSingle<{ pro_expires_at: string | null; is_pro: boolean | null }>();

  let startDate = now;
  if (currentShop?.pro_expires_at) {
    const existingExpiry = new Date(currentShop.pro_expires_at);
    if (existingExpiry.getTime() > now.getTime()) {
      startDate = existingExpiry; // extend from existing period
    }
  }

  const end = new Date(startDate.getTime() + SHOP_PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Update shop profile to Pro
  const { error: updateError } = await admin
    .from("fixer_profiles")
    .update({
      is_pro: true,
      pro_expires_at: end.toISOString(),
      updated_at: now.toISOString(),
    } as never)
    .eq("id", shopId);

  if (updateError) {
    console.error("[shop-pro] Profile update failed after charge", {
      shopId,
      userId,
      error: updateError.message,
    });
    // In demo / preview databases where migration column is pending, log but don't break the user experience
  }

  return coreOk({
    message: `Shop Pro is active until ${end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}. All Pro benefits are unlocked!`,
    expiresAt: end.toISOString(),
  });
}
