import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus, ShopServiceRow } from "@/lib/types/marketplace";

/**
 * Shop (expert) reads for the admin panel.
 *
 * The aggregates below are computed in JS from a small number of wide reads
 * rather than per-shop queries. Ten shops with five aggregates each would be
 * fifty round-trips; this is three. It does mean the booking read is bounded —
 * see BOOKING_SCAN_LIMIT — and on a platform large enough for that bound to
 * bite, these numbers belong in a materialised view rather than here.
 *
 * Every read degrades to `[]`/`null`: the marketplace migration may not be
 * applied yet.
 */

/** Ceiling on the booking scan behind the per-shop aggregates. */
const BOOKING_SCAN_LIMIT = 5000;

/** Statuses that represent money actually earned, not merely quoted. */
const EARNED: readonly BookingStatus[] = ["completed", "closed"];

export interface ExpertRow {
  id: string;
  slug: string;
  shopName: string;
  address: string;
  verified: boolean;
  acceptsBookings: boolean;
  /** Null means unclaimed — and an unclaimed shop can never accept a booking. */
  ownerId: string | null;
  ownerName: string | null;
  ratingAvg: number;
  ratingCount: number;
  serviceCount: number;
  bookingCount: number;
  grossPence: number;
  lastBookingAt: string | null;
  suspendedAt: string | null;
}

interface ProfileRow {
  id: string;
  slug: string;
  shop_name: string;
  address: string;
  verified: boolean;
  accepts_bookings: boolean;
  owner_id: string | null;
  rating_avg: number;
  rating_count: number;
  suspended_at: string | null;
}

const PROFILE_COLUMNS =
  "id, slug, shop_name, address, verified, accepts_bookings, owner_id, rating_avg, rating_count, suspended_at";

interface Aggregate {
  bookingCount: number;
  grossPence: number;
  lastBookingAt: string | null;
}

/**
 * Fold the booking table into per-shop totals.
 *
 * `final_amount` is preferred over `quoted_amount` because a job can finish at a
 * different price than it was quoted, and the finished figure is the one that
 * was actually charged. Only earned statuses count toward gross — including
 * cancelled and expired jobs would inflate every shop's revenue with work nobody
 * did.
 */
function aggregateBookings(
  rows: Array<{
    fixer_id: string;
    status: BookingStatus;
    quoted_amount: number | null;
    final_amount: number | null;
    created_at: string;
  }>,
): Map<string, Aggregate> {
  const byShop = new Map<string, Aggregate>();

  for (const row of rows) {
    const current =
      byShop.get(row.fixer_id) ?? { bookingCount: 0, grossPence: 0, lastBookingAt: null };

    current.bookingCount += 1;

    if (EARNED.includes(row.status)) {
      current.grossPence += row.final_amount ?? row.quoted_amount ?? 0;
    }

    if (!current.lastBookingAt || row.created_at > current.lastBookingAt) {
      current.lastBookingAt = row.created_at;
    }

    byShop.set(row.fixer_id, current);
  }

  return byShop;
}

export interface ExpertFilters {
  q?: string;
  verified?: "yes" | "no";
  claimed?: "yes" | "no";
  sort?: "name" | "revenue" | "bookings" | "rating";
}

export async function listExperts(filters: ExpertFilters = {}): Promise<ExpertRow[]> {
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("fixer_profiles")
    .select(PROFILE_COLUMNS)
    .order("shop_name", { ascending: true })
    .limit(1000)
    .returns<ProfileRow[]>();

  if (error) {
    console.error("[experts] list failed", error.message);
    return [];
  }

  const rows = profiles ?? [];
  if (rows.length === 0) return [];

  // Three reads, run together: bookings for the aggregates, services for the
  // catalogue count, and the owners' display names.
  const ownerIds = [...new Set(rows.map((row) => row.owner_id).filter((id): id is string => Boolean(id)))];

  const [bookingsResult, servicesResult, ownersResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("fixer_id, status, quoted_amount, final_amount, created_at")
      .limit(BOOKING_SCAN_LIMIT)
      .returns<
        Array<{
          fixer_id: string;
          status: BookingStatus;
          quoted_amount: number | null;
          final_amount: number | null;
          created_at: string;
        }>
      >(),
    supabase
      .from("shop_services")
      .select("fixer_id, is_active")
      .limit(5000)
      .returns<Array<{ fixer_id: string; is_active: boolean }>>(),
    ownerIds.length > 0
      ? supabase
          .from("users")
          .select("id, display_name")
          .in("id", ownerIds)
          .returns<Array<{ id: string; display_name: string }>>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (bookingsResult.error) {
    console.error("[experts] booking aggregate failed", bookingsResult.error.message);
  }
  if (servicesResult.error) {
    console.error("[experts] service count failed", servicesResult.error.message);
  }
  if (ownersResult.error) {
    console.error("[experts] owner names failed", ownersResult.error.message);
  }

  const aggregates = aggregateBookings(bookingsResult.data ?? []);

  const serviceCounts = new Map<string, number>();
  for (const service of servicesResult.data ?? []) {
    if (!service.is_active) continue;
    serviceCounts.set(service.fixer_id, (serviceCounts.get(service.fixer_id) ?? 0) + 1);
  }

  const owners = new Map((ownersResult.data ?? []).map((owner) => [owner.id, owner.display_name]));

  let experts: ExpertRow[] = rows.map((row) => {
    const aggregate = aggregates.get(row.id);

    return {
      id: row.id,
      slug: row.slug,
      shopName: row.shop_name,
      address: row.address,
      verified: row.verified,
      acceptsBookings: row.accepts_bookings,
      ownerId: row.owner_id,
      ownerName: row.owner_id ? (owners.get(row.owner_id) ?? "Unknown account") : null,
      ratingAvg: row.rating_avg,
      ratingCount: row.rating_count,
      serviceCount: serviceCounts.get(row.id) ?? 0,
      bookingCount: aggregate?.bookingCount ?? 0,
      grossPence: aggregate?.grossPence ?? 0,
      lastBookingAt: aggregate?.lastBookingAt ?? null,
      suspendedAt: row.suspended_at,
    };
  });

  if (filters.verified) {
    const want = filters.verified === "yes";
    experts = experts.filter((expert) => expert.verified === want);
  }

  if (filters.claimed) {
    const want = filters.claimed === "yes";
    experts = experts.filter((expert) => (expert.ownerId !== null) === want);
  }

  const needle = filters.q?.trim().toLowerCase();
  if (needle) {
    experts = experts.filter((expert) =>
      [expert.shopName, expert.address, expert.slug, expert.ownerName]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }

  switch (filters.sort) {
    case "revenue":
      experts.sort((a, b) => b.grossPence - a.grossPence);
      break;
    case "bookings":
      experts.sort((a, b) => b.bookingCount - a.bookingCount);
      break;
    case "rating":
      experts.sort((a, b) => b.ratingAvg - a.ratingAvg);
      break;
    default:
      experts.sort((a, b) => a.shopName.localeCompare(b.shopName));
  }

  return experts;
}

export interface ExpertDetail extends ExpertRow {
  timezone: string;
  contactPhone: string | null;
  contactEmail: string | null;
  /** `fixer_profiles.bio` — there is no separate description column. */
  bio: string | null;
  photos: string[];
  workingDays: string[];
  openingTime: string | null;
  closingTime: string | null;
  services: ShopServiceRow[];
  recentBookings: Array<{
    id: string;
    reference: string;
    status: BookingStatus;
    createdAt: string;
    amountPence: number | null;
  }>;
}

export async function getExpert(id: string): Promise<ExpertDetail | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select(
      `${PROFILE_COLUMNS}, timezone, contact_phone, contact_email, bio, photos,
       working_days, opening_time, closing_time`,
    )
    .eq("id", id)
    .maybeSingle<
      ProfileRow & {
        timezone: string;
        contact_phone: string | null;
        contact_email: string | null;
        bio: string | null;
        photos: string[] | null;
        working_days: string[] | null;
        opening_time: string | null;
        closing_time: string | null;
      }
    >();

  if (error) {
    console.error("[experts] detail failed", error.message);
    return null;
  }
  if (!data) return null;

  const [servicesResult, bookingsResult, ownerResult] = await Promise.all([
    supabase
      .from("shop_services")
      .select(
        `id, fixer_id, category_id, name, description, price_type, price_min, price_max,
         currency, duration_minutes, delivery_modes, warranty_days, is_active, sort_order,
         created_at, updated_at`,
      )
      .eq("fixer_id", id)
      .order("sort_order", { ascending: true })
      .returns<ShopServiceRow[]>(),
    supabase
      .from("bookings")
      .select("id, reference, status, created_at, quoted_amount, final_amount")
      .eq("fixer_id", id)
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<
        Array<{
          id: string;
          reference: string;
          status: BookingStatus;
          created_at: string;
          quoted_amount: number | null;
          final_amount: number | null;
        }>
      >(),
    data.owner_id
      ? supabase
          .from("users")
          .select("display_name")
          .eq("id", data.owner_id)
          .maybeSingle<{ display_name: string }>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (servicesResult.error) {
    console.error("[experts] services failed", servicesResult.error.message);
  }
  if (bookingsResult.error) {
    console.error("[experts] bookings failed", bookingsResult.error.message);
  }

  const bookings = bookingsResult.data ?? [];
  const aggregate = aggregateBookings(
    bookings.map((booking) => ({
      fixer_id: id,
      status: booking.status,
      quoted_amount: booking.quoted_amount,
      final_amount: booking.final_amount,
      created_at: booking.created_at,
    })),
  ).get(id);

  return {
    id: data.id,
    slug: data.slug,
    shopName: data.shop_name,
    address: data.address,
    verified: data.verified,
    acceptsBookings: data.accepts_bookings,
    ownerId: data.owner_id,
    ownerName: ownerResult.data?.display_name ?? null,
    ratingAvg: data.rating_avg,
    ratingCount: data.rating_count,
    serviceCount: (servicesResult.data ?? []).filter((service) => service.is_active).length,
    bookingCount: aggregate?.bookingCount ?? 0,
    grossPence: aggregate?.grossPence ?? 0,
    lastBookingAt: aggregate?.lastBookingAt ?? null,
    suspendedAt: data.suspended_at,

    timezone: data.timezone,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    bio: data.bio,
    photos: data.photos ?? [],
    workingDays: data.working_days ?? [],
    openingTime: data.opening_time,
    closingTime: data.closing_time,
    services: servicesResult.data ?? [],
    recentBookings: bookings.map((booking) => ({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      createdAt: booking.created_at,
      amountPence: booking.final_amount ?? booking.quoted_amount,
    })),
  };
}
