import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/types/database";

/**
 * Read-side accessors for the signed-in visitor.
 *
 * Distinct from `seo-admin/src/lib/auth/session.ts`, which signs its own JWT for
 * the internal dashboard. Here Supabase Auth owns the session; this module only
 * reads it. The two systems share a database and nothing else, deliberately —
 * a shop owner is not an admin.
 */

export interface CurrentUser {
  id: string;
  email: string | null;
  /** From `public.users`, populated by the `on_auth_user_created` trigger. */
  displayName: string;
  avatarUrl: string | null;
}

/**
 * The signed-in user, or null.
 *
 * `getUser()` rather than `getSession()`: the latter decodes the cookie without
 * verifying it, so a tampered JWT would read as a valid session. This one hits
 * the auth server. Middleware has already refreshed the token by the time a
 * Server Component calls this, so the cost is a single validated round-trip.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A missing session is the normal anonymous case, not a failure worth logging.
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Pick<UserRow, "display_name" | "avatar_url">>();

  if (profileError) {
    console.error("[auth] users row lookup failed", profileError.message);
  }

  return {
    id: user.id,
    email: user.email ?? null,
    // The trigger guarantees a row, but a profile read can still fail
    // transiently — falling back keeps the header rendering.
    displayName:
      profile?.display_name?.trim() ||
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "") ||
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name.trim()
        : "") ||
      user.email?.split("@")[0] ||
      "Customer",
    avatarUrl:
      profile?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null),
  };
}

/** True when a session exists. Cheaper to read than to destructure at call sites. */
export async function isSignedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
