import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus } from "@/lib/types/marketplace";

/**
 * Customer reads.
 *
 * `bookings.customer_id` references `auth.users`, NOT `public.users`, so there
 * is no foreign key for PostgREST to embed through — `users!bookings_customer_fkey`
 * is not a valid embed no matter how it is spelled. Every join here is done in
 * two keyed reads and stitched in memory. The same constraint shapes
 * `../src/lib/dashboard/expert.ts` in the consumer app.
 *
 * These are real people's records. Reads degrade to `[]`/`null` rather than
 * throwing, as everywhere in this directory.
 */

const BOOKING_SCAN_LIMIT = 5000;

const EARNED: readonly BookingStatus[] = ["completed", "closed"];

export interface CustomerRow {
  id: string;
  displayName: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  bookingCount: number;
  totalSpentPence: number;
  lastBookingAt: string | null;
  disputeCount: number;
}

interface UserRow {
  id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

const USER_COLUMNS = "id, display_name, full_name, avatar_url, phone, created_at";

export interface CustomerFilters {
  q?: string;
  sort?: "joined" | "spend" | "bookings";
}

export async function listCustomers(filters: CustomerFilters = {}): Promise<CustomerRow[]> {
  const supabase = createAdminClient();

  const [usersResult, bookingsResult, disputesResult] = await Promise.all([
    supabase
      .from("users")
      .select(USER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<UserRow[]>(),
    supabase
      .from("bookings")
      .select("customer_id, status, quoted_amount, final_amount, created_at")
      .limit(BOOKING_SCAN_LIMIT)
      .returns<
        Array<{
          customer_id: string;
          status: BookingStatus;
          quoted_amount: number | null;
          final_amount: number | null;
          created_at: string;
        }>
      >(),
    supabase
      .from("disputes")
      .select("raised_by")
      .limit(2000)
      .returns<Array<{ raised_by: string }>>(),
  ]);

  if (usersResult.error) {
    console.error("[customers] list failed", usersResult.error.message);
    return [];
  }
  if (bookingsResult.error) {
    console.error("[customers] booking aggregate failed", bookingsResult.error.message);
  }
  if (disputesResult.error) {
    console.error("[customers] dispute counts failed", disputesResult.error.message);
  }

  const spend = new Map<string, { count: number; pence: number; last: string | null }>();
  for (const booking of bookingsResult.data ?? []) {
    const current = spend.get(booking.customer_id) ?? { count: 0, pence: 0, last: null };
    current.count += 1;
    if (EARNED.includes(booking.status)) {
      current.pence += booking.final_amount ?? booking.quoted_amount ?? 0;
    }
    if (!current.last || booking.created_at > current.last) current.last = booking.created_at;
    spend.set(booking.customer_id, current);
  }

  const disputes = new Map<string, number>();
  for (const dispute of disputesResult.data ?? []) {
    disputes.set(dispute.raised_by, (disputes.get(dispute.raised_by) ?? 0) + 1);
  }

  let customers: CustomerRow[] = (usersResult.data ?? []).map((user) => {
    const aggregate = spend.get(user.id);

    return {
      id: user.id,
      displayName: user.display_name,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      createdAt: user.created_at,
      bookingCount: aggregate?.count ?? 0,
      totalSpentPence: aggregate?.pence ?? 0,
      lastBookingAt: aggregate?.last ?? null,
      disputeCount: disputes.get(user.id) ?? 0,
    };
  });

  const needle = filters.q?.trim().toLowerCase();
  if (needle) {
    customers = customers.filter((customer) =>
      [customer.displayName, customer.fullName, customer.phone]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }

  switch (filters.sort) {
    case "spend":
      customers.sort((a, b) => b.totalSpentPence - a.totalSpentPence);
      break;
    case "bookings":
      customers.sort((a, b) => b.bookingCount - a.bookingCount);
      break;
    default:
      customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return customers;
}

export interface CustomerDetail extends CustomerRow {
  timezone: string | null;
  preferredContact: string | null;
  marketingOptIn: boolean;
  bookings: Array<{
    id: string;
    reference: string;
    status: BookingStatus;
    createdAt: string;
    amountPence: number | null;
    shopName: string | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    shopName: string | null;
  }>;
  /** Shops this person owns. A customer record and an expert are the same account. */
  ownedShops: Array<{ id: string; shopName: string }>;
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select(`${USER_COLUMNS}, timezone, preferred_contact, marketing_opt_in`)
    .eq("id", id)
    .maybeSingle<
      UserRow & {
        timezone: string | null;
        preferred_contact: string | null;
        marketing_opt_in: boolean;
      }
    >();

  if (error) {
    console.error("[customers] detail failed", error.message);
    return null;
  }
  if (!user) return null;

  const [bookingsResult, reviewsResult, shopsResult, disputesResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `id, reference, status, created_at, quoted_amount, final_amount,
         fixer_profiles!bookings_fixer_fkey ( shop_name )`,
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<
        Array<{
          id: string;
          reference: string;
          status: BookingStatus;
          created_at: string;
          quoted_amount: number | null;
          final_amount: number | null;
          fixer_profiles: { shop_name: string } | null;
        }>
      >(),
    supabase
      .from("reviews")
      // `reviews.fixer_id` declares its FK inline, so Postgres auto-named it
      // `reviews_fixer_id_fkey` — not the `reviews_fixer_fkey` pattern the
      // marketplace migration uses for its explicitly-named constraints.
      .select(
        `id, rating, text, created_at,
         fixer_profiles!reviews_fixer_id_fkey ( shop_name )`,
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<
        Array<{
          id: string;
          rating: number;
          text: string | null;
          created_at: string;
          fixer_profiles: { shop_name: string } | null;
        }>
      >(),
    supabase
      .from("fixer_profiles")
      .select("id, shop_name")
      .eq("owner_id", id)
      .returns<Array<{ id: string; shop_name: string }>>(),
    supabase
      .from("disputes")
      .select("id")
      .eq("raised_by", id)
      .returns<Array<{ id: string }>>(),
  ]);

  for (const [label, result] of [
    ["bookings", bookingsResult],
    ["reviews", reviewsResult],
    ["shops", shopsResult],
    ["disputes", disputesResult],
  ] as const) {
    if (result.error) console.error(`[customers] ${label} failed`, result.error.message);
  }

  const bookings = bookingsResult.data ?? [];

  const totalSpentPence = bookings
    .filter((booking) => EARNED.includes(booking.status))
    .reduce((sum, booking) => sum + (booking.final_amount ?? booking.quoted_amount ?? 0), 0);

  return {
    id: user.id,
    displayName: user.display_name,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    phone: user.phone,
    createdAt: user.created_at,
    bookingCount: bookings.length,
    totalSpentPence,
    lastBookingAt: bookings[0]?.created_at ?? null,
    disputeCount: (disputesResult.data ?? []).length,

    timezone: user.timezone,
    preferredContact: user.preferred_contact,
    marketingOptIn: user.marketing_opt_in,

    bookings: bookings.map((booking) => ({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      createdAt: booking.created_at,
      amountPence: booking.final_amount ?? booking.quoted_amount,
      shopName: booking.fixer_profiles?.shop_name ?? null,
    })),
    reviews: (reviewsResult.data ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      createdAt: review.created_at,
      shopName: review.fixer_profiles?.shop_name ?? null,
    })),
    ownedShops: (shopsResult.data ?? []).map((shop) => ({
      id: shop.id,
      shopName: shop.shop_name,
    })),
  };
}
