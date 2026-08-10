import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * The `server-only` import above makes it a build error to reach this module
 * from a Client Component — the single most likely way to leak the key.
 *
 * Legitimate callers, and nothing else:
 *   • sitemap.ts        — must enumerate every published page
 *   • proxy.ts          — redirect lookups before a session exists
 *   • draft-mode reads  — must see status = 'draft'
 *   • scripts/seed-*    — bulk authoring
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "fix-it-registry/server" } },
  });
}
