import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { AdminRole } from "@/lib/types/database";

/**
 * Platform-admin session.
 *
 * A signed, short-lived JWT in an httpOnly cookie. Deliberately *not* a
 * Supabase auth session: admins are not application users, they exist only in
 * `seo_admins`, and this app talks to Postgres exclusively through the
 * service-role key. Mixing the two would mean a leaked admin session also
 * carried a Supabase identity.
 *
 * The token is stateless. That is a real trade-off — revoking a session before
 * it expires means rotating `ADMIN_JWT_SECRET`, which logs everyone out. For a
 * handful of internal operators that is the right side of the complexity line;
 * the short lifetime keeps the exposure window small.
 */

/**
 * Cookie name. Must differ from the SEO admin's `fir_admin_session`.
 *
 * Cookies are scoped by host and path but **not by port**, so on a developer's
 * machine `localhost:3001` and `localhost:3002` share one jar. Reusing the name
 * would mean signing into this console silently overwrites the SEO admin's
 * cookie and vice versa — each app would then read a token it cannot verify
 * (different secret, different audience), get `null`, and bounce the operator
 * to its own login in a loop neither app can escape.
 *
 * The brief specified `fir_admin_session` on the understanding that seo-admin
 * used something else; it does not — `seo-admin/src/lib/auth/session.ts` line 21
 * is `fir_admin_session`. The stated requirement was that the two never
 * collide, so the name moved rather than the requirement.
 */
export const SESSION_COOKIE = "fir_platform_session";

/**
 * Issuer and audience are also app-specific.
 *
 * Both consoles sign HS256 tokens carrying the same `seo_admins.id`. If the two
 * deployments were ever misconfigured onto one `ADMIN_JWT_SECRET`, these claims
 * are what still stops a SEO-admin token from opening the platform console —
 * which reads every customer's data and moves money.
 */
const ISSUER = "fix-it-registry/platform-admin";
const AUDIENCE = "fix-it-registry/platform-admin";

/** Eight hours: one working day, so nobody is logged out mid-review. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminSession {
  adminId: string;
  email: string;
  role: AdminRole;
}

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;

  // Refusing to boot is the correct behaviour. A default or empty signing key
  // means anyone can mint a valid admin session, and that failure is silent.
  if (!secret || secret.length < 32) {
    throw new Error(
      "[auth] ADMIN_JWT_SECRET is missing or too short. Generate at least 32 bytes: " +
        `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify a token. Returns null on *any* problem — bad signature, wrong issuer,
 * expired, malformed payload. Callers get a single "not signed in" outcome and
 * cannot accidentally treat a partially-valid token as trustworthy.
 *
 * Runs on the Edge runtime as well as Node, which is why this is `jose` and not
 * a database lookup: `src/proxy.ts` calls it on every navigation and there is
 * no Postgres driver there.
 */
export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"], // pinned: never let the token pick `none`
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const { sub, email, role } = payload;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    // An unrecognised role is treated as a forged token, not as "least
    // privilege" — silently downgrading would hide a real problem.
    if (role !== "owner" && role !== "editor" && role !== "viewer") return null;

    return { adminId: sub, email, role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax", // "strict" would drop the cookie on the post-login redirect
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** The current session, or null. Safe to call from any Server Component. */
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Session or bust.
 *
 * Every mutating server action calls this first. The proxy already guards the
 * routes, but it protects *navigation* — a server action is a POST to an
 * arbitrary endpoint and must re-check for itself. Defence at the boundary that
 * actually performs the write.
 */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Role gates.
 *
 *   viewer — read every screen, change nothing
 *   editor — approve and reject claims, work disputes, annotate
 *   owner  — everything, plus the destructive and financial actions
 *
 * The split matters more here than in the SEO admin: the worst a bad edit does
 * there is publish a wrong page. Here it refunds someone's money, or hands a
 * stranger control of a real business's listing.
 */
export async function requireEditor(): Promise<AdminSession> {
  const session = await requireSession();
  if (session.role === "viewer") throw new Error("FORBIDDEN");
  return session;
}

export async function requireOwner(): Promise<AdminSession> {
  const session = await requireSession();
  if (session.role !== "owner") throw new Error("FORBIDDEN");
  return session;
}

export function canEdit(session: AdminSession): boolean {
  return session.role !== "viewer";
}

/** Owner-only: refunds, payout retries, anything that cannot be undone. */
export function canAdminister(session: AdminSession): boolean {
  return session.role === "owner";
}
