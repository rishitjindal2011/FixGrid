import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActorRole,
  BookingStatus,
  DeliveryMode,
  PaymentStatus,
} from "@/lib/types/marketplace";

/**
 * Platform-wide booking reads.
 *
 * This is the "what actually happened" view — the screen someone opens when a
 * customer rings up angry. It is deliberately read-only: admins do not
 * transition bookings, the two parties do. Reaching in to move a job between
 * states would put the audit trail in `booking_events` at odds with itself, and
 * every dispute is adjudicated from that trail.
 *
 * The customer is stitched in by id rather than embedded, because
 * `bookings.customer_id` references `auth.users` and there is no FK for
 * PostgREST to traverse. The shop and service do have named FKs.
 */

const BOOKING_COLUMNS = `
  id, reference, customer_id, fixer_id, service_id, status, delivery_mode, slot,
  device_details, customer_notes,
  address_line1, address_line2, address_city, address_postcode,
  quoted_amount, final_amount, platform_fee, tax_amount, currency,
  warranty_days, warranty_expires_at,
  requested_at, completed_at, cancelled_at, cancellation_reason, created_at,
  fixer_profiles!bookings_fixer_fkey ( id, slug, shop_name, timezone ),
  shop_services!bookings_service_fkey ( id, name, duration_minutes )
`;

interface BookingJoinRow {
  id: string;
  reference: string;
  customer_id: string;
  fixer_id: string;
  service_id: string | null;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  slot: string;
  device_details: string | null;
  customer_notes: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  quoted_amount: number | null;
  final_amount: number | null;
  platform_fee: number;
  tax_amount: number;
  currency: string;
  warranty_days: number;
  warranty_expires_at: string | null;
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  fixer_profiles: {
    id: string;
    slug: string;
    shop_name: string;
    timezone: string;
  } | null;
  shop_services: { id: string; name: string; duration_minutes: number } | null;
}

export interface BookingRowView {
  id: string;
  reference: string;
  status: BookingStatus;
  deliveryMode: DeliveryMode;
  slot: string;
  createdAt: string;
  amountPence: number | null;
  currency: string;
  customerId: string;
  customerName: string;
  shopId: string;
  shopName: string;
  shopTimezone: string;
  serviceName: string | null;
}

function toView(row: BookingJoinRow, customerName: string): BookingRowView {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    deliveryMode: row.delivery_mode,
    slot: row.slot,
    createdAt: row.created_at,
    amountPence: row.final_amount ?? row.quoted_amount,
    currency: row.currency,
    customerId: row.customer_id,
    customerName,
    shopId: row.fixer_id,
    shopName: row.fixer_profiles?.shop_name ?? "Unknown shop",
    shopTimezone: row.fixer_profiles?.timezone ?? "Europe/London",
    serviceName: row.shop_services?.name ?? null,
  };
}

async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return names;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name")
    .in("id", unique)
    .returns<Array<{ id: string; display_name: string }>>();

  if (error) {
    console.error("[bookings] customer names failed", error.message);
    return names;
  }

  for (const row of data ?? []) names.set(row.id, row.display_name);
  return names;
}

export interface BookingFilters {
  status?: BookingStatus | "all";
  q?: string;
  limit?: number;
}

export async function listBookings(filters: BookingFilters = {}): Promise<BookingRowView[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.returns<BookingJoinRow[]>();

  if (error) {
    console.error("[bookings] list failed", error.message);
    return [];
  }

  const rows = data ?? [];
  const names = await namesFor(rows.map((row) => row.customer_id));

  const views = rows.map((row) => toView(row, names.get(row.customer_id) ?? "Unknown account"));

  const needle = filters.q?.trim().toLowerCase();
  if (!needle) return views;

  return views.filter((view) =>
    [view.reference, view.customerName, view.shopName, view.serviceName]
      .filter((field): field is string => Boolean(field))
      .some((field) => field.toLowerCase().includes(needle)),
  );
}

export interface BookingEventView {
  id: string;
  actorRole: ActorRole | null;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus | null;
  note: string | null;
  createdAt: string;
}

export interface BookingDetail extends BookingRowView {
  deviceDetails: string | null;
  customerNotes: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  quotedPence: number | null;
  finalPence: number | null;
  platformFeePence: number;
  taxPence: number;
  warrantyDays: number;
  warrantyExpiresAt: string | null;
  requestedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  shopSlug: string;
  serviceDurationMinutes: number | null;
  events: BookingEventView[];
  payment: {
    id: string;
    status: PaymentStatus;
    amountPence: number;
    provider: string;
    capturedAt: string | null;
  } | null;
  disputeId: string | null;
}

export async function getBooking(reference: string): Promise<BookingDetail | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("reference", reference)
    .maybeSingle<BookingJoinRow>();

  if (error) {
    console.error("[bookings] detail failed", error.message);
    return null;
  }
  if (!data) return null;

  const [names, eventsResult, paymentResult, disputeResult] = await Promise.all([
    namesFor([data.customer_id]),
    supabase
      .from("booking_events")
      .select("id, actor_role, from_status, to_status, note, created_at")
      .eq("booking_id", data.id)
      .order("created_at", { ascending: true })
      .returns<
        Array<{
          id: string;
          actor_role: ActorRole | null;
          from_status: BookingStatus | null;
          to_status: BookingStatus | null;
          note: string | null;
          created_at: string;
        }>
      >(),
    supabase
      .from("payments")
      .select("id, status, amount, provider, captured_at")
      .eq("booking_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        status: PaymentStatus;
        amount: number;
        provider: string;
        captured_at: string | null;
      }>(),
    supabase
      .from("disputes")
      .select("id")
      .eq("booking_id", data.id)
      .maybeSingle<{ id: string }>(),
  ]);

  if (eventsResult.error) {
    console.error("[bookings] events failed", eventsResult.error.message);
  }

  const view = toView(data, names.get(data.customer_id) ?? "Unknown account");

  return {
    ...view,
    deviceDetails: data.device_details,
    customerNotes: data.customer_notes,
    addressLine1: data.address_line1,
    addressLine2: data.address_line2,
    addressCity: data.address_city,
    addressPostcode: data.address_postcode,
    quotedPence: data.quoted_amount,
    finalPence: data.final_amount,
    platformFeePence: data.platform_fee,
    taxPence: data.tax_amount,
    warrantyDays: data.warranty_days,
    warrantyExpiresAt: data.warranty_expires_at,
    requestedAt: data.requested_at,
    completedAt: data.completed_at,
    cancelledAt: data.cancelled_at,
    cancellationReason: data.cancellation_reason,
    shopSlug: data.fixer_profiles?.slug ?? "",
    serviceDurationMinutes: data.shop_services?.duration_minutes ?? null,
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      actorRole: event.actor_role,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
      createdAt: event.created_at,
    })),
    payment: paymentResult.data
      ? {
          id: paymentResult.data.id,
          status: paymentResult.data.status,
          amountPence: paymentResult.data.amount,
          provider: paymentResult.data.provider,
          capturedAt: paymentResult.data.captured_at,
        }
      : null,
    disputeId: disputeResult.data?.id ?? null,
  };
}
