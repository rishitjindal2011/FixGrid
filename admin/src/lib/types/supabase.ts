/**
 * The Database type this console's Supabase client actually uses.
 *
 * `database.ts` carries a "regenerate in place" header — it is meant to be
 * overwritten wholesale by `supabase gen types typescript`. The marketplace
 * tables therefore cannot be added there: the next regeneration would silently
 * delete them and every read in this app would go back to resolving as `never`,
 * which is exactly the failure this file exists to fix. (It has happened once
 * already — ~60 errors across `platform.ts`, `analytics.ts` and `admin.ts`
 * appeared in one go when the generated file was refreshed.)
 *
 * So the two halves are composed here instead:
 *
 *   • `Database`  — the generated half, from `database.ts`
 *   • marketplace — the hand-written half, derived from the row types in
 *                   `marketplace.ts`
 *
 * This mirrors `src/lib/types/supabase.ts` in the consumer app. The two are
 * separate npm projects with no shared package, so the file is duplicated for
 * the same reason `marketplace.ts` is. The authority for both is
 * `supabase/migrations/`.
 */

import type { AdminRole, Database, Json, Weekday } from "@/lib/types/database";
import type { DisputeEvidenceRow } from "@/lib/queries/disputes";
import type {
  BookingEventRow,
  BookingRow,
  ContactMethod,
  DisputeMessageRow,
  DisputeRow,
  LedgerEntryRow,
  MessageRow,
  MessageThreadRow,
  PaymentRow,
  PayoutRow,
  RefundRow,
  ShopAvailabilityRow,
  ShopClaimRow,
  ShopServiceRow,
  UserProfileRow,
} from "@/lib/types/marketplace";

/**
 * Strip "interface-ness" off a row type.
 *
 * Load-bearing and very easy to delete by accident. postgrest-js constrains
 * every table to `{ Row: Record<string, unknown>, ... }`, and a TypeScript
 * **interface does not satisfy `Record<string, unknown>`** — only type aliases
 * and inline object literals get an implicit index signature. It fails
 * *silently*: no error appears on this file, the client just resolves every
 * table to `never` and unrelated call sites light up with "not assignable to
 * type 'never'". The generated `database.ts` avoids this only because its
 * tables are written as inline literals.
 *
 * Mapping over the keys produces an anonymous object type, which does satisfy
 * the constraint. Identity at runtime, near-identity at the type level.
 */
type Flatten<T> = { [K in keyof T]: T[K] };

/**
 * One row type into the `{ Row, Insert, Update, Relationships }` shape
 * postgrest-js expects.
 *
 * `Insert` is `Partial<T>` rather than a precise required/optional split. That
 * is a deliberate, bounded loss: getting it exact would mean encoding every
 * column default and trigger-populated column by hand, and a mistake there
 * produces a *false* compile error on correct code — the worst kind. NOT NULL
 * is enforced by the database regardless, so a genuinely incomplete insert
 * still fails loudly, with a clear Postgres message rather than at compile
 * time.
 */
type TableOf<T> = {
  Row: Flatten<T>;
  Insert: Partial<Flatten<T>>;
  Update: Partial<Flatten<T>>;
  Relationships: [];
};

type GeneratedTables = Database["public"]["Tables"];

/**
 * Columns the marketplace migrations add to tables that already existed.
 *
 * Spelled out as flat intersections rather than left to the generated
 * definitions. postgrest-js resolves a table's Row through a constrained
 * generic; a shape it cannot see through collapses to `never` silently.
 */
type FixerRowFull = GeneratedTables["fixer_profiles"]["Row"] & {
  /**
   * Migration 002. True while a shop awaits review — absent from search, the
   * sitemap and the directory, readable only by its owner. `shop_claims_apply()`
   * flips it to false on approval.
   */
  is_hidden: boolean;
  /**
   * Migration 003. `suspended_at` is the flag; `is_hidden` is deliberately
   * separate. They mean different things — "never reviewed" versus "reviewed
   * and stopped".
   */
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
  accepts_bookings: boolean;
  booking_lead_hours: number;
  booking_horizon_days: number;
  auto_accept: boolean;
  response_hours: number;
  default_warranty_days: number;
  payout_email: string | null;
  stripe_account_id: string | null;
};

/** `reviews` gains a nullable link to the booking that earned it. */
type ReviewRowFull = GeneratedTables["reviews"]["Row"] & {
  booking_id: string | null;
};

/**
 * A notice sent from this console to a shop owner.
 *
 * Insert-only from here by design: the owner acknowledges it from their own
 * dashboard, and an operator being able to un-send a notice they already sent
 * would make the audit trail a lie.
 */
type ShopNoticeRow = {
  id: string;
  fixer_id: string;
  sent_by: string | null;
  subject: string;
  body: string;
  severity: "info" | "warning" | "urgent";
  acknowledged_at: string | null;
  created_at: string;
};

/**
 * The composed database. The service-role client is parameterised with this,
 * never with `Database` directly.
 *
 * All five schema keys are declared explicitly — dropping `Functions` would
 * break the `search_fixers` RPC typing.
 */
export interface AdminDatabase {
  public: {
    Tables: {
      users: TableOf<UserProfileRow>;
      fixer_profiles: TableOf<FixerRowFull>;
      reviews: TableOf<ReviewRowFull>;
      repair_categories: GeneratedTables["repair_categories"];
      fixer_categories: GeneratedTables["fixer_categories"];
      seo_global: GeneratedTables["seo_global"];
      cms_templates: GeneratedTables["cms_templates"];
      seo_pages: GeneratedTables["seo_pages"];
      seo_redirects: GeneratedTables["seo_redirects"];
      seo_admins: GeneratedTables["seo_admins"];
      blog_posts: GeneratedTables["blog_posts"];

      shop_claims: TableOf<ShopClaimRow>;
      shop_notices: TableOf<ShopNoticeRow>;
      shop_services: TableOf<ShopServiceRow>;
      shop_availability: TableOf<ShopAvailabilityRow>;
      bookings: TableOf<BookingRow>;
      booking_events: TableOf<BookingEventRow>;
      message_threads: TableOf<MessageThreadRow>;
      messages: TableOf<MessageRow>;
      payments: TableOf<PaymentRow>;
      refunds: TableOf<RefundRow>;
      payouts: TableOf<PayoutRow>;
      ledger_entries: TableOf<LedgerEntryRow>;
      disputes: TableOf<DisputeRow>;
      dispute_messages: TableOf<DisputeMessageRow>;
      dispute_evidence: TableOf<DisputeEvidenceRow>;
    };
    Views: Database["public"]["Views"];
    Functions: Database["public"]["Functions"];
    Enums: Database["public"]["Enums"];
    CompositeTypes: Database["public"]["CompositeTypes"];
  };
}

export type { AdminRole, ContactMethod, Json, Weekday, ShopNoticeRow };

type AdminTables = AdminDatabase["public"]["Tables"];

/** Row aliases for the extended tables, so callers get the new columns. */
export type AdminFixerProfileRow = AdminTables["fixer_profiles"]["Row"];
export type AdminUserRow = AdminTables["users"]["Row"];
export type AdminReviewRow = AdminTables["reviews"]["Row"];
