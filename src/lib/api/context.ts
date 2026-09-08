import "server-only";

import type { User } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is calling, and the client to call as them.
 *
 * The API has no auth of its own. It reads the same Supabase session cookie the
 * pages do, and hands back the same RLS-bound client the Server Components use —
 * so `supabase.from("bookings").select(…)` returns exactly the rows this caller
 * would see in the dashboard, no more. The policies in
 * `supabase/policies-marketplace.sql` remain the only authority on that; nothing
 * in `src/lib/api` decides who may see what.
 *
 * Two consequences worth knowing:
 *
 *   • **No API keys, no bearer tokens, no CORS.** Same-origin, cookie-bound,
 *     first-party only. Adding a token scheme later means adding a second branch
 *     here and nowhere else, which is why every handler resolves its caller
 *     through this function rather than touching `createClient()` itself.
 *
 *   • **`/api` is outside the proxy matcher** (see `src/proxy.ts`), so nothing
 *     has refreshed the session before the handler runs. `auth.getUser()`
 *     validates the token against the auth server and rotates it when it is
 *     stale, and a Route Handler *may* write cookies — so the refresh works
 *     here, it just happens inside the handler rather than ahead of it.
 */
export interface ApiContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
}

/**
 * The caller, or null when there is no valid session.
 *
 * `getUser()` rather than `getSession()`: the latter trusts whatever the cookie
 * says without asking the auth server, which is fine for rendering a name and
 * not fine for authorising a write.
 */
export async function getApiUser(): Promise<ApiContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

/** The caller, or a 401. For every endpoint that is not deliberately public. */
export async function requireApiUser(): Promise<ApiContext> {
  const context = await getApiUser();

  if (!context) {
    throw new ApiError(401, "unauthenticated", "Sign in to use this endpoint.");
  }

  return context;
}

import type { OwnedShop } from "@/lib/dashboard/owned-shop";

export async function requireApiExpert(): Promise<ApiContext & { fixerId: string; shop: OwnedShop }> {
  const context = await requireApiUser();
  const { getOwnedShop } = await import("@/lib/dashboard/owned-shop");
  const shop = await getOwnedShop(context.user.id);
  
  if (!shop) {
    throw new ApiError(403, "forbidden", "You must own a shop to use this endpoint.");
  }

  return { ...context, fixerId: shop.id, shop };
}

/**
 * The RLS-bound client without a caller attached, for endpoints that are
 * genuinely public — search, categories, the blog.
 *
 * Separate from `getApiUser()` so that "this endpoint does not need a session"
 * is a visible decision at the top of the handler rather than a missing line.
 */
export async function anonymousClient() {
  return createClient();
}
