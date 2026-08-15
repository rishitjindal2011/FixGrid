import "server-only";

import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAYS } from "@/lib/types/database";
import {
  ACTIVE_BOOKING_STATUSES,
  type BookingCustomerSummary,
  type BookingRow,
  type BookingStatus,
  type ClientNoteRow,
  type BookingNoteRow,
  type PaymentStatus,
  type PayoutRow,
  type PayoutStatus,
  type ShopAvailabilityRow,
  type ShopInventoryRow,
  type ShopServiceRow,
  type ShopTimeOffRow,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Expert-side reads — the counterpart to `customer.ts`, and it inherits both of
 * that file's rules: never `select("*")`, and every read degrades to `[]`/`null`
 * with a `console.error` rather than throwing. Before the migration is run none
 * of these tables exist, and an expert dashboard that 500s on a missing table is
 * far harder to diagnose than one that renders its empty states.
 *
 * Two things differ from the customer side and shape most of this file:
 *
 *   1. **The expert sees the whole booking row.** `CustomerBooking` is an `Omit`
 *      because `address_lat`/`cancelled_by` are not theirs to see; the shop
 *      being asked to drive to an address needs its coordinates, so
 *      `ExpertBooking` extends `BookingRow` outright. The shop's *private* notes
 *      still live in `booking_notes` — see `getBookingNote`.
 *
 *   2. **The customer cannot be embedded.** `bookings.customer_id` references
 *      `auth.users`, not `public.users`, so there is no foreign key for
 *      PostgREST to resolve and `users!bookings_customer_fkey(...)` is not a
 *      valid embed no matter how it is spelled. Every list here stitches
 *      profiles in with one extra keyed read — see `attachCustomers`.
 *
 * The caller always has the shop's timezone to hand (`getOwnedShop` returns it),
 * so anything that buckets by day or month takes it as an argument rather than
 * reading the runtime's zone: a "today" computed in the deploy region's clock is
 * the wrong day for half of every night.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Fallback only — matches the `fixer_profiles.timezone` column default. */
const DEFAULT_TIMEZONE = "Europe/London";

/**
 * Every column of `BookingRow`, spelled out. The list is long and that is the
 * point: `select("*")` would silently start returning any column a later
 * migration adds, and `ExpertBooking extends BookingRow` would not notice.
 */
const BOOKING_COLUMNS = `
  id, reference, customer_id, fixer_id, service_id, status, delivery_mode, slot,
  device_details, customer_notes,
  address_line1, address_line2, address_city, address_postcode,
  address_lat, address_lng,
  quoted_amount, final_amount, platform_fee, tax_amount, currency,
  warranty_days, warranty_expires_at,
  requested_at, responded_at, confirmed_at, started_at, completed_at,
  closed_at, cancelled_at, cancelled_by, cancellation_reason, expires_at,
  created_at, updated_at,
  service:shop_services!bookings_service_fkey ( id, name, duration_minutes )
`;

/*
 * The customer fields a shop sees — id, display_name, full_name, avatar_url,
 * phone — are no longer a select list here. They are the return shape of the
 * `booking_counterparties()` RPC; see `attachCustomers` for why the direct
 * read moved.
 */

/**
 * A booking as the shop's own dashboard sees it.
 *
 * Unlike the customer side this carries the customer's contact details. That is
 * deliberate and it is the whole job: a shop cannot ring ahead about a home
 * visit without a phone number. RLS already limits these rows to bookings on a
 * shop the caller owns.
 */
export interface ExpertBooking extends BookingRow {
  customer: BookingCustomerSummary | null;
  service: Pick<ShopServiceRow, "id" | "name" | "duration_minutes"> | null;
}

/** The shape PostgREST returns before customers are stitched in. */
type BookingWithService = Omit<ExpertBooking, "customer">;

/**
 * Resolve `customer_id` values against `public.users`.
 *
 * One keyed read for the whole page rather than one per row, and a failure here
 * degrades to `customer: null` rather than dropping the bookings — a job list
 * missing a display name is still a usable job list, an empty one is not.
 *
 * Goes through `booking_counterparties()` rather than reading `users` directly.
 * A shop legitimately needs its customer's name and phone — it cannot ring
 * ahead about a home visit otherwise — but migration 009 revoked those columns
 * from the `authenticated` role after a probe confirmed any anonymous caller
 * could read all 25 phone numbers on the platform. The RPC re-grants exactly
 * that access with the scope written down: customers who have actually booked
 * with a shop this caller owns. A shop owner asking about a stranger gets
 * nothing back.
 */
async function attachCustomers(
  supabase: ServerClient,
  rows: BookingWithService[],
): Promise<ExpertBooking[]> {
  const ids = [...new Set(rows.map((row) => row.customer_id))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .rpc("booking_counterparties", { p_user_ids: ids })
    .returns<BookingCustomerSummary[]>();

  if (error) {
    logReadFailure("[dashboard] expert customer profiles failed", error);
    return rows.map((row) => ({ ...row, customer: null }));
  }

  const byId = new Map((data ?? []).map((user) => [user.id, user]));
  return rows.map((row) => ({ ...row, customer: byId.get(row.customer_id) ?? null }));
}

/**
 * A `tstzrange` literal for PostgREST's `overlaps` filter, or null when the
 * caller bounded nothing.
 *
 * `slot` is a range, not a pair of timestamp columns, so there is no
 * `gte("slot_start", …)` to write — overlap is the only correct comparison, and
 * it is also the one the GiST index on `slot` serves. An empty bound is legal
 * range syntax for infinity, so a one-sided window needs no separate branch.
 */
function rangeFilter(from?: Date, to?: Date): string | null {
  if (!from && !to) return null;
  return `[${from ? from.toISOString() : ""},${to ? to.toISOString() : ""})`;
}

/* ── Booking lists ────────────────────────────────────────────────────────── */

export interface ExpertBookingFilters {
  statuses?: readonly BookingStatus[];
  /** Bounds the *slot*, not `created_at` — the shop thinks in appointments. */
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function listExpertBookings(
  fixerId: string,
  options: ExpertBookingFilters = {},
): Promise<ExpertBooking[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("fixer_id", fixerId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.statuses?.length) {
    query = query.in("status", options.statuses);
  }

  const window = rangeFilter(options.from, options.to);
  if (window) {
    query = query.overlaps("slot", window);
  }

  const { data, error } = await query.returns<BookingWithService[]>();

  if (error) {
    logReadFailure("[dashboard] expert bookings failed", error);
    return [];
  }

  return attachCustomers(supabase, data ?? []);
}

/**
 * Unanswered requests, oldest first.
 *
 * Oldest first because this is a queue, not a feed: the request closest to its
 * `expires_at` is the one that costs the shop a customer if it is missed, and
 * newest-first would bury it. Ordered by `requested_at` rather than `created_at`
 * so a row rewritten by an admin keeps its place in the queue.
 */
export async function listPendingRequests(fixerId: string): Promise<ExpertBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("fixer_id", fixerId)
    .eq("status", "requested")
    .order("requested_at", { ascending: true })
    .limit(50)
    .returns<BookingWithService[]>();

  if (error) {
    logReadFailure("[dashboard] expert pending requests failed", error);
    return [];
  }

  return attachCustomers(supabase, data ?? []);
}

/**
 * Just the number of unanswered requests, for the sidebar badge.
 *
 * `head: true` with an exact count sends no rows at all — the shell renders this
 * on every dashboard page, and transferring 50 full booking rows to call
 * `.length` on them would be the most expensive read in the layout.
 */
export async function getPendingRequestCount(fixerId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("fixer_id", fixerId)
    .eq("status", "requested");

  if (error) {
    logReadFailure("[dashboard] pending request count failed", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Today's board, in the shop's own timezone.
 *
 * Filtered and sorted in JS for the same reason `getNextBooking` is: `slot` is a
 * `tstzrange` and there is no lower bound to order by in SQL. Narrowing to
 * today in SQL would also mean turning the shop's local midnight into a UTC
 * instant here anyway, which is exactly the offset arithmetic the day-key
 * comparison below avoids.
 *
 * A job counts as today's if any part of it lands today, not just its start — a
 * `pickup_drop` device held overnight is still on this morning's bench.
 *
 * `requested` and `accepted` are excluded: neither has a time both sides have
 * committed to, so putting them on a schedule would promise a slot nobody
 * agreed.
 */
export async function getTodaySchedule(
  fixerId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<ExpertBooking[]> {
  const live = await listExpertBookings(fixerId, {
    statuses: ["confirmed", "in_progress"],
    limit: 200,
  });

  const day = dayKeyFormatter(timezone);
  const today = day.format(now);

  return live
    .map((booking) => ({ booking, start: slotStart(booking.slot) }))
    .filter((entry): entry is { booking: ExpertBooking; start: Date } =>
      entry.start !== null && slotTouchesDay(entry.booking.slot, today, day),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((entry) => entry.booking);
}

/**
 * Does any part of this slot fall on `dayKey`, in the zone `day` formats to?
 *
 * The upper bound is pulled back a millisecond before it is compared. A
 * `tstzrange` upper bound is exclusive — `[Mon 17:00, Tue 00:00)` ends the
 * instant Tuesday begins — so comparing it as-is would put a Monday evening job
 * on Tuesday's board as well.
 */
function slotTouchesDay(
  slot: string,
  dayKey: string,
  day: Intl.DateTimeFormat,
): boolean {
  const start = slotStart(slot);
  if (!start) return false;

  const end = slotEnd(slot);
  const lastInstant = end ? new Date(end.getTime() - 1) : start;

  // The keys are `YYYY-MM-DD`, so a lexical comparison is a chronological one.
  return day.format(start) <= dayKey && day.format(lastInstant) >= dayKey;
}

/* ── Money helpers ────────────────────────────────────────────────────────── */

/**
 * Statuses where the work is done and the money is the shop's.
 *
 * `disputed` is deliberately absent. A job under a warranty claim may end in a
 * refund, so counting it as revenue would show the shop earnings it might have
 * to give back. It re-enters these figures if the claim is rejected and the
 * booking returns to `completed`.
 */
const EARNED_STATUSES: readonly BookingStatus[] = ["completed", "closed"];

/** Payouts that have been committed. `failed` is excluded — that money came back. */
const COMMITTED_PAYOUT_STATUSES: readonly PayoutStatus[] = [
  "scheduled",
  "in_transit",
  "paid",
];

type AmountFields = Pick<BookingRow, "quoted_amount" | "final_amount" | "platform_fee">;

/**
 * Gross in pence. `final_amount` wins because a job that came in over or under
 * the quote settles at the final figure; falling back to the quote stops a job
 * that has not been finalised yet from reading as ₹0.
 */
function grossPence(row: AmountFields): number {
  return row.final_amount ?? row.quoted_amount ?? 0;
}

/** What the shop actually receives: gross less the platform's cut. */
function netPence(row: AmountFields): number {
  return grossPence(row) - row.platform_fee;
}

/* ── Date bucketing ───────────────────────────────────────────────────────── */

/**
 * `en-CA` renders as `YYYY-MM-DD`, which sorts and compares as a plain string
 * and slices cleanly to a `YYYY-MM` month key. Built once per call rather than
 * per row: constructing an `Intl.DateTimeFormat` is expensive relative to
 * formatting with one, and these run over every booking a shop has.
 */
function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** `[year, month]` out of a `YYYY-MM…` key. Zeroes on anything unparseable. */
function splitKey(key: string): [number, number] {
  const parts = key.split("-");
  return [Number(parts[0] ?? 0), Number(parts[1] ?? 1)];
}

/**
 * "Aug 2026" for a `YYYY-MM` key.
 *
 * Anchored to the 15th at UTC midnight so no timezone can shunt the label into
 * a neighbouring month — the key already carries the shop's zone, and the label
 * only has to name it. `format.ts` has no month formatter to borrow.
 */
function monthLabel(key: string): string {
  const [year, month] = splitKey(key);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

/** The last `count` month keys ending with `now`'s month, oldest first. */
function recentMonthKeys(count: number, timeZone: string, now: Date): string[] {
  const [year, month] = splitKey(dayKeyFormatter(timeZone).format(now));

  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    // Date.UTC normalises a negative or >12 month index into the right year.
    const anchor = new Date(Date.UTC(year, month - 1 - back, 15));
    keys.push(
      `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

/* ── Overview stats ───────────────────────────────────────────────────────── */

export interface ExpertStats {
  /** Requests waiting on an answer. The number the shop is judged on. */
  pendingRequests: number;
  /** Confirmed or in-progress jobs touching today, in the shop's timezone. */
  todayJobs: number;
  /** Everything live: requested, accepted, confirmed or in progress. */
  activeJobs: number;
  completedThisMonth: number;
  /** Net of the platform fee, for jobs completed this calendar month. */
  earningsThisMonthPence: number;
  /** Earned, but the customer's warranty window is still open. */
  inWarrantyHoldPence: number;
  /** Released by the warranty clock and not yet committed to a payout. */
  availableForPayoutPence: number;
  ratingAvg: number;
  ratingCount: number;
}

const EMPTY_STATS: ExpertStats = {
  pendingRequests: 0,
  todayJobs: 0,
  activeJobs: 0,
  completedThisMonth: 0,
  earningsThisMonthPence: 0,
  inWarrantyHoldPence: 0,
  availableForPayoutPence: 0,
  ratingAvg: 0,
  ratingCount: 0,
};

type StatsRow = Pick<
  BookingRow,
  | "status"
  | "slot"
  | "quoted_amount"
  | "final_amount"
  | "platform_fee"
  | "completed_at"
  | "warranty_expires_at"
>;

/**
 * Every overview tile, from three reads.
 *
 * Nine `head: true` counts would be nine round-trips for numbers that mostly
 * come from the same rows, so the bookings are counted once in memory. The other
 * two reads are unavoidable and each answers something bookings cannot:
 * `fixer_profiles` holds the rating aggregates (maintained by a trigger, not
 * derivable here), and `payouts` says how much of the released balance has
 * already been committed. The shop's timezone comes back on the same profile
 * read that fetches the rating, which is why this takes no timezone argument.
 *
 * Any of the three failing degrades that part to zero rather than the page.
 */
export async function getExpertStats(
  fixerId: string,
  now: Date = new Date(),
): Promise<ExpertStats> {
  const supabase = await createClient();

  const [profileResult, bookingsResult, payoutsResult] = await Promise.all([
    supabase
      .from("fixer_profiles")
      .select("timezone, rating_avg, rating_count")
      .eq("id", fixerId)
      .maybeSingle<{ timezone: string; rating_avg: number; rating_count: number }>(),
    supabase
      .from("bookings")
      .select(
        "status, slot, quoted_amount, final_amount, platform_fee, completed_at, warranty_expires_at",
      )
      .eq("fixer_id", fixerId)
      .returns<StatsRow[]>(),
    supabase
      .from("payouts")
      .select("amount, status")
      .eq("fixer_id", fixerId)
      .in("status", COMMITTED_PAYOUT_STATUSES)
      .returns<Pick<PayoutRow, "amount" | "status">[]>(),
  ]);

  if (profileResult.error) {
    logReadFailure("[dashboard] expert profile stats failed", profileResult.error);
  }
  if (bookingsResult.error) {
    logReadFailure("[dashboard] expert stats failed", bookingsResult.error);
  }
  if (payoutsResult.error) {
    logReadFailure("[dashboard] expert payout balance failed", payoutsResult.error);
  }

  const profile = profileResult.data;
  const rows = bookingsResult.data ?? [];

  if (rows.length === 0) {
    return {
      ...EMPTY_STATS,
      ratingAvg: profile?.rating_avg ?? 0,
      ratingCount: profile?.rating_count ?? 0,
    };
  }

  const day = dayKeyFormatter(profile?.timezone ?? DEFAULT_TIMEZONE);
  const today = day.format(now);
  const thisMonth = today.slice(0, 7);
  const nowMs = now.getTime();

  const stats: ExpertStats = {
    ...EMPTY_STATS,
    ratingAvg: profile?.rating_avg ?? 0,
    ratingCount: profile?.rating_count ?? 0,
  };

  let released = 0;

  for (const row of rows) {
    if (row.status === "requested") stats.pendingRequests += 1;
    if (ACTIVE_BOOKING_STATUSES.includes(row.status)) stats.activeJobs += 1;

    if (row.status === "confirmed" || row.status === "in_progress") {
      if (slotTouchesDay(row.slot, today, day)) stats.todayJobs += 1;
    }

    if (!EARNED_STATUSES.includes(row.status)) continue;

    if (row.completed_at && day.format(new Date(row.completed_at)).slice(0, 7) === thisMonth) {
      stats.completedThisMonth += 1;
      stats.earningsThisMonthPence += netPence(row);
    }

    // A null `warranty_expires_at` on a finished job means no cover was ever
    // stamped (a service with `warranty_days` of 0), so there is nothing to
    // hold — treat it as released rather than stranding the money.
    const holdOpen =
      row.status === "completed" &&
      row.warranty_expires_at !== null &&
      new Date(row.warranty_expires_at).getTime() > nowMs;

    if (holdOpen) stats.inWarrantyHoldPence += netPence(row);
    else released += netPence(row);
  }

  const committed = (payoutsResult.data ?? []).reduce((sum, payout) => sum + payout.amount, 0);
  // Floored at zero: an over-committed balance is a reconciliation problem for
  // the ledger, not a negative number to show a shop owner.
  stats.availableForPayoutPence = Math.max(0, released - committed);

  return stats;
}

/* ── Earnings ─────────────────────────────────────────────────────────────── */

export interface EarningsBucket {
  /** `YYYY-MM` in the shop's timezone — the sort key, not a label. */
  month: string;
  /** "Aug 2026". */
  label: string;
  grossPence: number;
  feePence: number;
  netPence: number;
  jobs: number;
}

type EarningsRow = Pick<
  BookingRow,
  "status" | "quoted_amount" | "final_amount" | "platform_fee" | "completed_at"
>;

/**
 * Monthly revenue, for the earnings chart.
 *
 * Bucketed on `completed_at` — the moment the work was delivered — rather than
 * on the slot or on a payment, because that is the month the shop thinks it
 * earned the money in and it is the only stamp present before Stripe lands.
 *
 * Every month in the window is emitted, including the empty ones. A chart that
 * silently drops a zero month draws a straight line across the gap and reads as
 * steady trade during a month the shop was shut.
 *
 * `timezone` should be the shop's, from `getOwnedShop`. When it is omitted it is
 * looked up rather than defaulted, because a bucket boundary an hour out moves
 * whole jobs between months at either end of the year.
 */
export async function listExpertEarnings(
  fixerId: string,
  options: { months?: number; timezone?: string; now?: Date } = {},
): Promise<EarningsBucket[]> {
  const supabase = await createClient();
  const months = Math.max(1, options.months ?? 6);
  const now = options.now ?? new Date();

  let timezone = options.timezone;
  if (!timezone) {
    const { data, error } = await supabase
      .from("fixer_profiles")
      .select("timezone")
      .eq("id", fixerId)
      .maybeSingle<{ timezone: string }>();

    if (error) {
      logReadFailure("[dashboard] expert earnings timezone failed", error);
    }
    timezone = data?.timezone ?? DEFAULT_TIMEZONE;
  }

  const keys = recentMonthKeys(months, timezone, now);
  const buckets = new Map<string, EarningsBucket>(
    keys.map((month) => [
      month,
      { month, label: monthLabel(month), grossPence: 0, feePence: 0, netPence: 0, jobs: 0 },
    ]),
  );

  // The SQL bound is UTC but the buckets are the shop's; a job completed just
  // after local midnight on the 1st can carry a UTC stamp in the previous day.
  // A two-day skirt is wider than any real offset, and rows outside the buckets
  // are discarded by the map lookup below, so over-fetching costs nothing.
  const [oldestYear, oldestMonth] = splitKey(keys[0] ?? "1970-01");
  const windowStart = new Date(Date.UTC(oldestYear, oldestMonth - 1, -1)).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select("status, quoted_amount, final_amount, platform_fee, completed_at")
    .eq("fixer_id", fixerId)
    .in("status", EARNED_STATUSES)
    // No explicit null check on `completed_at`: in Postgres `null >= anything`
    // is null, not true, so the bound below already excludes unstamped rows.
    .gte("completed_at", windowStart)
    .returns<EarningsRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert earnings failed", error);
    return [...buckets.values()];
  }

  const day = dayKeyFormatter(timezone);

  for (const row of data ?? []) {
    if (!row.completed_at) continue;
    const bucket = buckets.get(day.format(new Date(row.completed_at)).slice(0, 7));
    if (!bucket) continue;

    bucket.grossPence += grossPence(row);
    bucket.feePence += row.platform_fee;
    bucket.netPence += netPence(row);
    bucket.jobs += 1;
  }

  return [...buckets.values()];
}

/* ── Transactions and payouts ─────────────────────────────────────────────── */

export interface ExpertTransaction {
  id: string;
  status: PaymentStatus;
  grossPence: number;
  feePence: number;
  taxPence: number;
  netPence: number;
  currency: string;
  capturedAt: string | null;
  createdAt: string;
  bookingId: string;
  bookingReference: string;
  bookingStatus: BookingStatus;
  serviceName: string | null;
}

interface PaymentJoinRow {
  id: string;
  status: PaymentStatus;
  amount: number;
  platform_fee: number;
  tax_amount: number;
  currency: string;
  captured_at: string | null;
  created_at: string;
  bookings: {
    id: string;
    reference: string;
    status: BookingStatus;
    service: { name: string } | null;
  } | null;
}

/**
 * The money ledger as the shop sees it.
 *
 * `payments` has no `fixer_id` — it hangs off the booking — so the shop's rows
 * are reached through an `!inner` join, which is also what scopes the query
 * without a second round-trip. Ordered by `created_at` rather than `captured_at`
 * because a pending payment has no capture stamp and would sort to the bottom,
 * which is the opposite of where an unsettled charge belongs.
 *
 * These tables stay empty until the Stripe integration lands. That is expected,
 * not an error state — the page shows its empty state and nothing breaks.
 */
export async function listTransactions(
  fixerId: string,
  limit = 50,
): Promise<ExpertTransaction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, status, amount, platform_fee, tax_amount, currency, captured_at, created_at,
       bookings!payments_booking_fkey!inner (
         id, reference, status, fixer_id,
         service:shop_services!bookings_service_fkey ( name )
       )`,
    )
    .eq("bookings.fixer_id", fixerId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PaymentJoinRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert transactions failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    grossPence: row.amount,
    feePence: row.platform_fee,
    taxPence: row.tax_amount,
    netPence: row.amount - row.platform_fee,
    currency: row.currency,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    bookingId: row.bookings?.id ?? "",
    bookingReference: row.bookings?.reference ?? "",
    bookingStatus: row.bookings?.status ?? "completed",
    serviceName: row.bookings?.service?.name ?? null,
  }));
}

export async function listPayouts(fixerId: string): Promise<PayoutRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payouts")
    .select(
      "id, fixer_id, status, amount, currency, provider_payout_id, scheduled_for, paid_at, created_at",
    )
    .eq("fixer_id", fixerId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PayoutRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert payouts failed", error);
    return [];
  }

  return data ?? [];
}

/* ── Clients ──────────────────────────────────────────────────────────────── */

export interface ExpertClient {
  id: string;
  displayName: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  /**
   * Every booking they have ever made with this shop, cancellations included —
   * a customer who books and cancels twice is still a relationship the shop
   * manages, and `totalSpentPence` below counts only finished work, so the pair
   * of numbers tells the true story where either alone would mislead.
   */
  bookingCount: number;
  lastBookingAt: string | null;
  totalSpentPence: number;
}

type ClientAggregateRow = Pick<
  BookingRow,
  "customer_id" | "status" | "quoted_amount" | "final_amount" | "platform_fee" | "created_at"
>;

/** The half of `ExpertClient` that comes from bookings rather than the profile. */
type ClientTotals = Pick<
  ExpertClient,
  "id" | "bookingCount" | "lastBookingAt" | "totalSpentPence"
>;

/** Fold booking rows into one entry per customer. Shared by list and detail. */
function aggregateClients(rows: ClientAggregateRow[]): Map<string, ClientTotals> {
  const byCustomer = new Map<string, ClientTotals>();

  for (const row of rows) {
    const entry = byCustomer.get(row.customer_id) ?? {
      id: row.customer_id,
      bookingCount: 0,
      lastBookingAt: null,
      totalSpentPence: 0,
    };

    entry.bookingCount += 1;
    // ISO-8601 from Postgres, so a string compare is a chronological one.
    if (!entry.lastBookingAt || row.created_at > entry.lastBookingAt) {
      entry.lastBookingAt = row.created_at;
    }
    // Gross, not net: this is what the customer paid, not what the shop kept.
    if (EARNED_STATUSES.includes(row.status)) entry.totalSpentPence += grossPence(row);

    byCustomer.set(row.customer_id, entry);
  }

  return byCustomer;
}

/**
 * The shop's client book.
 *
 * Aggregated in JS from one bookings read rather than asked of the database,
 * because the grouping this needs is a `group by` with three aggregates and
 * PostgREST cannot express one — the alternatives are an RPC or a view, both of
 * which put a migration between this page and working. A shop's customer list
 * is a few hundred rows at the very top end.
 *
 * Sorted by most recent booking: a CRM list is a "who have I seen lately"
 * question far more often than an alphabetical one.
 */
export async function listClients(fixerId: string): Promise<ExpertClient[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("customer_id, status, quoted_amount, final_amount, platform_fee, created_at")
    .eq("fixer_id", fixerId)
    .returns<ClientAggregateRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert clients failed", error);
    return [];
  }

  const aggregates = aggregateClients(data ?? []);
  if (aggregates.size === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .rpc("booking_counterparties", { p_user_ids: [...aggregates.keys()] })
    .returns<BookingCustomerSummary[]>();

  if (profileError) {
    logReadFailure("[dashboard] expert client profiles failed", profileError);
  }

  const byId = new Map((profiles ?? []).map((user) => [user.id, user]));

  return [...aggregates.values()]
    .map((entry) => {
      const profile = byId.get(entry.id);
      return {
        ...entry,
        // A deleted or unreadable profile still has booking history worth
        // showing, so it degrades to a placeholder rather than vanishing.
        displayName: profile?.display_name ?? "Customer",
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        phone: profile?.phone ?? null,
      };
    })
    .sort((a, b) => (b.lastBookingAt ?? "").localeCompare(a.lastBookingAt ?? ""));
}

export interface ExpertClientDetail extends ExpertClient {
  bookings: ExpertBooking[];
  notes: ClientNoteRow[];
}

/**
 * One client, their history with this shop, and the shop's private notes on
 * them.
 *
 * Returns null when the customer has never booked here. That is the privacy
 * boundary as well as a 404: `public.users` is world-readable, so without this
 * check the route would turn into a lookup tool for any user id.
 */
export async function getClient(
  fixerId: string,
  customerId: string,
): Promise<ExpertClientDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("fixer_id", fixerId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<BookingWithService[]>();

  if (error) {
    logReadFailure("[dashboard] expert client detail failed", error);
    return null;
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const [bookings, notes] = await Promise.all([
    attachCustomers(supabase, rows),
    listClientNotes(supabase, fixerId, customerId),
  ]);

  const aggregate = aggregateClients(rows).get(customerId);
  const profile = bookings[0]?.customer ?? null;

  return {
    id: customerId,
    displayName: profile?.display_name ?? "Customer",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    bookingCount: aggregate?.bookingCount ?? rows.length,
    lastBookingAt: aggregate?.lastBookingAt ?? null,
    totalSpentPence: aggregate?.totalSpentPence ?? 0,
    bookings,
    notes,
  };
}

/** Owner-only by RLS — the customer must never see what the shop wrote here. */
async function listClientNotes(
  supabase: ServerClient,
  fixerId: string,
  customerId: string,
): Promise<ClientNoteRow[]> {
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, fixer_id, customer_id, body, created_by, created_at, updated_at")
    .eq("fixer_id", fixerId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<ClientNoteRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert client notes failed", error);
    return [];
  }

  return data ?? [];
}

/* ── Catalogue and availability ───────────────────────────────────────────── */

export interface ExpertService extends ShopServiceRow {
  category: { id: string; name: string; slug: string } | null;
}

/**
 * One stock row with its category joined.
 *
 * An item is priced in pence (`unit_price`) and counted in whole units
 * (`quantity`) — both are plain integers, so the joined category is the only
 * shape `listShopInventory` has to add.
 */
export interface ExpertInventoryItem extends ShopInventoryRow {
  category: { id: string; name: string; slug: string } | null;
}

/**
 * The shop's stock, unlisted rows included.
 *
 * Same shape as `listShopServices`: the public page reads only `is_active`
 * rows while the owner's screen shows the drafts too, and the owner policy
 * ORs with the public one so no extra filter is needed to see them.
 */
export async function listShopInventory(
  fixerId: string,
): Promise<ExpertInventoryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_inventory")
    .select(
      `id, fixer_id, category_id, sku, name, description, brand,
       condition, unit_price, currency, quantity, low_stock_threshold,
       is_active, sort_order, created_at, updated_at,
       category:repair_categories!shop_inventory_category_fkey ( id, name, slug )`,
    )
    .eq("fixer_id", fixerId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<ExpertInventoryItem[]>();

  if (error) {
    logReadFailure("[dashboard] expert inventory failed", error);
    return [];
  }

  return data ?? [];
}

/**
 * The shop's catalogue, inactive services included.
 *
 * The public page reads only `is_active` rows; the owner's screen must show the
 * retired ones too, or a service they switched off becomes unreachable and
 * looks deleted. RLS already allows this — the owner policy ORs with the public
 * one, so no extra filter is needed to see the drafts.
 */
export async function listShopServices(fixerId: string): Promise<ExpertService[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_services")
    .select(
      `id, fixer_id, category_id, name, description,
       price_type, price_min, price_max, currency,
       duration_minutes, delivery_modes, warranty_days,
       is_active, sort_order, created_at, updated_at,
       category:repair_categories!shop_services_category_fkey ( id, name, slug )`,
    )
    .eq("fixer_id", fixerId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<ExpertService[]>();

  if (error) {
    logReadFailure("[dashboard] expert services failed", error);
    return [];
  }

  return data ?? [];
}

/**
 * Opening windows, Monday first.
 *
 * Sorted in JS against `WEEKDAYS`: ordering by the `weekday` enum in SQL happens
 * to give Mon→Sun today because that is the declaration order, but that is an
 * implementation detail of the enum rather than something this file should
 * depend on. A shop with two windows on one day needs the `starts_at` tiebreak
 * regardless.
 */
export async function listAvailability(fixerId: string): Promise<ShopAvailabilityRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_availability")
    .select("id, fixer_id, weekday, starts_at, ends_at, buffer_minutes, capacity, created_at")
    .eq("fixer_id", fixerId)
    .returns<ShopAvailabilityRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert availability failed", error);
    return [];
  }

  return (data ?? [])
    .slice()
    .sort(
      (a, b) =>
        WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday) ||
        a.starts_at.localeCompare(b.starts_at),
    );
}

/**
 * Time off from `from` onward, soonest first.
 *
 * Defaults to now because the settings screen is about what is coming, not a
 * log of closures already served. `period` is a `tstzrange`, so the filter is an
 * overlap against an open-ended range and the sort reads the lower bound out in
 * JS — `slotStart`/`slotEnd` are generic range parsers despite their names.
 */
export async function listTimeOff(
  fixerId: string,
  options: { from?: Date } = {},
): Promise<ShopTimeOffRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_time_off")
    .select("id, fixer_id, period, reason, created_at")
    .eq("fixer_id", fixerId)
    .overlaps("period", `[${(options.from ?? new Date()).toISOString()},)`)
    .limit(100)
    .returns<ShopTimeOffRow[]>();

  if (error) {
    logReadFailure("[dashboard] expert time off failed", error);
    return [];
  }

  return (data ?? [])
    .slice()
    .sort((a, b) => (slotStart(a.period)?.getTime() ?? 0) - (slotStart(b.period)?.getTime() ?? 0));
}

/* ── Private job notes ────────────────────────────────────────────────────── */

/**
 * The shop's working notes on one job.
 *
 * A separate table rather than a column on `bookings` because RLS is row-level:
 * a customer allowed to read their own booking row can read every column of it,
 * so no column of `bookings` could ever hold this. `fixerId` is not a parameter
 * because the owner-only policy on `booking_notes` already answers the question
 * — a shop asking for someone else's note gets no row, not a filtered one.
 *
 * `maybeSingle` rather than `single`: most jobs have no note, and that is not an
 * error.
 */
export async function getBookingNote(bookingId: string): Promise<BookingNoteRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_notes")
    .select("booking_id, fixer_id, body, updated_by, updated_at, created_at")
    .eq("booking_id", bookingId)
    .maybeSingle<BookingNoteRow>();

  if (error) {
    logReadFailure("[dashboard] expert booking note failed", error);
    return null;
  }

  return data;
}
