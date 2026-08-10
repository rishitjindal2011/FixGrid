import "server-only";

import { daysUntil } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingStatus,
  DisputeEvidenceRow,
  DisputeResolution,
  DisputeStatus,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Warranty cover and the claims raised against it, for `/dashboard/warranty`.
 *
 * Three decisions carry this file.
 *
 * **Cover is read from `warranty_expires_at`, never from the status.** The
 * `close_expired_warranties` cron moves a booking from `completed` to `closed`
 * once its window shuts, but it runs on a schedule — so a row can be hours past
 * its expiry and still read `completed`. The timestamp is the fact; the status is
 * the bookkeeping catching up with it. `active` is therefore always a comparison
 * against the clock, which also keeps this page agreeing with `inEscrowPence` in
 * `billing.ts`, where the same window decides whether money is still reversible.
 *
 * **`closed` and `disputed` bookings stay in the list.** A customer checking
 * whether they are still covered needs to see the cover that has just lapsed —
 * dropping it at the moment it expires is precisely when they would come looking
 * for it. `active: false` says so without hiding the row.
 *
 * **A claim is append-only.** `policies-marketplace.sql` revokes update and
 * delete on `disputes` from `authenticated`, so a claim is amended by adding a
 * message and resolved only by an admin through the service-role key. That is why
 * the detail read is a transcript in ascending order rather than a mutable record.
 *
 * Every read degrades to `[]`/`null`. Before the migration none of these tables
 * exist, and a warranty page that 500s tells the customer nothing about whether
 * their repair is covered.
 */

/* ── Warranty cover ───────────────────────────────────────────────────────── */

/**
 * Statuses where a warranty window is a meaningful thing to show.
 *
 * `completed` is cover in force, `closed` is cover that has lapsed, `disputed`
 * is cover being argued over. Everything else — cancelled, declined, expired —
 * never had a repair to warrant.
 */
const WARRANTY_STATUSES: readonly BookingStatus[] = ["completed", "closed", "disputed"];

/** Inside this many days, the tile calls a warranty "expiring soon". */
const EXPIRING_SOON_DAYS = 7;

const WARRANTY_BOOKING_COLUMNS = `
  id, reference, warranty_expires_at, completed_at,
  shop:fixer_profiles!bookings_fixer_fkey ( shop_name ),
  service:shop_services!bookings_service_fkey ( name )
`;

interface WarrantyBookingRow {
  id: string;
  reference: string;
  warranty_expires_at: string | null;
  completed_at: string | null;
  shop: { shop_name: string } | null;
  service: { name: string } | null;
}

export interface WarrantyEntry {
  bookingId: string;
  reference: string;
  shopName: string;
  /** Null when the booking was taken without a catalogue service attached. */
  serviceName: string | null;
  completedAt: string | null;
  expiresAt: string;
  /**
   * Whole days of cover left, floored at zero by `daysUntil`. Zero does not mean
   * expired — a window closing this evening reads "0 days left" and is still in
   * force. Read `active` for that.
   */
  daysLeft: number;
  active: boolean;
}

/**
 * Completed-ish bookings, warranty column included.
 *
 * The `warranty_expires_at is not null` test is done in the fold below rather
 * than as a `.not(...)` predicate here. `bookings` is not in the generated
 * `database.ts` — that file is regenerated from `schema.sql`, which predates this
 * migration — and on an untyped relation `.not()` collapses the `.returns<T>()`
 * override to `never`, i.e. a compile error. Filtering in memory costs a few rows
 * per customer and makes the null case explicit rather than implied.
 */
async function listWarrantyBookings(
  userId: string,
  limit: number,
): Promise<WarrantyBookingRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(WARRANTY_BOOKING_COLUMNS)
    .eq("customer_id", userId)
    .in("status", WARRANTY_STATUSES)
    .order("warranty_expires_at", { ascending: false })
    .limit(limit)
    .returns<WarrantyBookingRow[]>();

  if (error) {
    logReadFailure("[warranty] cover lookup failed", error);
    return [];
  }

  return data ?? [];
}

function toWarrantyEntry(
  booking: WarrantyBookingRow,
  expiresAt: string,
  now: Date,
): WarrantyEntry {
  return {
    bookingId: booking.id,
    reference: booking.reference,
    shopName: booking.shop?.shop_name ?? "Shop",
    serviceName: booking.service?.name ?? null,
    completedAt: booking.completed_at,
    expiresAt,
    daysLeft: daysUntil(expiresAt, now),
    active: new Date(expiresAt).getTime() > now.getTime(),
  };
}

/**
 * Every warranty this customer holds, in the order they need attention.
 *
 * In force first, soonest to lapse at the top — that is the row a customer acts
 * on, and it is the opposite of the SQL ordering, which is furthest-out first.
 * Sorting in memory rather than asking Postgres for it, because "active" is a
 * comparison against `now` that no index on `warranty_expires_at` can express,
 * and a customer's repair history is a handful of rows.
 *
 * A booking with no `warranty_expires_at` is dropped rather than shown with a
 * guessed date: the column is set by the completion trigger from the service's
 * `warranty_days`, so its absence means there is no cover to report, and
 * substituting `closed_at` would invent a promise nobody made.
 */
export async function listWarranties(
  userId: string,
  now: Date = new Date(),
  limit = 100,
): Promise<WarrantyEntry[]> {
  const bookings = await listWarrantyBookings(userId, limit);

  return bookings
    .flatMap((booking) =>
      booking.warranty_expires_at === null
        ? []
        : [toWarrantyEntry(booking, booking.warranty_expires_at, now)],
    )
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      // Lapsed cover reads newest-first: the repair that just went out of
      // warranty is the one still worth knowing about.
      return a.active
        ? a.expiresAt.localeCompare(b.expiresAt)
        : b.expiresAt.localeCompare(a.expiresAt);
    });
}

/* ── Claims ───────────────────────────────────────────────────────────────── */

/** Claim states where the customer is still waiting on an outcome. */
const OPEN_DISPUTE_STATUSES: readonly DisputeStatus[] = [
  "open",
  "awaiting_customer",
  "awaiting_shop",
  "under_review",
];

export interface DisputeEntry {
  id: string;
  bookingId: string;
  reference: string;
  shopName: string;
  serviceName: string | null;
  status: DisputeStatus;
  reason: string;
  desiredOutcome: string | null;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  /** Pence, when the resolution refunded. Null otherwise. */
  refundAmountPence: number | null;
  resolvedAt: string | null;
  /** True while the claim is still being worked — drives the signal tone. */
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

const DISPUTE_COLUMNS = `
  id, booking_id, raised_by, status, reason, desired_outcome,
  resolution, resolution_note, refund_amount, resolved_at,
  created_at, updated_at,
  bookings!disputes_booking_fkey!inner (
    reference, customer_id, status, warranty_expires_at,
    fixer_profiles!bookings_fixer_fkey ( slug, shop_name ),
    shop_services!bookings_service_fkey ( name )
  )
`;

interface DisputeJoinRow {
  id: string;
  booking_id: string;
  raised_by: string;
  status: DisputeStatus;
  reason: string;
  desired_outcome: string | null;
  resolution: DisputeResolution | null;
  resolution_note: string | null;
  refund_amount: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  bookings: {
    reference: string;
    customer_id: string;
    status: BookingStatus;
    warranty_expires_at: string | null;
    fixer_profiles: { slug: string; shop_name: string } | null;
    shop_services: { name: string } | null;
  } | null;
}

function toDisputeEntry(row: DisputeJoinRow): DisputeEntry {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reference: row.bookings?.reference ?? "",
    shopName: row.bookings?.fixer_profiles?.shop_name ?? "Shop",
    serviceName: row.bookings?.shop_services?.name ?? null,
    status: row.status,
    reason: row.reason,
    desiredOutcome: row.desired_outcome,
    resolution: row.resolution,
    resolutionNote: row.resolution_note,
    refundAmountPence: row.refund_amount,
    resolvedAt: row.resolved_at,
    open: OPEN_DISPUTE_STATUSES.includes(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The customer's claims, newest first.
 *
 * Scoped with `!inner` on the booking rather than `raised_by = userId`. Those are
 * not the same set: RLS lets either party read a claim, and a shop owner opening
 * their own dashboard should see a claim filed against them even though they did
 * not raise it. Filtering on `bookings.customer_id` is what makes this the
 * *customer's* list specifically, and it costs no extra round-trip.
 */
export async function listDisputes(userId: string, limit = 50): Promise<DisputeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .eq("bookings.customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DisputeJoinRow[]>();

  if (error) {
    logReadFailure("[warranty] dispute list failed", error);
    return [];
  }

  return (data ?? []).map(toDisputeEntry);
}

export interface DisputeMessageEntry {
  id: string;
  authorId: string | null;
  authorRole: "customer" | "shop" | "admin";
  /**
   * Who to print above the message.
   *
   * Derived from the role and the shop's trading name rather than looked up in
   * `users`: a shop answers a claim under its trading name, not under whichever
   * member of staff was at the counter, and an admin answers as the platform.
   * That leaves no per-author name to fetch, so this needs no extra read.
   */
  authorName: string;
  /** True when the caller wrote it — decides which side of the transcript it sits on. */
  isMine: boolean;
  body: string;
  createdAt: string;
}

export interface DisputeDetail extends DisputeEntry {
  shopSlug: string | null;
  bookingStatus: BookingStatus;
  /** Cover at the time of reading, so the page can say whether it has since lapsed. */
  warrantyExpiresAt: string | null;
  /** Ascending — a claim is a conversation, read oldest first. */
  messages: DisputeMessageEntry[];
  /** Paths inside the private bucket, not URLs. Render via a signed URL. */
  evidence: DisputeEvidenceRow[];
}

interface DisputeMessageJoinRow {
  id: string;
  author_id: string | null;
  author_role: "customer" | "shop" | "admin";
  body: string;
  created_at: string;
}

/**
 * One claim, with its transcript and evidence.
 *
 * Null covers "no such claim", "RLS refused it" and "the caller is not the
 * customer on this booking" alike, because the page answers all three with the
 * same 404 and separating them in the return type would let a caller probe which
 * claim ids exist.
 *
 * The `customer_id` check is a second belt over `is_booking_party`, not the
 * buckle. It is here so that widening the policy later — to a shop's staff, say —
 * cannot quietly turn the *customer's* claim page into a read of someone else's.
 */
export async function getDispute(userId: string, id: string): Promise<DisputeDetail | null> {
  const supabase = await createClient();

  const { data: dispute, error } = await supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .eq("id", id)
    .maybeSingle<DisputeJoinRow>();

  if (error) {
    logReadFailure("[warranty] dispute lookup failed", error);
    return null;
  }
  if (!dispute) return null;

  // Second belt over `is_booking_party`: only the customer who raised the claim
  // reads it here. The shop has its own view of the same dispute elsewhere.
  if (dispute.bookings?.customer_id !== userId) return null;

  const [messages, evidence] = await Promise.all([
    fetchDisputeMessages(id, userId, dispute.bookings?.fixer_profiles?.shop_name ?? "The shop"),
    fetchDisputeEvidence(id),
  ]);

  return {
    ...toDisputeEntry(dispute),
    shopSlug: dispute.bookings?.fixer_profiles?.slug ?? null,
    bookingStatus: dispute.bookings?.status ?? "disputed",
    warrantyExpiresAt: dispute.bookings?.warranty_expires_at ?? null,
    messages,
    evidence,
  };
}

/**
 * The claim's transcript, oldest first — a claim is a conversation.
 *
 * `authorName` is derived from the role rather than looked up, per the note on
 * `DisputeMessageEntry`: a shop answers under its trading name and an admin
 * answers as the platform, so there is no per-author profile to fetch.
 */
async function fetchDisputeMessages(
  disputeId: string,
  userId: string,
  shopName: string,
): Promise<DisputeMessageEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dispute_messages")
    .select("id, author_id, author_role, body, created_at")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true })
    .returns<DisputeMessageJoinRow[]>();

  if (error) {
    logReadFailure(`[warranty] dispute messages failed (${disputeId})`, error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorRole: row.author_role,
    authorName:
      row.author_role === "shop"
        ? shopName
        : row.author_role === "admin"
          ? "FixGrid"
          : "You",
    isMine: row.author_id === userId,
    body: row.body,
    createdAt: row.created_at,
  }));
}

async function fetchDisputeEvidence(disputeId: string): Promise<DisputeEvidenceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dispute_evidence")
    .select("id, dispute_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true })
    .returns<DisputeEvidenceRow[]>();

  if (error) {
    logReadFailure(`[warranty] dispute evidence failed (${disputeId})`, error);
    return [];
  }

  return data ?? [];
}

/* ── Summary tiles ────────────────────────────────────────────────────────── */

export interface WarrantySummary {
  /** Repairs still covered right now. */
  activeCount: number;
  /** Of those, the ones lapsing within a week — the tile that earns signal orange. */
  expiringSoonCount: number;
  openClaims: number;
  /**
   * Claims that are finished with, which includes the ones the customer withdrew.
   * `withdrawn` is terminal and needs no action, so grouping it here keeps the two
   * tiles a partition of every claim — a claim that appeared in neither count
   * would read as lost.
   */
  resolvedClaims: number;
}

/**
 * All four tiles from two reads.
 *
 * Four `head: true` counts would be four round-trips for numbers that fall out of
 * rows the page is fetching anyway, and neither "still covered" nor "lapsing
 * within a week" is expressible as a PostgREST filter — both compare a stored
 * timestamp against `now`, which is exactly the argument this function takes so a
 * test can pin it.
 *
 * A failed read leaves its own pair of tiles at zero without taking the other
 * pair down: a missing `disputes` table must not blank out the cover count.
 */
export async function getWarrantySummary(
  userId: string,
  now: Date = new Date(),
): Promise<WarrantySummary> {
  const [warranties, disputes] = await Promise.all([
    listWarranties(userId, now, 500),
    listDisputes(userId, 500),
  ]);

  const active = warranties.filter((entry) => entry.active);

  return {
    activeCount: active.length,
    // `daysLeft` is already floored at zero and rounded up, so "0" is a window
    // closing today and still counts as soon rather than as already gone.
    expiringSoonCount: active.filter((entry) => entry.daysLeft <= EXPIRING_SOON_DAYS).length,
    openClaims: disputes.filter((dispute) => dispute.open).length,
    resolvedClaims: disputes.filter((dispute) => !dispute.open).length,
  };
}

/* ── The shop's side of the same claims ───────────────────────────────────── */

/**
 * Claims filed against this shop, newest first.
 *
 * The mirror of `listDisputes`, differing in exactly one predicate: scoped by
 * `bookings.fixer_id` instead of `bookings.customer_id`. Everything else —
 * columns, join, mapping — is shared, because a claim is one row and the two
 * dashboards are two readings of it. Duplicating `DISPUTE_COLUMNS` into an
 * expert module is how the two views start disagreeing about what a claim says.
 *
 * RLS already restricts `disputes` to the parties on the booking, so this filter
 * narrows rather than protects. It is still required: a shop owner who is also a
 * customer elsewhere would otherwise see their own claims mixed into the queue
 * of claims made against them.
 */
export async function listShopDisputes(
  fixerId: string,
  limit = 50,
): Promise<DisputeEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .eq("bookings.fixer_id", fixerId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DisputeJoinRow[]>();

  if (error) {
    logReadFailure("[warranty] shop dispute list failed", error);
    return [];
  }

  return (data ?? []).map(toDisputeEntry);
}

/**
 * One claim as the shop sees it.
 *
 * Deliberately a separate function from `getDispute` rather than a parameter on
 * it. The two differ in their authorisation check — customer-on-the-booking
 * versus shop-on-the-booking — and a boolean flag deciding which identity a
 * security check uses is the kind of argument that eventually gets passed the
 * wrong way round.
 *
 * `isMine` in the transcript is computed against `userId` (the human reading it),
 * while access is decided by `fixerId` (the shop they own). Those are different
 * questions and conflating them would mark the shop's own replies as someone
 * else's.
 */
export async function getShopDispute(
  fixerId: string,
  userId: string,
  id: string,
): Promise<DisputeDetail | null> {
  const supabase = await createClient();

  const { data: dispute, error } = await supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .eq("id", id)
    .eq("bookings.fixer_id", fixerId)
    .maybeSingle<DisputeJoinRow>();

  if (error) {
    logReadFailure("[warranty] shop dispute lookup failed", error);
    return null;
  }
  if (!dispute) return null;

  const shopName = dispute.bookings?.fixer_profiles?.shop_name ?? "The shop";

  const [messages, evidence] = await Promise.all([
    fetchDisputeMessages(id, userId, shopName),
    fetchDisputeEvidence(id),
  ]);

  return {
    ...toDisputeEntry(dispute),
    shopSlug: dispute.bookings?.fixer_profiles?.slug ?? null,
    bookingStatus: dispute.bookings?.status ?? "disputed",
    warrantyExpiresAt: dispute.bookings?.warranty_expires_at ?? null,
    messages,
    evidence,
  };
}

/**
 * How many claims are waiting on this shop.
 *
 * Its own read rather than `listShopDisputes(...).filter(...)` because the
 * overview renders this number beside three other tiles and has no use for the
 * rows — `head: true` returns the count without transferring them.
 */
export async function countOpenShopDisputes(fixerId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("disputes")
    .select("id, bookings!disputes_booking_fkey!inner(fixer_id)", {
      count: "exact",
      head: true,
    })
    .eq("bookings.fixer_id", fixerId)
    .in("status", OPEN_DISPUTE_STATUSES);

  if (error) {
    logReadFailure("[warranty] open shop dispute count failed", error);
    return 0;
  }

  return count ?? 0;
}
