import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserRow } from "@/lib/types/supabase";

/**
 * Every account on the platform, with what it actually is.
 *
 * `users.role` is the label; the two things that grant real capability are read
 * alongside it, because an operator asking "what can this person do" is not
 * served by a column that only claims:
 *
 *   - `ownsShop` — a `fixer_profiles` row points at them. This is what opens the
 *     expert dashboard, regardless of what `role` says.
 *   - `isAdmin`  — an active `seo_admins` row with the same email. This is what
 *     opens *this* console, and it is a different table entirely.
 *
 * A row where `role = 'admin'` but `isAdmin` is false is not a bug in the data;
 * it is someone who was labelled and never granted, and showing both is how that
 * becomes visible rather than confusing.
 */

/** Bounded like every other scan in this console. Enough for a real operator. */
const SCAN_LIMIT = 1000;

export type PlatformRole = "customer" | "fixer" | "admin";

export interface PlatformUser {
  id: string;
  displayName: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: PlatformRole;
  createdAt: string;
  /** Owns at least one `fixer_profiles` row. */
  ownsShop: boolean;
  shopNames: string[];
  /** Has a `seo_admins` row — can sign in to this console. */
  isAdmin: boolean;
  bookingCount: number;
}

export interface UserFilters {
  /** Matches display name, full name or email, case-insensitively. */
  query?: string;
  role?: PlatformRole | "all";
}

/**
 * One pass over each table, folded in memory.
 *
 * Four small reads rather than one join: `users` has no foreign key to
 * `seo_admins` (they are matched by email, deliberately — see `session.ts`), and
 * PostgREST cannot express "count bookings per customer" without an RPC. At
 * platform sizes this console is built for, four indexed scans beat a view
 * nobody maintains.
 */
export async function listUsers(filters: UserFilters = {}): Promise<PlatformUser[]> {
  const supabase = createAdminClient();

  const [usersResult, shopsResult, adminsResult, bookingsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, display_name, avatar_url, created_at, full_name, phone, role")
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT),
    supabase.from("fixer_profiles").select("owner_id, shop_name").limit(SCAN_LIMIT),
    supabase.from("seo_admins").select("email").limit(SCAN_LIMIT),
    supabase.from("bookings").select("customer_id").limit(SCAN_LIMIT * 5),
  ]);

  if (usersResult.error) {
    console.error("[users] list failed:", usersResult.error.message);
    return [];
  }

  // The three enrichments degrade independently. A missing `bookings` table
  // before the migration should cost the booking count, not the whole page.
  if (shopsResult.error) console.error("[users] shops failed:", shopsResult.error.message);
  if (adminsResult.error) console.error("[users] admins failed:", adminsResult.error.message);
  if (bookingsResult.error) {
    console.error("[users] bookings failed:", bookingsResult.error.message);
  }

  const shopsByOwner = new Map<string, string[]>();
  for (const shop of shopsResult.data ?? []) {
    if (!shop.owner_id) continue;
    const list = shopsByOwner.get(shop.owner_id) ?? [];
    list.push(shop.shop_name);
    shopsByOwner.set(shop.owner_id, list);
  }

  const adminEmails = new Set(
    (adminsResult.data ?? []).map((admin) => admin.email.trim().toLowerCase()),
  );

  const bookingsByCustomer = new Map<string, number>();
  for (const booking of bookingsResult.data ?? []) {
    const id = booking.customer_id;
    if (!id) continue;
    bookingsByCustomer.set(id, (bookingsByCustomer.get(id) ?? 0) + 1);
  }

  const rows = (usersResult.data ?? []) as AdminUserRow[];

  /*
   * Emails come from `auth.users`, not `public.users`.
   *
   * There is no email column on the profile table — verified against the live
   * schema, not assumed. The address lives in the auth schema, which PostgREST
   * does not expose, so it takes the Admin API. That matters for more than
   * display: matching a platform account to a `seo_admins` row is done by
   * email, so without this every `isAdmin` would read false.
   *
   * Degrades to an empty map. An operator seeing "—" for an address is a worse
   * page; an operator seeing no page at all is a broken one.
   */
  const emailById = new Map<string, string>();

  const { data: authList, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: SCAN_LIMIT,
  });

  if (authError) {
    console.error("[users] auth emails failed:", authError.message);
  } else {
    for (const account of authList.users) {
      if (account.email) emailById.set(account.id, account.email);
    }
  }

  let users: PlatformUser[] = rows.map((row) => {
    const shopNames = shopsByOwner.get(row.id) ?? [];
    const email = emailById.get(row.id) ?? null;

    return {
      id: row.id,
      displayName: row.display_name,
      fullName: row.full_name ?? null,
      email,
      phone: row.phone ?? null,
      avatarUrl: row.avatar_url,
      role: (row.role as PlatformRole | undefined) ?? "customer",
      createdAt: row.created_at,
      ownsShop: shopNames.length > 0,
      shopNames,
      isAdmin: email ? adminEmails.has(email.trim().toLowerCase()) : false,
      bookingCount: bookingsByCustomer.get(row.id) ?? 0,
    };
  });

  if (filters.role && filters.role !== "all") {
    users = users.filter((user) => user.role === filters.role);
  }

  const needle = filters.query?.trim().toLowerCase();
  if (needle) {
    users = users.filter((user) =>
      [user.displayName, user.fullName, user.email, user.phone]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }

  return users;
}

export interface UserCounts {
  total: number;
  customers: number;
  fixers: number;
  admins: number;
  /** Accounts that actually own a shop, whatever their label says. */
  shopOwners: number;
}

export async function getUserCounts(): Promise<UserCounts> {
  const users = await listUsers();

  return {
    total: users.length,
    customers: users.filter((user) => user.role === "customer").length,
    fixers: users.filter((user) => user.role === "fixer").length,
    admins: users.filter((user) => user.role === "admin").length,
    shopOwners: users.filter((user) => user.ownsShop).length,
  };
}
