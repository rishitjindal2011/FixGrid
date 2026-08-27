/**
 * Row types for the booking marketplace — everything added by
 * `supabase/migrations/001_marketplace.sql`.
 *
 * Deliberately NOT in `database.ts`: that file carries a "regenerate in place"
 * header and is meant to be overwritten wholesale by
 * `supabase gen types typescript`. Anything hand-written there is lost on the
 * next run. These live here and are imported alongside it.
 *
 * Money is `integer` pence everywhere, matching the migration. No floats — a
 * price is a count of pence, and 19.99 is not representable in binary.
 */

import type { Json, Weekday } from "@/lib/types/database";

/* ── Enums, mirroring the Postgres types one-for-one ─────────────────────── */

/**
 * The booking lifecycle. The happy path is the first six, in order; the rest
 * are terminal branches off it. `src/lib/bookings/machine.ts` owns which
 * transitions are legal — this type only says what the values are.
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
export type InventoryCondition = "new" | "refurbished" | "used";
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
export type NotificationKind =
  | "booking_requested"
  | "booking_accepted"
  | "booking_declined"
  | "booking_confirmed"
  | "booking_reminder"
  | "booking_started"
  | "booking_completed"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "message_received"
  | "review_request"
  | "warranty_expiring"
  | "dispute_opened"
  | "dispute_updated"
  | "dispute_resolved"
  | "payout_sent"
  | "claim_reviewed";

/** Actor on a booking transition. `system` covers the cron expiry jobs. */
export type ActorRole = "customer" | "shop" | "system" | "admin";

/** What a booking attachment is a photo of. */
export type AttachmentKind = "fault" | "completion" | "evidence";

/* ── Human labels ─────────────────────────────────────────────────────────── */

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Quote ready",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
  declined: "Declined",
  cancelled_customer: "Cancelled by you",
  cancelled_shop: "Cancelled by shop",
  no_show: "No show",
  expired: "Expired",
  disputed: "In dispute",
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  in_shop: "Drop in to the shop",
  home_visit: "Home visit",
  pickup_drop: "Collection and return",
};

/**
 * Canonical order of the delivery modes, for building choice lists.
 *
 * The display label now comes from the `deliveryModes` catalogue namespace,
 * resolved with `t(mode)` at the call site — iterate this for the values and
 * translate on render rather than reading the English `DELIVERY_MODE_LABELS`.
 */
export const DELIVERY_MODES: readonly DeliveryMode[] = [
  "in_shop",
  "home_visit",
  "pickup_drop",
];

export const INVENTORY_CONDITIONS: readonly InventoryCondition[] = [
  "new",
  "refurbished",
  "used",
];

/**
 * Shown on both the dashboard table and the public panel, so the wording is
 * declared once — a part described as "Refurbished" to the owner and
 * "Reconditioned" to the customer is the same part being sold twice.
 */
export const INVENTORY_CONDITION_LABELS: Record<InventoryCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
  used: "Used",
};

/** Statuses where the job is live and the customer should be kept informed. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "accepted",
  "confirmed",
  "in_progress",
];

/** Statuses where nothing further happens unless a dispute is raised. */
export const CLOSED_BOOKING_STATUSES: readonly BookingStatus[] = [
  "closed",
  "declined",
  "cancelled_customer",
  "cancelled_shop",
  "no_show",
  "expired",
];

/* ── Rows ─────────────────────────────────────────────────────────────────── */

export interface ShopClaimRow {
  id: string;
  fixer_id: string;
  user_id: string;
  status: ClaimStatus;
  evidence: string | null;
  contact_phone: string | null;
  /** `seo_admins.id`. No FK — that table lives on the admin side. */
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A message from the platform to one shop owner.
 *
 * Distinct from `NotificationRow`: those are generated by product events and
 * read casually, whereas a notice is written by a person and must be
 * acknowledged. `sent_by` names a `seo_admins` row with no foreign key — that
 * table belongs to the admin app, and deleting an admin must not delete the
 * notices they sent.
 */
export interface ShopNoticeRow {
  id: string;
  fixer_id: string;
  sent_by: string | null;
  subject: string;
  body: string;
  severity: "info" | "warning" | "urgent";
  acknowledged_at: string | null;
  created_at: string;
}

export interface UserAddressRow {
  id: string;
  user_id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
}

export interface ShopServiceRow {
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
}

/**
 * One item of stock a shop sells over the counter.
 *
 * Separate from `ShopServiceRow` on purpose: a service is labour with a
 * duration and a diary slot, an item is a thing on a shelf with a count. The
 * only fields they share are the ones every shop-owned catalogue row has.
 */
export interface ShopInventoryRow {
  id: string;
  fixer_id: string;
  category_id: string | null;
  /**
   * The owner's own item ID — the code they quote down the phone. Free-form
   * and unique per shop, case-insensitively. Null means they have not numbered
   * this one.
   */
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  condition: InventoryCondition;
  /** Pence. Null means "price on request", never free. */
  unit_price: number | null;
  currency: string;
  quantity: number;
  /** Flag the row at or below this count. 0 disables the warning. */
  low_stock_threshold: number;
  /** Whether the item appears on the public page at all. */
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShopAvailabilityRow {
  id: string;
  fixer_id: string;
  weekday: Weekday;
  /** `HH:MM:SS`, in the shop's own timezone. */
  starts_at: string;
  ends_at: string;
  buffer_minutes: number;
  capacity: number;
  created_at: string;
}

export interface ShopTimeOffRow {
  id: string;
  fixer_id: string;
  /** Postgres `tstzrange`, serialised by PostgREST as `["2026-08-01T…","2026-08-08T…")`. */
  period: string;
  reason: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  /** Human-facing, e.g. `FIX-7Q2M4X`. Generated by a trigger, never by the app. */
  reference: string;
  customer_id: string;
  fixer_id: string;
  service_id: string | null;
  /**
   * The category the platform fee was resolved from, frozen at creation.
   *
   * Null when the booking resolved to no category — no service chosen and the
   * shop has no category links — in which case the fallback fee applied and
   * there is no category to name. See `resolve_booking_fee`.
   */
  category_id: string | null;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  /** `tstzrange` text form. Use `parseRange` in `src/lib/bookings/range.ts`. */
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
  /**
   * Snapshot of the customer's plan priority at request time. Never recomputed —
   * a later downgrade must not reorder work already under way.
   */
  priority: boolean;
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
}

export interface BookingEventRow {
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
}

export interface BookingAttachmentRow {
  id: string;
  booking_id: string;
  uploaded_by: string;
  /** Path inside the private bucket, not a URL. Render via a signed URL. */
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  kind: AttachmentKind;
  created_at: string;
}

export interface SavedExpertRow {
  user_id: string;
  fixer_id: string;
  created_at: string;
}

export interface MessageThreadRow {
  id: string;
  booking_id: string;
  customer_id: string;
  fixer_id: string;
  last_message_at: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageAttachmentRow {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  booking_id: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface NotificationPrefsRow {
  user_id: string;
  email_bookings: boolean;
  email_messages: boolean;
  email_reminders: boolean;
  email_marketing: boolean;
  sms_reminders: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
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
}

export interface RefundRow {
  id: string;
  payment_id: string;
  booking_id: string;
  /** Pence. */
  amount: number;
  reason: string | null;
  provider_refund_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PayoutRow {
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
}

export type LedgerKind = "charge" | "fee" | "refund" | "payout" | "adjustment";

/**
 * A party's balance. One row per wallet, keyed `(owner_kind, owner_id)`.
 *
 * `balance_minor` is a cache of `sum(ledger_entries.amount)` for this wallet,
 * maintained by the `ledger_entries_apply_balance` trigger — the same
 * arrangement `rating_avg` has on `fixer_profiles`, and for the same reason: so
 * a balance read is one row rather than an aggregate over a growing ledger.
 * Nothing writes it directly; see `src/lib/wallet/server.ts`.
 */
export interface WalletRow {
  id: string;
  /** `platform` is the house, and always carries the nil uuid as its owner. */
  owner_kind: "user" | "shop" | "platform";
  /** `users.id` or `fixer_profiles.id`. No FK — a wallet outlives its owner row. */
  owner_id: string;
  /** Paise. Only the platform wallet may be negative. */
  balance_minor: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * One top-up attempt, including the ones that failed.
 *
 * A credit with no intent behind it would be unauditable, so this row is created
 * before any money moves and settled afterwards. `ledger_posted` and the unique
 * `(user_id, idempotency_key)` index are together what make a repeated confirm
 * credit nothing — see `src/lib/wallet/topup.ts`.
 */
export interface WalletTopUpRow {
  id: string;
  user_id: string;
  /** Paise. Bounded ₹50–₹10,000 by a check constraint. */
  amount_minor: number;
  currency: string;
  method: "card" | "upi" | "netbanking";
  /** `mock` until a real gateway is wired, so real payments stay identifiable. */
  provider: string;
  status: "pending" | "succeeded" | "failed";
  /** `PAY-XXXXXX`, generated by a trigger. Quoted in support. */
  reference: string;
  idempotency_key: string;
  /**
   * Capability token for `/pay/<token>`, the URL the QR encodes.
   *
   * 32 random bytes, base64url. Separate from `reference` because the phone that
   * scans the QR has no session, so this token is the entire authorisation — and
   * `PAY-XXXXXX` at ~10^9 combinations is fine as a support code and far too
   * guessable as one. Never displayed.
   */
  pay_token: string;
  /** True once the ledger movement exists. Gates the credit. */
  ledger_posted: boolean;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * One bill per completed booking, and the 5% rebate decided against it.
 *
 * The shop files it; only the admin decides it. There is no update policy on this
 * table, so `status`, `rebate_minor` and the `reviewed_*` columns are
 * service-role only — the same posture `disputes` takes to keep a resolution out
 * of the claimant’s hands.
 */
export interface ShopBillRow {
  id: string;
  booking_id: string;
  fixer_id: string;
  /** Paise. What the customer was billed for the work; also the job’s final_amount. */
  amount_minor: number;
  currency: string;
  /** Optional photo of the paper bill, in the private `shop-bills` bucket. */
  storage_path: string | null;
  status: "pending" | "approved" | "rejected";
  /** What was actually credited. Null until approved; below amount_minor if capped. */
  rebate_minor: number | null;
  /** `seo_admins.id`. No FK — that table belongs to the admin app. */
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

/** Reference data: the price list. Edited by migration, not by the app. */
export interface SubscriptionPlanRow {
  code: string;
  name: string;
  /** Paise per period. 0 on the free tier. */
  price_minor: number;
  currency: string;
  /** Bookings with the fee waived per period. Null means unlimited. */
  bookings_included: number | null;
  priority: boolean;
  period_days: number;
  blurb: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * One customer subscription. An absent row means the free tier.
 *
 * A `period_end` in the past means lapsed. Quota is derived against it at the
 * moment of use, so there is no renewal job that can go stale and leave somebody
 * entitled to something they have not paid for.
 */
export interface UserSubscriptionRow {
  user_id: string;
  plan_code: string;
  period_start: string;
  period_end: string;
  bookings_used: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryRow {
  /**
   * The wallet this entry moves. Null for a row that touches no balance —
   * `ledger_entries` predates wallets, so the column is additive.
   *
   * Explicit rather than inferred from `customer_id`/`fixer_id` below: an entry
   * can name both parties, which would leave "whose balance moved" ambiguous.
   */
  wallet_id: string | null;
  booking_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  fixer_id: string | null;
  customer_id: string | null;
  kind: LedgerKind;
  /** Pence, signed. */
  amount: number;
  currency: string;
  memo: string | null;
  created_at: string;
}

export interface DisputeRow {
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
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessageRow {
  id: string;
  dispute_id: string;
  author_id: string | null;
  author_role: "customer" | "shop" | "admin";
  body: string;
  created_at: string;
}

export interface DisputeEvidenceRow {
  id: string;
  dispute_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/**
 * The shop's private working notes on one job.
 *
 * A table rather than a column on `bookings` because RLS is row-level: a
 * customer allowed to read their own booking row can read every column of it,
 * so no column of `bookings` can ever be shop-private. Owner-only policy in
 * `supabase/policies-marketplace.sql`.
 */
export interface BookingNoteRow {
  booking_id: string;
  fixer_id: string;
  body: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface ClientNoteRow {
  id: string;
  fixer_id: string;
  customer_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Columns added to existing tables by phase 3 ──────────────────────────── */

/** `users`, after the migration widens it from four columns to a real profile. */
export interface UserProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  timezone: string;
  preferred_contact: ContactMethod;
  marketing_opt_in: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Booking-related columns added to `fixer_profiles`. */
export interface FixerBookingSettings {
  accepts_bookings: boolean;
  /** Minimum notice, in hours, before the first bookable slot. */
  booking_lead_hours: number;
  /** How far ahead the calendar is open, in days. */
  booking_horizon_days: number;
  auto_accept: boolean;
  /** Advertised response time, in hours. */
  response_hours: number;
  default_warranty_days: number;
  payout_email: string | null;
  stripe_account_id: string | null;
}

/* ── Joined shapes the dashboards actually render ─────────────────────────── */

/** The shop fields a customer-facing booking card needs. */
export interface BookingShopSummary {
  id: string;
  slug: string;
  shop_name: string;
  address: string;
  timezone: string;
  verified: boolean;
  contact_phone: string | null;
  rating_avg: number;
  rating_count: number;
}

/** The customer fields an expert-facing booking card needs. */
export interface BookingCustomerSummary {
  id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

/** A booking with everything the dashboard lists need, in one row. */
export interface BookingWithParties extends BookingRow {
  shop: BookingShopSummary | null;
  customer: BookingCustomerSummary | null;
  service: Pick<ShopServiceRow, "id" | "name" | "duration_minutes"> | null;
}

/* ── Hiring & Job Openings ─────────────────────────────────────────────────── */

export type JobType = "full_time" | "part_time" | "contract" | "apprenticeship";
export type WorkLocation = "in_shop" | "on_field" | "hybrid";
export type SalaryType = "fixed" | "range" | "negotiable" | "commission";
export type SalaryPeriod = "month" | "week" | "day" | "per_job";

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  apprenticeship: "Apprenticeship / Trainee",
};

export const WORK_LOCATION_LABELS: Record<WorkLocation, string> = {
  in_shop: "In-shop",
  on_field: "On-field / Visits",
  hybrid: "Hybrid",
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  month: "/ month",
  week: "/ week",
  day: "/ day",
  per_job: "/ job",
};

export interface ShopJobRow {
  id: string;
  fixer_id: string;
  title: string;
  job_type: JobType;
  work_location: WorkLocation;
  experience_level: string;
  salary_type: SalaryType;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod;
  salary_negotiable: boolean;
  description: string;
  skills_required: string[];
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

