import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * What a customer's plan currently grants, and what they could move to.
 *
 * Everything here reads through `my_entitlement()` rather than joining the two
 * tables in the app. The function is the single definition of "in force": it falls
 * a lapsed period back to `free` and decides fee waiving in one place, so the
 * booking action and this page cannot disagree about what somebody is entitled to.
 */

export interface Entitlement {
  planCode: string;
  planName: string;
  priority: boolean;
  /** True when the next booking's platform fee is covered. */
  feeWaived: boolean;
  bookingsUsed: number;
  /** Null means unlimited. */
  bookingsIncluded: number | null;
  /** Null on the free tier — there is no period to end. */
  periodEnd: string | null;
}

export interface Plan {
  code: string;
  name: string;
  priceMinor: number;
  currency: string;
  bookingsIncluded: number | null;
  priority: boolean;
  periodDays: number;
  blurb: string | null;
}

const FREE_FALLBACK: Entitlement = {
  planCode: "free",
  planName: "Pay as you go",
  priority: false,
  feeWaived: false,
  bookingsUsed: 0,
  bookingsIncluded: 0,
  periodEnd: null,
};

/**
 * The caller's entitlement.
 *
 * Degrades to the free tier rather than throwing, and that is the safe direction:
 * a read failure that resolved to "unlimited free bookings" would give away fees
 * silently, whereas one that resolves to free charges a subscriber who can be
 * refunded and who will tell us.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_entitlement").maybeSingle<{
    plan_code: string;
    plan_name: string;
    priority: boolean;
    fee_waived: boolean;
    bookings_used: number;
    bookings_included: number | null;
    period_end: string | null;
  }>();

  if (error) {
    console.error("[plans] entitlement read failed", error.message);
    return FREE_FALLBACK;
  }
  if (!data) return FREE_FALLBACK;

  return {
    planCode: data.plan_code,
    planName: data.plan_name,
    priority: data.priority,
    feeWaived: data.fee_waived,
    bookingsUsed: data.bookings_used,
    bookingsIncluded: data.bookings_included,
    periodEnd: data.period_end,
  };
}

/** The price list, cheapest first. Public reference data. */
export async function listPlans(): Promise<Plan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("code, name, price_minor, currency, bookings_included, priority, period_days, blurb")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<
      {
        code: string;
        name: string;
        price_minor: number;
        currency: string;
        bookings_included: number | null;
        priority: boolean;
        period_days: number;
        blurb: string | null;
      }[]
    >();

  if (error) {
    console.error("[plans] list failed", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    code: row.code,
    name: row.name,
    priceMinor: row.price_minor,
    currency: row.currency,
    bookingsIncluded: row.bookings_included,
    priority: row.priority,
    periodDays: row.period_days,
    blurb: row.blurb,
  }));
}

/** Bookings left in the current period. Null when the plan is unlimited. */
export function remainingBookings(entitlement: Entitlement): number | null {
  if (entitlement.bookingsIncluded === null) return null;
  return Math.max(0, entitlement.bookingsIncluded - entitlement.bookingsUsed);
}
