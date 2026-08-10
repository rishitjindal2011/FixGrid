import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * The customer's review centre: what they still owe a review on, and what they
 * have already written.
 *
 * The load-bearing decision here is **what "already reviewed" means**.
 *
 * `reviews` is unique on `(fixer_id, customer_id)` — one review per customer per
 * shop, which is the schema's answer to rating inflation — and `submitReview`
 * upserts on exactly that pair. `reviews.booking_id` exists and is nullable, but
 * the action does not populate it, so matching a booking to its review through
 * that column would find nothing and prompt every customer to review the same
 * shop once per job. The match is therefore on the **shop**, not the booking:
 * if you have reviewed this shop, you are not asked again.
 *
 * That also decides the shape of the prompt list. Several finished jobs at one
 * shop collapse to a single card, keyed by shop and carrying the most recent
 * job, because writing the review would overwrite the same row either way and
 * offering three cards that fight each other is worse than offering one.
 *
 * Every read degrades to `[]`. Before the migration `bookings` does not exist,
 * and a reviews page that 500s is worse than one that says there is nothing to
 * review — the customer has lost nothing either way, and the page still renders.
 */

/**
 * Statuses where the work is finished and a review is a fair thing to ask for.
 *
 * `disputed` is excluded, unlike the billing page's billable set. A claim being
 * argued over is not the moment to ask for a star rating, and a review written
 * mid-dispute is about the dispute rather than the repair.
 */
const REVIEWABLE_STATUSES: readonly BookingStatus[] = ["completed", "closed"];

/* ── Awaiting review ──────────────────────────────────────────────────────── */

export interface ReviewableBooking {
  bookingId: string;
  reference: string;
  fixerId: string;
  /** The review action needs this to revalidate the shop's public page. */
  slug: string;
  shopName: string;
  /** Null when the booking was taken without a catalogue service attached. */
  serviceName: string | null;
  /** When the job finished. Falls back to `closed_at` for a closed booking. */
  finishedAt: string | null;
  /** Other finished jobs at the same shop, folded into this card. */
  alsoCount: number;
}

interface ReviewableBookingRow {
  id: string;
  reference: string;
  fixer_id: string;
  status: BookingStatus;
  completed_at: string | null;
  closed_at: string | null;
  created_at: string;
  shop: { id: string; slug: string; shop_name: string } | null;
  service: { name: string } | null;
}

interface MyReviewRow {
  id: string;
  fixer_id: string;
  rating: number;
  text: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  shop: { slug: string; shop_name: string } | null;
}

/**
 * The shops this customer has already reviewed.
 *
 * Read as a bare id list rather than reusing `listMyReviews`, so a shop whose
 * `fixer_profiles` row has since been deleted still suppresses its prompt —
 * `listMyReviews` drops rows it cannot name, and this must not.
 */
async function fetchReviewedFixerIds(userId: string): Promise<Set<string> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("fixer_id")
    .eq("customer_id", userId)
    .returns<{ fixer_id: string }[]>();

  if (error) {
    logReadFailure("[reviews] reviewed shops lookup failed", error);
    // Null rather than an empty set: "we don't know" and "you've reviewed
    // nothing" produce opposite prompt lists, and asking someone to review a
    // shop they already reviewed is the worse of the two mistakes.
    return null;
  }

  return new Set((data ?? []).map((row) => row.fixer_id));
}

/**
 * Finished jobs with no review against the shop, newest first.
 *
 * One card per shop. `bookings` comes back newest-first, so the first row seen
 * for a shop is the most recent job and the ones after it only bump `alsoCount`
 * — that is what makes "and 2 other repairs" honest without a second query.
 */
export async function listReviewableBookings(
  userId: string,
  limit = 50,
): Promise<ReviewableBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, fixer_id, status, completed_at, closed_at, created_at,
       shop:fixer_profiles!bookings_fixer_fkey ( id, slug, shop_name ),
       service:shop_services!bookings_service_fkey ( name )`,
    )
    .eq("customer_id", userId)
    .in("status", REVIEWABLE_STATUSES)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<ReviewableBookingRow[]>();

  if (error) {
    logReadFailure("[reviews] reviewable bookings failed", error);
    return [];
  }

  const reviewed = await fetchReviewedFixerIds(userId);
  if (reviewed === null) return [];

  const byFixer = new Map<string, ReviewableBooking>();

  for (const booking of data ?? []) {
    const shop = booking.shop;
    // No shop row means no `fixerId` and no `slug` to post with, so the form
    // could not submit. Dropping it beats rendering a card that cannot work.
    if (!shop) continue;
    if (reviewed.has(booking.fixer_id)) continue;

    const existing = byFixer.get(booking.fixer_id);
    if (existing) {
      existing.alsoCount += 1;
      continue;
    }

    byFixer.set(booking.fixer_id, {
      bookingId: booking.id,
      reference: booking.reference,
      fixerId: booking.fixer_id,
      slug: shop.slug,
      shopName: shop.shop_name,
      serviceName: booking.service?.name ?? null,
      finishedAt: booking.completed_at ?? booking.closed_at,
      alsoCount: 0,
    });
  }

  return Array.from(byFixer.values());
}

/* ── Written reviews ──────────────────────────────────────────────────────── */

export interface MyReview {
  id: string;
  fixerId: string;
  slug: string;
  shopName: string;
  rating: number;
  text: string | null;
  /**
   * True when the review carries the booking it came from. Seeded reviews and
   * anything written from the shop's public page do not, and the page says so
   * rather than implying every review is verified.
   */
  verified: boolean;
  createdAt: string;
  /** Differs from `createdAt` once a review has been edited via the upsert. */
  updatedAt: string;
}

/**
 * Reviews this customer has written, newest first.
 *
 * The shop is embedded with an explicit FK hint. `reviews` carries three foreign
 * keys after the migration — fixer, customer and booking — and naming the
 * constraint keeps the embed unambiguous if another is ever added.
 */
export async function listMyReviews(userId: string, limit = 50): Promise<MyReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, fixer_id, rating, text, booking_id, created_at, updated_at,
       shop:fixer_profiles!reviews_fixer_id_fkey ( slug, shop_name )`,
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<MyReviewRow[]>();

  if (error) {
    logReadFailure("[reviews] my reviews failed", error);
    return [];
  }

  return (data ?? [])
    .filter((row): row is MyReviewRow & { shop: NonNullable<MyReviewRow["shop"]> } =>
      row.shop !== null,
    )
    .map((row) => ({
      id: row.id,
      fixerId: row.fixer_id,
      slug: row.shop.slug,
      shopName: row.shop.shop_name,
      rating: row.rating,
      text: row.text,
      verified: row.booking_id !== null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}
