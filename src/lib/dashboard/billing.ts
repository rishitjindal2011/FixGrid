import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BookingStatus,
  DeliveryMode,
  PaymentStatus,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Billing history for the customer's `/dashboard/billing`.
 *
 * The load-bearing decision here is **where an amount comes from**.
 *
 * `bookings` carries a price snapshot — `final_amount`, `platform_fee`,
 * `tax_amount`, `currency` — frozen at the moment the job was agreed, precisely
 * so a shop raising its rates cannot rewrite what a past customer was quoted.
 * `payments` records what a provider actually moved. Those are different facts,
 * and they are read in that order of preference: a payment row wins when one
 * exists, because it is what was charged; the booking snapshot is the fallback,
 * because it is what was agreed.
 *
 * That fallback is not a corner case today. The money tables were created
 * empty on purpose — holding customer funds between service and payout carries
 * KYC and chargeback obligations that are a separate, deliberate decision — so
 * until Stripe lands, every invoice on this page is derived from the booking and
 * reads as uncollected. That is the truth, not a bug, and the summary below is
 * worded so the page can say so.
 *
 * Money is integer paise throughout. Nothing in this file divides by 100 —
 * rendering is `formatMoney`'s job, and a float escaping into a total is the one
 * error that cannot be corrected downstream.
 *
 * Every read degrades to `[]`/`null`: before the migration none of these tables
 * exist, and a billing page that 500s is worse than one that says "no invoices".
 */

/* ── Shared reads ─────────────────────────────────────────────────────────── */

const INVOICE_BOOKING_COLUMNS = `
  id, reference, status, delivery_mode, slot,
  quoted_amount, final_amount, platform_fee, tax_amount, currency,
  warranty_expires_at, completed_at, closed_at, created_at,
  shop:fixer_profiles!bookings_fixer_fkey ( slug, shop_name, address ),
  service:shop_services!bookings_service_fkey ( name )
`;

interface InvoiceBookingRow {
  id: string;
  reference: string;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  slot: string;
  quoted_amount: number | null;
  final_amount: number | null;
  platform_fee: number;
  tax_amount: number;
  currency: string;
  warranty_expires_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  created_at: string;
  shop: { slug: string; shop_name: string; address: string } | null;
  service: { name: string } | null;
}

interface PaymentSummaryRow {
  id: string;
  booking_id: string;
  status: PaymentStatus;
  amount: number;
  platform_fee: number;
  tax_amount: number;
  currency: string;
  created_at: string;
}

/**
 * Statuses that produce an invoice.
 *
 * `disputed` is included deliberately: the job was completed and billed, and a
 * claim being open is not a reason for the customer's own record of it to
 * disappear from the page they would go to in order to argue about it.
 */
const BILLABLE_STATUSES: readonly BookingStatus[] = ["completed", "closed", "disputed"];

/** Payment states where money has actually been collected. */
const SETTLED_STATUSES: readonly PaymentStatus[] = [
  "captured",
  "refunded",
  "partially_refunded",
];

async function listBillableBookings(
  userId: string,
  limit: number,
): Promise<InvoiceBookingRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(INVOICE_BOOKING_COLUMNS)
    .eq("customer_id", userId)
    .in("status", BILLABLE_STATUSES)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<InvoiceBookingRow[]>();

  if (error) {
    logReadFailure("[billing] billable bookings failed", error);
    return [];
  }

  return data ?? [];
}

/**
 * The payment that represents each booking, keyed by booking id.
 *
 * A booking can accumulate several rows — a failed attempt followed by a
 * successful one is the ordinary case — so a settled payment always beats an
 * unsettled one, and among equals the newest wins. Picking the newest alone
 * would let a stray retry hide a capture that already happened.
 *
 * Read separately rather than embedded on the booking select, so that a missing
 * `payments` table costs the page its payment status and not its invoices.
 */
async function fetchPayments(bookingIds: string[]): Promise<Map<string, PaymentSummaryRow>> {
  const byBooking = new Map<string, PaymentSummaryRow>();
  if (bookingIds.length === 0) return byBooking;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, booking_id, status, amount, platform_fee, tax_amount, currency, created_at")
    .in("booking_id", bookingIds)
    .returns<PaymentSummaryRow[]>();

  if (error) {
    logReadFailure("[billing] payments lookup failed", error);
    return byBooking;
  }

  for (const row of data ?? []) {
    const current = byBooking.get(row.booking_id);
    if (!current || beats(row, current)) byBooking.set(row.booking_id, row);
  }

  return byBooking;
}

function beats(candidate: PaymentSummaryRow, incumbent: PaymentSummaryRow): boolean {
  const candidateSettled = SETTLED_STATUSES.includes(candidate.status);
  const incumbentSettled = SETTLED_STATUSES.includes(incumbent.status);
  if (candidateSettled !== incumbentSettled) return candidateSettled;
  return candidate.created_at > incumbent.created_at;
}

/* ── Invoices ─────────────────────────────────────────────────────────────── */

export interface Invoice {
  bookingId: string;
  reference: string;
  shopName: string;
  /** When the job finished — what an invoice is dated by. ISO. */
  date: string;
  /** The repair itself, before fee and tax. Pence. */
  servicePence: number;
  platformFeePence: number;
  taxPence: number;
  totalPence: number;
  currency: string;
  /** `pending` when no payment row exists yet — nothing has been charged. */
  status: PaymentStatus;
  paymentId: string | null;
}

function toInvoice(booking: InvoiceBookingRow, payment: PaymentSummaryRow | undefined): Invoice {
  // `final_amount` is what the job actually came to; `quoted_amount` is what was
  // agreed before work started. A completed booking should carry the first, but
  // falling back keeps a shop that forgot to adjust the price from producing a
  // ₹0 invoice.
  const snapshotService = booking.final_amount ?? booking.quoted_amount ?? 0;

  // A payment's `amount` is gross — fee and tax included — so the service line
  // is what is left after subtracting them, never the other way round.
  const platformFeePence = payment?.platform_fee ?? booking.platform_fee;
  const taxPence = payment?.tax_amount ?? booking.tax_amount;
  const servicePence = payment
    ? Math.max(0, payment.amount - platformFeePence - taxPence)
    : snapshotService;

  return {
    bookingId: booking.id,
    reference: booking.reference,
    shopName: booking.shop?.shop_name ?? "Shop",
    date: booking.completed_at ?? booking.closed_at ?? booking.created_at,
    servicePence,
    platformFeePence,
    taxPence,
    totalPence: payment?.amount ?? snapshotService + platformFeePence + taxPence,
    currency: payment?.currency ?? booking.currency,
    status: payment?.status ?? "pending",
    paymentId: payment?.id ?? null,
  };
}

export async function listInvoices(userId: string, limit = 100): Promise<Invoice[]> {
  const bookings = await listBillableBookings(userId, limit);
  if (bookings.length === 0) return [];

  const payments = await fetchPayments(bookings.map((booking) => booking.id));

  return bookings.map((booking) => toInvoice(booking, payments.get(booking.id)));
}

export interface InvoiceLine {
  label: string;
  amountPence: number;
}

export interface InvoiceDetail extends Invoice {
  shopSlug: string | null;
  shopAddress: string | null;
  serviceName: string | null;
  deliveryMode: DeliveryMode;
  /** `tstzrange` text. Parse with `slotStart`/`slotEnd`. */
  slot: string;
  bookingStatus: BookingStatus;
  /** The breakdown, in the order it should print. Sums to `totalPence`. */
  lines: InvoiceLine[];
  refunds: RefundEntry[];
  refundedPence: number;
}

/**
 * One invoice, by its booking reference.
 *
 * Keyed on `reference` rather than the booking uuid because that is the string
 * on the invoice itself and the one a customer reads down the phone, so the URL
 * they land on from a printed copy is the one that works.
 */
export async function getInvoice(
  userId: string,
  reference: string,
): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(INVOICE_BOOKING_COLUMNS)
    .eq("customer_id", userId)
    .eq("reference", reference)
    .maybeSingle<InvoiceBookingRow>();

  if (error) {
    logReadFailure(`[billing] invoice lookup failed (${reference})`, error);
    return null;
  }
  if (!booking) return null;

  const [payments, refunds] = await Promise.all([
    fetchPayments([booking.id]),
    fetchRefunds([booking.id]),
  ]);

  const invoice = toInvoice(booking, payments.get(booking.id));
  const entries = (refunds.get(booking.id) ?? []).map((refund) => ({
    ...refund,
    reference: booking.reference,
    shopName: invoice.shopName,
    currency: invoice.currency,
  }));

  return {
    ...invoice,
    shopSlug: booking.shop?.slug ?? null,
    shopAddress: booking.shop?.address ?? null,
    serviceName: booking.service?.name ?? null,
    deliveryMode: booking.delivery_mode,
    slot: booking.slot,
    bookingStatus: booking.status,
    // Zero-value lines are dropped: a shop that charges no VAT should not have
    // to explain a "₹0 VAT" row to its customer.
    lines: [
      { label: booking.service?.name ?? "Repair", amountPence: invoice.servicePence },
      { label: "Platform fee", amountPence: invoice.platformFeePence },
      { label: "VAT", amountPence: invoice.taxPence },
    ].filter((line) => line.amountPence > 0),
    refunds: entries,
    refundedPence: entries.reduce((total, refund) => total + refund.amountPence, 0),
  };
}

/* ── Refunds ──────────────────────────────────────────────────────────────── */

export interface RefundEntry {
  id: string;
  bookingId: string;
  reference: string;
  shopName: string;
  amountPence: number;
  /**
   * Taken from the booking, not the refund. `refunds` has no currency column —
   * a refund is always in the currency of the thing it reverses.
   */
  currency: string;
  reason: string | null;
  paymentId: string;
  createdAt: string;
}

interface RefundRowSummary {
  id: string;
  booking_id: string;
  payment_id: string;
  amount: number;
  reason: string | null;
  created_at: string;
}

type PartialRefund = Omit<RefundEntry, "reference" | "shopName" | "currency">;

/**
 * Refunds against a set of bookings.
 *
 * Read by `booking_id` rather than embedded through `payments`, because
 * `refunds.booking_id` carries no named foreign key — only `refunds_payment_fkey`
 * exists — so PostgREST has no relationship to traverse from a booking to its
 * refunds. RLS scopes the table to bookings the caller is a party to regardless.
 */
async function fetchRefunds(bookingIds: string[]): Promise<Map<string, PartialRefund[]>> {
  const byBooking = new Map<string, PartialRefund[]>();
  if (bookingIds.length === 0) return byBooking;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("refunds")
    .select("id, booking_id, payment_id, amount, reason, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false })
    .returns<RefundRowSummary[]>();

  if (error) {
    logReadFailure("[billing] refunds lookup failed", error);
    return byBooking;
  }

  for (const row of data ?? []) {
    const entry: PartialRefund = {
      id: row.id,
      bookingId: row.booking_id,
      amountPence: row.amount,
      reason: row.reason,
      paymentId: row.payment_id,
      createdAt: row.created_at,
    };
    const existing = byBooking.get(row.booking_id);
    if (existing) existing.push(entry);
    else byBooking.set(row.booking_id, [entry]);
  }

  return byBooking;
}

export async function listRefunds(userId: string, limit = 100): Promise<RefundEntry[]> {
  const bookings = await listBillableBookings(userId, limit);
  if (bookings.length === 0) return [];

  const byBooking = new Map(bookings.map((booking) => [booking.id, booking]));
  const refunds = await fetchRefunds(bookings.map((booking) => booking.id));

  return Array.from(refunds.entries())
    .flatMap(([bookingId, entries]) => {
      const booking = byBooking.get(bookingId);
      if (!booking) return [];
      return entries.map((refund) => ({
        ...refund,
        reference: booking.reference,
        shopName: booking.shop?.shop_name ?? "Shop",
        currency: booking.currency,
      }));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ── Summary tiles ────────────────────────────────────────────────────────── */

export interface BillingSummary {
  /** Everything billed across finished jobs. Pence. */
  totalSpentPence: number;
  /**
   * Committed but not yet released to the shop: completed jobs whose warranty
   * window is still open. This is the money a claim could still reverse.
   */
  inEscrowPence: number;
  refundedPence: number;
  /**
   * Invoices with no settled payment against them.
   *
   * Until the payment provider is wired up `payments` is empty by design, so
   * this equals the invoice count. That is honest — nothing has been collected
   * — and the page should word the tile as "awaiting payment" rather than
   * implying the customer is in arrears.
   */
  openInvoices: number;
}

/**
 * All four tiles from one pass.
 *
 * The alternative — four `head: true` counts and two sums — would be six
 * round-trips for numbers that all fall out of the same rows, and a customer's
 * finished-job history is small enough to fold in memory.
 */
export async function getBillingSummary(
  userId: string,
  now: Date = new Date(),
): Promise<BillingSummary> {
  const bookings = await listBillableBookings(userId, 500);

  const empty: BillingSummary = {
    totalSpentPence: 0,
    inEscrowPence: 0,
    refundedPence: 0,
    openInvoices: 0,
  };
  if (bookings.length === 0) return empty;

  const bookingIds = bookings.map((booking) => booking.id);
  const [payments, refunds] = await Promise.all([
    fetchPayments(bookingIds),
    fetchRefunds(bookingIds),
  ]);

  return bookings.reduce<BillingSummary>((summary, booking) => {
    const invoice = toInvoice(booking, payments.get(booking.id));

    // Escrow tracks the warranty window, not the booking status alone: once the
    // window closes the cron moves the row to `closed` and the money is the
    // shop's, so a null expiry on a completed job counts as still open rather
    // than already released.
    const warrantyOpen =
      booking.status === "completed" &&
      (booking.warranty_expires_at === null ||
        new Date(booking.warranty_expires_at).getTime() > now.getTime());

    const refunded = (refunds.get(booking.id) ?? []).reduce(
      (total, refund) => total + refund.amountPence,
      0,
    );

    return {
      totalSpentPence: summary.totalSpentPence + invoice.totalPence,
      inEscrowPence: summary.inEscrowPence + (warrantyOpen ? invoice.totalPence : 0),
      refundedPence: summary.refundedPence + refunded,
      openInvoices:
        summary.openInvoices + (SETTLED_STATUSES.includes(invoice.status) ? 0 : 1),
    };
  }, empty);
}
