/**
 * The Database type the app's Supabase clients actually use.
 *
 * `database.ts` carries a "regenerate in place" header — it is meant to be
 * overwritten wholesale by `supabase gen types typescript`. The marketplace
 * tables therefore cannot be added there: the next regeneration would silently
 * delete them and every `.insert()` in the app would go back to resolving as
 * `never`, which is exactly the failure this file exists to fix.
 *
 * So the two halves are composed here instead:
 *
 *   • `Database`      — the generated half, from `database.ts`
 *   • marketplace     — the hand-written half, derived from the row interfaces
 *                       in `marketplace.ts`
 *
 * Deriving rather than re-declaring matters. `marketplace.ts` is already the
 * reviewed description of what the migration creates; transcribing those 23
 * tables a second time here would create two descriptions that drift, and the
 * one the compiler checks against would be the copy nobody reads.
 */

import type { Database, Json, Weekday } from "@/lib/types/database";
import type {
  BookingAttachmentRow,
  BookingEventRow,
  BookingNoteRow,
  BookingRow,
  ClientNoteRow,
  ContactMethod,
  DisputeEvidenceRow,
  DisputeMessageRow,
  DisputeRow,
  LedgerEntryRow,
  WalletRow,
  WalletTopUpRow,
  MessageAttachmentRow,
  MessageRow,
  MessageThreadRow,
  NotificationPrefsRow,
  NotificationRow,
  PaymentRow,
  PayoutRow,
  RefundRow,
  SavedExpertRow,
  ShopAvailabilityRow,
  ShopClaimRow,
  ShopInventoryRow,
  ShopNoticeRow,
  ShopBillRow,
  SubscriptionPlanRow,
  UserSubscriptionRow,
  ShopServiceRow,
  ShopTimeOffRow,
  UserAddressRow,
} from "@/lib/types/marketplace";

/**
 * Strip "interface-ness" off a row type.
 *
 * This is load-bearing and extremely easy to delete by accident. postgrest-js
 * constrains every table to `{ Row: Record<string, unknown>, ... }`, and a
 * TypeScript **interface does not satisfy `Record<string, unknown>`** — only
 * type aliases and inline object literals get an implicit index signature.
 * Every row type in `marketplace.ts` is an interface, so passing them through
 * directly makes the whole schema fail the constraint. It fails *silently*:
 * there is no error on this file, the client just resolves every table to
 * `never` and 30 unrelated call sites light up with "not assignable to type
 * 'never'". The generated `database.ts` avoids this only because its tables are
 * written as inline literals.
 *
 * Mapping over the keys produces an anonymous object type, which does satisfy
 * the constraint. It is identity at runtime and near-identity at the type
 * level.
 */
type Flatten<T> = { [K in keyof T]: T[K] };

/**
 * One row interface into the `{ Row, Insert, Update, Relationships }` shape
 * postgrest-js expects.
 *
 * `Insert` is `Partial<T>` rather than a precise required/optional split.
 * That is a deliberate, bounded loss: getting it exact would mean encoding
 * every column default and trigger-populated column (`id`, `reference`,
 * `created_at`) by hand for 23 tables, and a mistake there produces a *false*
 * compile error on correct code — the worst kind. NOT NULL is enforced by the
 * database on every one of these columns regardless, so a genuinely incomplete
 * insert still fails loudly, just at runtime with a clear Postgres message
 * rather than at compile time.
 */
type TableOf<T> = {
  Row: Flatten<T>;
  Insert: Partial<Flatten<T>>;
  Update: Partial<Flatten<T>>;
  Relationships: [];
};

type GeneratedTables = Database["public"]["Tables"];

/**
 * Columns phase 3 of the migration adds to tables that already existed.
 *
 * Spelled out in full rather than intersected onto the generated definitions.
 * postgrest-js resolves a table's Row through a constrained generic, and an
 * intersection type does not always satisfy that constraint — when it fails it
 * does so silently, collapsing every insert on every table to `never`. A flat
 * object type is the shape it can actually see through.
 */
type UserRowFull = GeneratedTables["users"]["Row"] & {
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  timezone: string;
  preferred_contact: ContactMethod;
  marketing_opt_in: boolean;
  onboarded_at: string | null;
  updated_at: string;
};

type FixerRowFull = GeneratedTables["fixer_profiles"]["Row"] & {
  owner_id: string | null;
  /**
   * Added by migration 002. True while a shop awaits review — it is then absent
   * from search, the sitemap and the directory, and readable only by its owner.
   * `shop_claims_apply()` flips it to false on approval.
   */
  is_hidden: boolean;
  accepts_bookings: boolean;
  booking_lead_hours: number;
  booking_horizon_days: number;
  auto_accept: boolean;
  response_hours: number;
  default_warranty_days: number;
  payout_email: string | null;
  stripe_account_id: string | null;
  /** Paise paid to list this shop. Owner-locked by the guard trigger. */
  enrollment_fee_minor: number;
  enrollment_paid_at: string | null;
  /** Non-null once a rejected listing has had its fee returned. */
  enrollment_refunded_at: string | null;
};

/** `reviews` gains a nullable link to the booking that earned it. */
type ReviewRowFull = GeneratedTables["reviews"]["Row"] & {
  booking_id: string | null;
};

/**
 * RPCs added by `009_security_hardening.sql`.
 *
 * Declared here rather than in `database.ts` for the same reason the tables
 * are: that file is regenerated wholesale and would lose them.
 *
 * Both exist because migration 009 revoked column-level SELECT on the
 * sensitive half of `users` — an anonymous caller could previously read every
 * phone number on the platform. Column grants are per-role, not per-row, so
 * the columns had to come back through functions that state their subject:
 * `my_profile` serves the caller's own row, `booking_counterparties` serves
 * customers who have booked with a shop the caller owns.
 */
interface MarketplaceFunctions {
  my_profile: {
    Args: Record<string, never>;
    Returns: Array<
      Pick<
        UserRowFull,
        | "id"
        | "display_name"
        | "avatar_url"
        | "full_name"
        | "phone"
        | "phone_verified"
        | "timezone"
        | "preferred_contact"
        | "marketing_opt_in"
        | "onboarded_at"
        | "created_at"
        | "updated_at"
      >
    >;
  };
  booking_counterparties: {
    Args: { p_user_ids: string[] };
    Returns: Array<
      Pick<UserRowFull, "id" | "display_name" | "full_name" | "avatar_url" | "phone">
    >;
  };
  /**
   * The only way money moves. See `src/lib/wallet/server.ts`.
   *
   * `Args` is deliberately loose — the function takes a jsonb array of legs, and
   * describing that shape in the client's type would duplicate `LedgerLeg` in a
   * form the client cannot check anyway. The strong typing lives on `LedgerLeg`
   * and on the zero-sum assertion `post_ledger` makes for itself.
   *
   * `Returns: undefined` because the function returns `void`: it either commits
   * every leg or raises, so there is nothing to read back.
   */
  /**
   * What the caller's plan grants right now.
   *
   * A lapsed period resolves to the free tier inside the function, so no caller
   * has to check expiry itself. That is the point of it being one function rather
   * than a join repeated in the app and in the booking action.
   */
  my_entitlement: {
    Args: Record<string, never>;
    Returns: Array<{
      plan_code: string;
      plan_name: string;
      priority: boolean;
      fee_waived: boolean;
      bookings_used: number;
      bookings_included: number | null;
      period_end: string | null;
    }>;
  };
  /**
   * Spend one included booking. Returns false when there was nothing to spend,
   * which the caller logs rather than assuming.
   */
  consume_booking_allowance: {
    Args: Record<string, never>;
    Returns: boolean;
  };
  post_ledger: {
    Args: { p_entries: unknown };
    Returns: undefined;
  };
  /**
   * The platform fee for a prospective booking, and the category it came from.
   *
   * Returns both together because `createBooking` stores both, and two separate
   * lookups could disagree about which category was picked.
   */
  resolve_booking_fee: {
    Args: { p_fixer_id: string; p_service_id?: string | null };
    Returns: Array<{ category_id: string | null; fee_minor: number }>;
  };
}

/**
 * The composed database. Every Supabase client in the app is parameterised with
 * this, never with `Database` directly.
 *
 * All five schema keys are declared explicitly. `Views`, `Functions` and
 * `CompositeTypes` are passed straight through — dropping them (via `Omit`, for
 * instance) breaks `searchFixers`, which calls the `search_fixers` RPC and
 * needs `Functions` to stay visible.
 */
export interface AppDatabase {
  public: {
    Tables: {
      users: TableOf<UserRowFull>;
      fixer_profiles: TableOf<FixerRowFull>;
      reviews: TableOf<ReviewRowFull>;
      repair_categories: GeneratedTables["repair_categories"];
      fixer_categories: GeneratedTables["fixer_categories"];
      seo_global: GeneratedTables["seo_global"];
      cms_templates: GeneratedTables["cms_templates"];
      seo_pages: GeneratedTables["seo_pages"];
      seo_redirects: GeneratedTables["seo_redirects"];
      seo_admins: GeneratedTables["seo_admins"];

      shop_claims: TableOf<ShopClaimRow>;
      shop_notices: TableOf<ShopNoticeRow>;
      user_addresses: TableOf<UserAddressRow>;
      shop_services: TableOf<ShopServiceRow>;
      shop_inventory: TableOf<ShopInventoryRow>;
      shop_availability: TableOf<ShopAvailabilityRow>;
      shop_time_off: TableOf<ShopTimeOffRow>;
      bookings: TableOf<BookingRow>;
      booking_events: TableOf<BookingEventRow>;
      booking_notes: TableOf<BookingNoteRow>;
      booking_attachments: TableOf<BookingAttachmentRow>;
      saved_experts: TableOf<SavedExpertRow>;
      message_threads: TableOf<MessageThreadRow>;
      messages: TableOf<MessageRow>;
      message_attachments: TableOf<MessageAttachmentRow>;
      notifications: TableOf<NotificationRow>;
      notification_prefs: TableOf<NotificationPrefsRow>;
      payments: TableOf<PaymentRow>;
      refunds: TableOf<RefundRow>;
      payouts: TableOf<PayoutRow>;
      ledger_entries: TableOf<LedgerEntryRow>;
      wallets: TableOf<WalletRow>;
      wallet_topups: TableOf<WalletTopUpRow>;
      shop_bills: TableOf<ShopBillRow>;
      subscription_plans: TableOf<SubscriptionPlanRow>;
      user_subscriptions: TableOf<UserSubscriptionRow>;
      disputes: TableOf<DisputeRow>;
      dispute_messages: TableOf<DisputeMessageRow>;
      dispute_evidence: TableOf<DisputeEvidenceRow>;
      client_notes: TableOf<ClientNoteRow>;
    };
    Views: Database["public"]["Views"];
    Functions: Flatten<Database["public"]["Functions"] & MarketplaceFunctions>;
    Enums: Database["public"]["Enums"];
    CompositeTypes: Database["public"]["CompositeTypes"];
  };
}

export type { Json, Weekday };

type AppTables = AppDatabase["public"]["Tables"];

/** Row aliases for the extended tables, so callers get the new columns. */
export type AppUserRow = AppTables["users"]["Row"];
export type AppFixerProfileRow = AppTables["fixer_profiles"]["Row"];
export type AppReviewRow = AppTables["reviews"]["Row"];
