"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { AppDatabase } from "@/lib/types/supabase";

let browserClient: ReturnType<typeof createBrowserClient<AppDatabase>> | undefined;

/**
 * Supabase client for Client Components.
 * Memoised — creating one per render leaks realtime subscriptions.
 */
export function createClient() {
  browserClient ??= createBrowserClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}
