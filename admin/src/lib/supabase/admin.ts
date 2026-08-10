import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { AdminDatabase } from "@/lib/types/supabase";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Every other app in this repo uses the anon key and leans on RLS to scope a
 * request to one user. This one cannot: its entire job is the view no policy
 * will ever return — every customer's bookings, every shop's payouts, every
 * dispute. So the bypass is the feature, and the containment has to come from
 * somewhere else:
 *
 *   • `import "server-only"` above makes reaching this module from a Client
 *     Component a *build* error rather than a runtime key leak. It is the one
 *     mechanical guarantee here; do not remove it, and do not re-export the
 *     client from a file that lacks it.
 *   • `src/proxy.ts` keeps anonymous requests off every route.
 *   • `requireSession()` re-checks inside every server action, because a POST
 *     to an action endpoint never passes through a route match.
 *
 * A new client per call is deliberate. `createClient` builds a thin wrapper
 * around `fetch` with no connection pool to reuse, and a module-level singleton
 * would be shared across concurrent requests in the same isolate — fine today,
 * a footgun the moment anyone attaches per-request state to it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createSupabaseClient<AdminDatabase>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Distinct from the other two apps' value so a slow query in the Supabase
    // logs can be traced to the console that issued it.
    global: { headers: { "X-Client-Info": "fix-it-registry/platform-admin" } },
  });
}

/** The concrete client type, for helpers that take one rather than build one. */
export type AdminClient = ReturnType<typeof createAdminClient>;
