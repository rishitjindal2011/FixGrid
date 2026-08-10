import "server-only";

import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_BOOKING_STATUSES,
  type BookingRow,
  type BookingShopSummary,
  type BookingStatus,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Customer-side booking reads.
 *
 * Two rules hold throughout this file:
 *
 *   1. **Never `select("*")`.** Nothing on `bookings` is shop-private — the
 *      shop's working notes live in `booking_notes`, behind their own
 *      owner-only policy, precisely because RLS cannot hide one column of a row
 *      the customer may read. The narrow column list stays anyway: it keeps the
 *      payload small, and `CustomerBooking` is an `Omit` so that if a private
 *      column is ever added back onto `bookings`, `select("*")` fails to
 *      compile rather than quietly leaking it.
 *
 *   2. **Failure degrades to empty.** Every read returns `[]`/`null` on error.
 *      Before the migration is run these tables do not exist, and a dashboard
 *      that 500s on a missing table is much harder to diagnose than one that
 *      renders its empty states.
 */

const BOOKING_COLUMNS = `
  id, reference, customer_id, fixer_id, service_id, status, delivery_mode, slot,
  device_details, customer_notes,
  address_line1, address_line2, address_city, address_postcode,
  quoted_amount, final_amount, platform_fee, tax_amount, currency,
  warranty_days, warranty_expires_at,
  requested_at, responded_at, confirmed_at, started_at, completed_at,
  closed_at, cancelled_at, cancellation_reason, expires_at,
  created_at, updated_at,
  shop:fixer_profiles!bookings_fixer_fkey (
    id, slug, shop_name, address, timezone, verified,
    contact_phone, rating_avg, rating_count
  ),
  service:shop_services!bookings_service_fkey ( id, name, duration_minutes )
`;

/** A booking as the customer's own dashboard sees it — no shop-private fields. */
export interface CustomerBooking
  extends Omit<BookingRow, "address_lat" | "address_lng" | "cancelled_by"> {
  shop: BookingShopSummary | null;
  service: { id: string; name: string; duration_minutes: number } | null;
}

export async function listCustomerBookings(
  userId: string,
  options: { statuses?: readonly BookingStatus[]; limit?: number } = {},
): Promise<CustomerBooking[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.statuses?.length) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query.returns<CustomerBooking[]>();

  if (error) {
    logReadFailure("[dashboard] customer bookings failed", error);
    return [];
  }

  return data ?? [];
}

/**
 * The booking the overview counts down to: the soonest live job whose slot has
 * not finished yet.
 *
 * Sorted in JS rather than SQL because `slot` is a `tstzrange` and PostgREST has
 * no way to order by its lower bound — `order("slot")` compares ranges, which
 * happens to sort by lower bound but is not a contract worth relying on, and a
 * customer's active list is a handful of rows either way.
 *
 * `requested` is excluded on purpose. A request the shop has not answered has no
 * agreed time, so counting down to it would promise something nobody has
 * committed to.
 */
export async function getNextBooking(
  userId: string,
  now: Date = new Date(),
): Promise<CustomerBooking | null> {
  const live = await listCustomerBookings(userId, {
    statuses: ["accepted", "confirmed", "in_progress"],
    limit: 40,
  });

  const upcoming = live
    .map((booking) => ({ booking, start: slotStart(booking.slot) }))
    .filter((entry): entry is { booking: CustomerBooking; start: Date } => {
      if (!entry.start) return false;
      const end = slotEnd(entry.booking.slot) ?? entry.start;
      return end.getTime() >= now.getTime();
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return upcoming[0]?.booking ?? null;
}

export interface CustomerStats {
  /** Live jobs: requested, accepted, confirmed or in progress. */
  active: number;
  /** Requests the shop has not answered yet. */
  awaitingShop: number;
  /** Completed jobs still inside their warranty window. */
  inWarranty: number;
  /** Finished and settled — the history count. */
  completed: number;
}

/**
 * Overview tiles, from one pass over the customer's bookings.
 *
 * Four `head: true` count queries would be four round-trips for numbers that all
 * come from the same rows; a customer's booking history is small enough to
 * count in memory.
 */
export async function getCustomerStats(
  userId: string,
  now: Date = new Date(),
): Promise<CustomerStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("status, warranty_expires_at")
    .eq("customer_id", userId)
    .returns<Pick<BookingRow, "status" | "warranty_expires_at">[]>();

  if (error) {
    logReadFailure("[dashboard] customer stats failed", error);
    return { active: 0, awaitingShop: 0, inWarranty: 0, completed: 0 };
  }

  const rows = data ?? [];

  return {
    active: rows.filter((r) => ACTIVE_BOOKING_STATUSES.includes(r.status)).length,
    awaitingShop: rows.filter((r) => r.status === "requested").length,
    inWarranty: rows.filter(
      (r) =>
        r.status === "completed" &&
        r.warranty_expires_at !== null &&
        new Date(r.warranty_expires_at).getTime() > now.getTime(),
    ).length,
    completed: rows.filter((r) => r.status === "completed" || r.status === "closed").length,
  };
}

/* ── Saved experts ────────────────────────────────────────────────────────── */

export interface SavedExpert {
  id: string;
  slug: string;
  shopName: string;
  address: string;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  acceptsBookings: boolean;
  savedAt: string;
}

interface SavedExpertJoinRow {
  created_at: string;
  fixer_profiles: {
    id: string;
    slug: string;
    shop_name: string;
    address: string;
    verified: boolean;
    rating_avg: number;
    rating_count: number;
    accepts_bookings: boolean;
  } | null;
}

export async function listSavedExperts(
  userId: string,
  limit = 12,
): Promise<SavedExpert[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_experts")
    .select(
      `created_at,
       fixer_profiles!saved_experts_fixer_fkey (
         id, slug, shop_name, address, verified,
         rating_avg, rating_count, accepts_bookings
       )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<SavedExpertJoinRow[]>();

  if (error) {
    logReadFailure("[dashboard] saved experts failed", error);
    return [];
  }

  return (data ?? [])
    .filter((row): row is SavedExpertJoinRow & { fixer_profiles: NonNullable<SavedExpertJoinRow["fixer_profiles"]> } =>
      row.fixer_profiles !== null,
    )
    .map((row) => ({
      id: row.fixer_profiles.id,
      slug: row.fixer_profiles.slug,
      shopName: row.fixer_profiles.shop_name,
      address: row.fixer_profiles.address,
      verified: row.fixer_profiles.verified,
      ratingAvg: row.fixer_profiles.rating_avg,
      ratingCount: row.fixer_profiles.rating_count,
      acceptsBookings: row.fixer_profiles.accepts_bookings,
      savedAt: row.created_at,
    }));
}

/* ── Activity feed ────────────────────────────────────────────────────────── */

export interface ActivityEntry {
  id: string;
  bookingReference: string;
  shopName: string | null;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus | null;
  note: string | null;
  actorRole: string | null;
  createdAt: string;
}

interface ActivityJoinRow {
  id: string;
  actor_role: string | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  note: string | null;
  created_at: string;
  bookings: {
    reference: string;
    fixer_profiles: { shop_name: string } | null;
  } | null;
}

/**
 * The customer's recent activity, read from `booking_events` rather than
 * `notifications`.
 *
 * They are different things: notifications are what we chose to tell someone,
 * events are what actually happened. A shop that accepts and then reschedules
 * inside a minute might produce one notification and two events — the timeline
 * should show both. The `!inner` join is also what scopes this to the caller's
 * own bookings without a second query.
 */
export async function listCustomerActivity(
  userId: string,
  limit = 8,
): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_events")
    .select(
      `id, actor_role, from_status, to_status, note, created_at,
       bookings!booking_events_booking_fkey!inner (
         reference, customer_id,
         fixer_profiles!bookings_fixer_fkey ( shop_name )
       )`,
    )
    .eq("bookings.customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ActivityJoinRow[]>();

  if (error) {
    logReadFailure("[dashboard] customer activity failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    bookingReference: row.bookings?.reference ?? "",
    shopName: row.bookings?.fixer_profiles?.shop_name ?? null,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actorRole: row.actor_role,
    createdAt: row.created_at,
  }));
}
