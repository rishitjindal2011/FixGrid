import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { AdminRole } from "@/lib/types/database";

/**
 * Admin session.
 *
 * A signed, short-lived JWT in an httpOnly cookie. Deliberately *not* a
 * Supabase auth session: admins are not application users, they exist only in
 * `seo_admins`, and the admin app talks to Postgres exclusively through the
 * service-role key. Mixing the two would mean a leaked admin session also
 * carried a Supabase identity.
 *
 * The token is stateless. That is a real trade-off — revoking a session before
 * it expires means rotating `ADMIN_JWT_SECRET`, which logs everyone out. For a
 * handful of internal editors that is the right side of the complexity line;
 * the short lifetime keeps the exposure window small.
 */

export const SESSION_COOKIE = "fir_admin_session";

/** Eight hours: one working day, so nobody is logged out mid-edit. */
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

export async function createSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setIssuer("fix-it-registry/seo-admin")
    .setAudience("fix-it-registry/seo-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify a token. Returns null on *any* problem — bad signature, wrong issuer,
 * expired, malformed payload. Callers get a single "not signed in" outcome and
 * cannot accidentally treat a partially-valid token as trustworthy.
 */
export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"], // pinned: never let the token pick `none`
      issuer: "fix-it-registry/seo-admin",
      audience: "fix-it-registry/seo-admin",
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
 * routes, but it protects *navigation* — a server action is a POST to
 * an arbitrary endpoint and must re-check for itself. Defence at the boundary
 * that actually performs the write.
 */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Role gates.
 *
 *   viewer — read the dashboard, preview drafts
 *   editor — everything a viewer can do, plus create and edit pages
 *   owner  — everything, plus delete, redirects and global settings
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

export function canAdminister(session: AdminSession): boolean {
  return session.role === "owner";
}
