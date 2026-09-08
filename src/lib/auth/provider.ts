import "server-only";
import { getSeoGlobal } from "@/lib/queries/cms";

/**
 * Returns the currently active authentication provider ("supabase" or "clerk").
 * This reads from the `seo_global` table. In case of a database error or if
 * the row hasn't been migrated yet, it safely falls back to "supabase" to ensure
 * the app continues functioning on its native logic.
 */
export async function getAuthProvider(): Promise<"supabase" | "clerk"> {
  try {
    const globalSettings = await getSeoGlobal();
    if (globalSettings?.auth_provider === "clerk") {
      return "clerk";
    }
    return "supabase";
  } catch (error) {
    console.error("[auth] Failed to fetch auth provider config, defaulting to supabase", error);
    return "supabase";
  }
}
