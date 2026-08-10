import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActorRole,
  AttachmentKind,
  BookingRow,
  BookingShopSummary,
  BookingStatus,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * One booking, in full, for `/dashboard/bookings/[reference]`.
 *
 * Split out of `customer.ts` because it answers a different question. That file
 * lists; this one resolves a single human-facing reference into the whole job —
 * booking, shop, service, audit trail and photos — which is three tables more
 * than any list needs and would be dead weight on the overview.
 *
 * The two rules from `customer.ts` still hold, and one is added:
 *
 *   1. **Never `select("*")`.** Explicit columns, so a shop-private column
 *      added to `bookings` later fails to compile here rather than shipping.
 *
 *   2. **Failure degrades to null/empty.** Before the migration is run none of
 *      these tables exist. A detail page that renders "we couldn't load the
 *      timeline" beats one that 500s.
 *
 *   3. **The ownership predicate is written out, not inherited.** RLS already
 *      scopes `bookings` to the caller, but a shop owner is *also* a permitted
 *      reader of their shop's rows — so without `customer_id = userId` the
 *      customer-side URL would happily render a job the caller is the shop for,
 *      with customer-side wording and customer-side buttons. `notFound()` is
 *      the right answer there, and that means this read has to return null.
 */

const DETAIL_COLUMNS = `
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
  service:shop_services!bookings_service_fkey (
    id, name, duration_minutes, warranty_days
  )
`;

/** The service fields the detail page shows beyond the booking's own snapshot. */
export interface BookingDetailService {
  id: string;
  name: string;
  duration_minutes: number;
  warranty_days: number;
}

/** One row of the audit trail, flattened for the timeline. */
export interface BookingTimelineEvent {
  id: string;
  actorRole: ActorRole | null;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus | null;
  note: string | null;
  createdAt: string;
}

/** A photo on the job. `storagePath` is a private bucket key, never a URL. */
export interface BookingAttachment {
  id: string;
  storagePath: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  kind: AttachmentKind;
  createdAt: string;
}

/**
 * The whole job. Extends the booking row minus the fields the customer screen
 * has no use for — the geocoded pin, and who pressed cancel (the timeline says
 * that in words).
 */
export interface BookingDetail
  extends Omit<BookingRow, "address_lat" | "address_lng" | "cancelled_by"> {
  shop: BookingShopSummary | null;
  service: BookingDetailService | null;
  events: BookingTimelineEvent[];
  attachments: BookingAttachment[];
}

type BookingDetailBase = Omit<BookingDetail, "events" | "attachments">;

interface EventRow {
  id: string;
  actor_role: ActorRole | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  note: string | null;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  kind: AttachmentKind;
  created_at: string;
}

/**
 * Ceiling on the timeline. A booking that has genuinely produced more than this
 * many audit rows is pathological, and the page renders the oldest first — so
 * truncating the tail would hide the recent end, which is the part anyone reads.
 * The read is ordered ascending and capped; in practice a job produces five.
 */
const MAX_EVENTS = 200;

/**
 * References are generated uppercase (`FIX-7Q2M4X`) but arrive from a URL a
 * person may have typed or a mail client may have lower-cased. Normalising here
 * rather than using `ilike` keeps the lookup on the unique btree index.
 */
function normaliseReference(reference: string): string {
  return reference.trim().toUpperCase();
}

/**
 * The booking behind a reference, or null when it does not resolve, is not this
 * customer's, or the tables are not there yet.
 *
 * Three reads rather than one embed: PostgREST can only order and limit an
 * embedded resource in ways that interact badly with `maybeSingle`, and the two
 * child reads have no dependency on each other. They run in parallel and either
 * may come back empty without costing the page its booking — a missing
 * `booking_attachments` should drop the photo strip, never the job.
 */
export async function getBookingByReference(
  userId: string,
  reference: string,
): Promise<BookingDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(DETAIL_COLUMNS)
    .eq("reference", normaliseReference(reference))
    .eq("customer_id", userId)
    .maybeSingle<BookingDetailBase>();

  if (error) {
    logReadFailure("[dashboard] booking detail failed", error);
    return null;
  }

  if (!data) return null;

  const [events, attachments] = await Promise.all([
    listBookingEvents(data.id),
    listBookingAttachments(data.id),
  ]);

  return { ...data, events, attachments };
}

/**
 * The audit trail, oldest first.
 *
 * Ascending because this renders as a vertical timeline read top to bottom —
 * the story of the job, not a feed. The overview's `listCustomerActivity` sorts
 * the other way for the opposite reason.
 */
async function listBookingEvents(bookingId: string): Promise<BookingTimelineEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_events")
    .select("id, actor_role, from_status, to_status, note, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .limit(MAX_EVENTS)
    .returns<EventRow[]>();

  if (error) {
    logReadFailure("[dashboard] booking events failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    actorRole: row.actor_role,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

async function listBookingAttachments(bookingId: string): Promise<BookingAttachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_attachments")
    .select("id, storage_path, file_name, mime_type, size_bytes, kind, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .returns<AttachmentRow[]>();

  if (error) {
    logReadFailure("[dashboard] booking attachments failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    kind: row.kind,
    createdAt: row.created_at,
  }));
}
