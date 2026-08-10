import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logReadFailure } from "@/lib/dashboard/errors";
import type { UserAddressRow } from "@/lib/types/marketplace";

/**
 * The customer's address book.
 *
 * `user_addresses` has existed since the marketplace migration and nothing has
 * ever written to it. Every home-visit booking asks the customer to retype their
 * street, town and postcode from scratch — the third time someone books a repair
 * at their own house, that is the app failing to remember something it already
 * has a table for.
 *
 * Addresses are stored, not derived from past bookings. A booking snapshots the
 * address it was made against on purpose (see `bookings.address_line1` and
 * friends) so that editing your address later cannot rewrite where last month's
 * engineer was sent. The two are separate by design and this is the editable one.
 */

export interface SavedAddress {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  postcode: string | null;
  isDefault: boolean;
  /** One-line rendering, for pickers and summaries. */
  oneLine: string;
}

function toOneLine(row: Pick<UserAddressRow, "line1" | "line2" | "city" | "postcode">): string {
  return [row.line1, row.line2, row.city, row.postcode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function shape(row: UserAddressRow): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    postcode: row.postcode,
    isDefault: row.is_default,
    oneLine: toOneLine(row),
  };
}

/**
 * Every saved address, default first.
 *
 * Ordered in SQL rather than in JS so the picker's first option and the
 * settings list agree without either having to remember the rule.
 */
export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_addresses")
    .select("id, user_id, label, line1, line2, city, postcode, country, lat, lng, is_default, created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<UserAddressRow[]>();

  if (error) {
    logReadFailure("[addresses] list failed", error);
    return [];
  }

  return (data ?? []).map(shape);
}

/**
 * The address a booking form should preselect, or null.
 *
 * Falls back to the oldest address when nothing is flagged default — someone
 * with exactly one saved address has never had a reason to mark it, and asking
 * them to choose from a list of one is the friction this whole file removes.
 */
export async function getDefaultAddress(userId: string): Promise<SavedAddress | null> {
  const addresses = await listAddresses(userId);
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}
