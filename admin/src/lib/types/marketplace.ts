/**
 * Marketplace row types, copied from the consumer app's
 * `src/lib/types/marketplace.ts` and trimmed to what this console reads.
 *
 * Copied rather than imported: the three apps are separate npm projects with
 * separate `node_modules` and no shared package, which is the same reason
 * seo-admin keeps its own `database.ts`. The authority is
 * `supabase/migrations/001_marketplace.sql`; when a column changes there it
 * changes here too.
 *
 * Money is `integer` pence everywhere, matching the migration. No floats — a
 * price is a count of pence, and 19.99 is not representable in binary.
 */

import type { Json, Weekday } from "@/lib/types/database";

/* ── Enums, mirroring the Postgres types one-for-one ─────────────────────── */

/**
 * The booking lifecycle. The happy path is the first six, in order; the rest
 * are terminal branches off it. This console never drives a transition — it
 * observes them — so there is no state machine here, only the value set.
 */
export type BookingStatus =
  | "requested"
  | "accepted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "closed"
  | "declined"
  | "cancelled_customer"
  | "cancelled_shop"
  | "no_show"
  | "expired"
  | "disputed";

export type DeliveryMode = "in_shop" | "home_visit" | "pickup_drop";
export type PriceType = "fixed" | "from" | "quote";
export type ClaimStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "refunded"
  | "partially_refunded"
  | "failed";
export type PayoutStatus = "scheduled" | "in_transit" | "paid" | "failed";
export type DisputeStatus =
  | "open"
  | "awaiting_customer"
  | "awaiting_shop"
  | "under_review"
  | "resolved"
  | "withdrawn";
export type DisputeResolution =
  | "refund_full"
  | "refund_partial"
  | "redo_service"
  | "no_action";
export type ContactMethod = "email" | "phone" | "sms";

/** Actor on a booking transition. `system` covers the cron expiry jobs. */
export type ActorRole = "customer" | "shop" | "system" | "admin";

export type LedgerKind = "charge" | "fee" | "refund" | "payout" | "adjustment";

/* ── Ordered value sets ───────────────────────────────────────────────────
   Exported as arrays, not just unions, because this app counts by status and a
   `Record<BookingStatus, number>` has to be built by iterating *something*.
   Keeping the array here means adding a status to the enum and forgetting the
   dashboard is a type error rather than a missing column. */

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "accepted",
  "confirmed",
  "in_progress",
  "completed",
  "closed",
  "declined",
  "cancelled_customer",
  "cancelled_shop",
  "no_show",
  "expired",
  "disputed",
];

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
];

export const DISPUTE_STATUSES: readonly DisputeStatus[] = [
  "open",
  "awaiting_customer",
  "awaiting_shop",
  "under_review",
  "resolved",
  "withdrawn",
];

export const PAYOUT_STATUSES: readonly PayoutStatus[] = [
  "scheduled",
  "in_transit",
  "paid",
  "failed",
];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "authorized",
  "captured",
  "refunded",
  "partially_refunded",
  "failed",
];

/* ── Human labels ─────────────────────────────────────────────────────────── */

/**
 * Note the divergence from the consumer app: there, `cancelled_customer` reads
 * "Cancelled by you" because the reader *is* the customer. An admin is a third
 * party watching both sides, so every label here names the actor explicitly.
 */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Quote ready",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
  declined: "Declined",
  cancelled_customer: "Cancelled by customer",
  cancelled_shop: "Cancelled by shop",
  no_show: "No show",
  expired: "Expired",
  disputed: "In dispute",
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  in_shop: "In shop",
  home_visit: "Home visit",
  pickup_drop: "Collection and return",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  awaiting_customer: "Awaiting customer",
  awaiting_shop: "Awaiting shop",
  under_review: "Under review",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
};

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  refund_full: "Full refund",
  refund_partial: "Partial refund",
  redo_service: "Redo the service",
  no_action: "No action",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  scheduled: "Scheduled",
  in_transit: "In transit",
  paid: "Paid",
  failed: "Failed",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  authorized: "Authorized",
  captured: "Captured",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  failed: "Failed",
};

/* ── Working sets the admin queues are built from ─────────────────────────── */

/** Statuses where the job is live and the platform is still on the hook. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "accepted",
  "confirmed",
  "in_progress",
];

/**
 * A dispute in any of these is waiting on someone. `resolved` and `withdrawn`
 * are the only two that are not — everything else counts toward the
 * needs-attention panel, including the two "awaiting" states, because a dispute
 * parked on an unresponsive party is exactly what an admin is there to unstick.
 */
export const OPEN_DISPUTE_STATUSES: readonly DisputeStatus[] = [
  "open",
  "awaiting_customer",
  "awaiting_shop",
  "under_review",
];

/** Money owed to a shop that has not landed yet. */
export const PENDING_PAYOUT_STATUSES: readonly PayoutStatus[] = ["scheduled", "in_transit"];

/**
 * Payments whose money the platform actually holds.
 *
 * `partially_refunded` is included and `refunded` is not: a partial refund
 * still leaves gross volume on the books, a full one does not. `authorized`
 * is excluded because the funds have not moved.
 */
export const CAPTURED_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "captured",
  "partially_refunded",
];

/* ── Rows ─────────────────────────────────────────────────────────────────
   Every row type below is a `type` alias, never an `interface`, and that is
   load-bearing rather than style.

   `@supabase/postgrest-js` constrains a table's `Row` to `Record<string, unknown>`
   in order to resolve a `select("a, b")` string into a result type. TypeScript
   gives object *type aliases* an implicit index signature and gives interfaces
   none — so an interface fails that constraint, the conditional type falls
   through, and `data` silently infers as `never[]`. Not an error at the type
   declaration; an error at every call site, complaining that `status` does not
   exist on `never`.

   Change one of these to `interface` and the whole query layer stops
   typechecking. */

export type ShopClaimRow = {
  id: string;
  fixer_id: string;
  user_id: string;
  status: ClaimStatus;
  evidence: string | null;
  contact_phone: string | null;
  /**
   * `seo_admins.id`. No FK — the migration was written against an admin table
   * it could not reference. It is why this console authenticates against
   * `seo_admins` rather than a table of its own: an approval recorded here
   * lines up with the schema exactly as written.
   */
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopServiceRow = {
  id: string;
  fixer_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_type: PriceType;
  /** Pence. */
  price_min: number | null;
  /** Pence. */
  price_max: number | null;
  currency: string;
  duration_minutes: number;
  delivery_modes: DeliveryMode[];
  warranty_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ShopAvailabilityRow = {
  id: string;
  fixer_id: string;
  weekday: Weekday;
  /** `HH:MM:SS`, in the shop's own timezone. */
  starts_at: string;
  ends_at: string;
  buffer_minutes: number;
  capacity: number;
  created_at: string;
};

export type BookingRow = {
  id: string;
  /** Human-facing, e.g. `FIX-7Q2M4X`. Generated by a trigger, never by the app. */
  reference: string;
  customer_id: string;
  fixer_id: string;
  service_id: string | null;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  /** Postgres `tstzrange`, serialised by PostgREST as `["2026-08-01T…","2026-08-08T…")`. */
  slot: string;

  device_details: string | null;
  customer_notes: string | null;

  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_lat: number | null;
  address_lng: number | null;

  /** Pence. */
  quoted_amount: number | null;
  /** Pence. */
  final_amount: number | null;
  platform_fee: number;
  tax_amount: number;
  currency: string;

  warranty_days: number;
  warranty_expires_at: string | null;

  requested_at: string;
  responded_at: string | null;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingEventRow = {
  id: string;
  booking_id: string;
  /** Null for system actions — cron expiry, warranty close. */
  actor_id: string | null;
  actor_role: ActorRole | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  note: string | null;
  metadata: Json;
  created_at: string;
};

export type MessageThreadRow = {
  id: string;
  booking_id: string;
  customer_id: string;
  fixer_id: string;
  last_message_at: string | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  booking_id: string;
  customer_id: string;
  status: PaymentStatus;
  /** Pence, gross. */
  amount: number;
  platform_fee: number;
  tax_amount: number;
  currency: string;
  provider: string;
  provider_intent_id: string | null;
  provider_charge_id: string | null;
  authorized_at: string | null;
  captured_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RefundRow = {
  id: string;
  payment_id: string;
  booking_id: string;
  /** Pence. */
  amount: number;
  reason: string | null;
  provider_refund_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type PayoutRow = {
  id: string;
  fixer_id: string;
  status: PayoutStatus;
  /** Pence, net of the platform fee. */
  amount: number;
  currency: string;
  provider_payout_id: string | null;
  scheduled_for: string | null;
  paid_at: string | null;
  created_at: string;
};

/**
 * A party's balance. One row per wallet, keyed `(owner_kind, owner_id)`.
 *
 * `balance_minor` is a cache of `sum(ledger_entries.amount)` for this wallet,
 * kept in step by the `ledger_entries_apply_balance` trigger. Nothing writes it
 * directly — see `admin/src/lib/wallet.ts`.
 */
export type WalletRow = {
  id: string;
  /** `platform` is the house, and always carries the nil uuid as its owner. */
  owner_kind: "user" | "shop" | "platform";
  owner_id: string;
  /** Paise. Only the platform wallet may be negative. */
  balance_minor: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

/** One bill per completed booking, and the 5% rebate decided against it. */
export type ShopBillRow = {
  id: string;
  booking_id: string;
  fixer_id: string;
  /** Paise. What the customer was billed; also the job’s final_amount. */
  amount_minor: number;
  currency: string;
  storage_path: string | null;
  status: "pending" | "approved" | "rejected";
  /** What was credited. Null until approved; below amount_minor if capped. */
  rebate_minor: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type LedgerEntryRow = {
  id: string;
  /** The wallet this entry moves. Null for a row that touches no balance. */
  wallet_id: string | null;
  booking_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  fixer_id: string | null;
  customer_id: string | null;
  kind: LedgerKind;
  /** Paise, signed. */
  amount: number;
  currency: string;
  memo: string | null;
  created_at: string;
};

export type DisputeRow = {
  id: string;
  booking_id: string;
  raised_by: string;
  status: DisputeStatus;
  reason: string;
  desired_outcome: string | null;
  resolution: DisputeResolution | null;
  resolution_note: string | null;
  /** Pence, when the resolution refunds. */
  refund_amount: number | null;
  /** `seo_admins.id`, same no-FK arrangement as `shop_claims.reviewed_by`. */
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DisputeMessageRow = {
  id: string;
  dispute_id: string;
  author_id: string | null;
  author_role: "customer" | "shop" | "admin";
  body: string;
  created_at: string;
};

/** `users`, after the migration widens it from four columns to a real profile. */
export type UserProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  /**
   * Descriptive, not a grant.
   *
   * Real capability lives elsewhere: `fixer_profiles.owner_id` opens the expert
   * dashboard, and the separate `seo_admins` table is what lets someone into
   * this console. Setting this to `admin` labels an account; it does not let
   * anyone in anywhere.
   */
  role: "customer" | "fixer" | "admin";
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  timezone: string;
  preferred_contact: ContactMethod;
  marketing_opt_in: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ── Joined shapes the admin screens render ───────────────────────────────── */

/** The shop fields an admin row needs to identify a shop without a second read. */
export type AdminShopSummary = {
  id: string;
  slug: string;
  shop_name: string;
  verified: boolean;
};

/**
 * The customer fields an admin row needs.
 *
 * `bookings.customer_id` references `auth.users`, not `public.users`, so there
 * is no foreign key for PostgREST to resolve and no embed will work no matter
 * how it is spelled. Every list stitches these in with one extra keyed read.
 */
export type AdminCustomerSummary = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};
