import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AppDatabase } from "@/lib/types/supabase";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Runs as the signed-in user (or `anon`), so every query is subject to RLS.
 * `cookies()` is async in Next 15+, so this factory is async too — always
 * `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<AppDatabase>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where the response headers are
            // already sealed. Session refresh is handled in `src/proxy.ts`, so
            // this is safe to swallow.
          }
        },
      },
    },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[supabase] Missing required environment variable ${name}. ` +
        "Copy .env.example to .env.local and fill it in.",
    );
  }
  return value;
}
