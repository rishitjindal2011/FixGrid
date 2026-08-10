import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Does this user own a shop?
 *
 * Read from `fixer_profiles.owner_id`, not from an approved `shop_claims` row.
 *
 * It used to be the claim, on the reasoning that the approval record was the
 * single source of truth. That broke the moment /join existed. A shop submitted
 * through the join form sets `owner_id` immediately — that is the whole point,
 * the submitter gets their dashboard while the claim waits — but its claim is
 * `pending`, so a query keyed on `status = 'approved'` returned null, the expert
 * layout redirected to /join, and the submitter landed back on the form that had
 * just created their shop. Submit again, loop again.
 *
 * `owner_id` is still written in exactly one place: `shop_claims_apply()` on
 * approval, and the /join action on creation. Both are deliberate assignments of
 * ownership, which is precisely what this question asks about. A revoked
 * approval now needs `owner_id` cleared to take effect — that is a real
 * behavioural change, and the right one: ownership should be a fact about the
 * shop, not something inferred from the state of a separate table.
 *
 * Returns null for the overwhelmingly common case of a customer with no shop.
 * The expert dashboard sends those users to /join rather than showing a 404 —
 * landing on `/dashboard/expert` without a shop is a reasonable mistake, not a
 * forbidden request.
 */

export interface OwnedShop {
  id: string;
  slug: string;
  shopName: string;
  verified: boolean;
  timezone: string;
  acceptsBookings: boolean;
  /** True while the shop is awaiting review — absent from the public directory. */
  isHidden: boolean;
}

interface ProfileRow {
  id: string;
  slug: string;
  shop_name: string;
  verified: boolean;
  timezone: string;
  accepts_bookings: boolean;
  is_hidden: boolean;
}

export async function getOwnedShop(userId: string): Promise<OwnedShop | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("id, slug, shop_name, verified, timezone, accepts_bookings, is_hidden")
    // `maybeSingle` would throw if somebody ever owned two shops. Ordering by
    // creation and taking the first is the honest read of "their shop" until
    // multi-shop ownership is a feature rather than an accident.
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProfileRow>();

  if (error) {
    // A missing table or column means the migration has not been run yet. That
    // is a deployment state, not a bug in this request — log it once and let the
    // caller render the non-owner view rather than a 500.
    logReadFailure("[dashboard] owned-shop lookup failed", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    shopName: data.shop_name,
    verified: data.verified,
    timezone: data.timezone,
    acceptsBookings: data.accepts_bookings,
    isHidden: data.is_hidden,
  };
}
