import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Why a shop is or is not visible to customers, and what its owner should be
 * told about it.
 *
 * The expert dashboard used to show a shop's state as two words in a badge —
 * "Not yet verified" — which is the one thing an owner cannot act on. It does
 * not say whether customers can find them, why not, or what to do. Their shop
 * looked live from the inside while being absent from every search.
 *
 * Three states, and they are genuinely different:
 *
 *   - **pending** — submitted through /join, `is_hidden = true`, waiting on a
 *     first review. Nothing is wrong; they wait.
 *   - **suspended** — `suspended_at` is set. A decision was taken against a
 *     shop that was already live, and the reason is shown verbatim.
 *   - **live** — in the directory and bookable.
 *
 * `verified` is deliberately not one of them. It is a trust badge, not a
 * visibility gate: an unverified shop still appears in search, so folding it in
 * here would tell owners they are invisible when they are not.
 */

export type ShopVisibility = "live" | "pending" | "suspended";

export interface ShopStatus {
  visibility: ShopVisibility;
  /** Only ever set when suspended. Written by an admin, shown as given. */
  suspendedReason: string | null;
  suspendedAt: string | null;
  verified: boolean;
}

interface StatusRow {
  is_hidden: boolean;
  verified: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
}

export async function getShopStatus(fixerId: string): Promise<ShopStatus | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select("is_hidden, verified, suspended_at, suspended_reason")
    .eq("id", fixerId)
    .maybeSingle<StatusRow>();

  if (error) {
    logReadFailure("[dashboard] shop status failed", error);
    return null;
  }
  if (!data) return null;

  // Suspension outranks pending. A shop can be both — suspended before it was
  // ever reviewed — and in that case the suspension is the thing the owner
  // needs to deal with, so it wins.
  const visibility: ShopVisibility = data.suspended_at
    ? "suspended"
    : data.is_hidden
      ? "pending"
      : "live";

  return {
    visibility,
    suspendedReason: data.suspended_reason,
    suspendedAt: data.suspended_at,
    verified: data.verified,
  };
}

/* ── Admin notices ────────────────────────────────────────────────────────── */

export interface ShopNotice {
  id: string;
  subject: string;
  body: string;
  severity: "info" | "warning" | "urgent";
  createdAt: string;
}

/**
 * Unacknowledged notices, newest first.
 *
 * Every one of these is shown as a modal the owner has to dismiss, so the list
 * is capped: five stacked dialogs is a wall, and an admin sending six notices
 * without a reply has a different problem than the UI can solve.
 */
export async function listUnreadNotices(fixerId: string): Promise<ShopNotice[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shop_notices")
    .select("id, subject, body, severity, created_at")
    .eq("fixer_id", fixerId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<
      Array<{
        id: string;
        subject: string;
        body: string;
        severity: ShopNotice["severity"];
        created_at: string;
      }>
    >();

  if (error) {
    logReadFailure("[dashboard] shop notices failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    body: row.body,
    severity: row.severity,
    createdAt: row.created_at,
  }));
}
