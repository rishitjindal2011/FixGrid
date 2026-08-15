import "server-only";

import { headers } from "next/headers";

import { safeNextPath } from "@/lib/auth/paths";
import { SITE_ORIGIN } from "@/lib/site";

/**
 * Origin of the request the user is actually on.
 *
 * OAuth `redirectTo` must match this host — using the canonical production
 * domain while the app runs on localhost makes Supabase fall back to Site URL
 * and drop the PKCE `code` on `/` instead of `/auth/callback`.
 */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return SITE_ORIGIN;

  const hostname = host.split(",")[0]?.trim();
  if (!hostname) return SITE_ORIGIN;

  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ??
    (hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${hostname}`;
}

/**
 * Absolute URL for the OAuth / email-link callback on the current host.
 */
export async function authCallbackUrl(next?: string): Promise<string> {
  const origin = await getRequestOrigin();
  const path = safeNextPath(next);
  return `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}
