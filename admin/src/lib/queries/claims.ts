import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClaimStatus } from "@/lib/types/marketplace";

/**
 * Shop-claim reads.
 *
 * Every read here degrades to `[]`/`null` on error rather than throwing. The
 * marketplace migration may not be applied to the database this is pointed at,
 * and an admin panel that 500s on a missing table is far harder to diagnose than
 * one that renders "no claims yet".
 *
 * `shop_claims.user_id` references `auth.users`, not `public.users`, so there is
 * no foreign key for PostgREST to embed through — the claimant's profile is
 * fetched by id in a second keyed read and stitched on. The shop, by contrast,
 * does have an FK and is embedded normally.
 */

export interface ClaimRow {
  id: string;
  status: ClaimStatus;
  evidence: string | null;
  contactPhone: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;

  shopId: string;
  shopName: string;
  shopSlug: string;
  shopAddress: string;
  shopVerified: boolean;
  /** Non-null when the shop is ALREADY owned — the dangerous case on approval. */
  shopOwnerId: string | null;
  /**
   * True when the shop is still awaiting its first approval — i.e. it was
   * created through /join rather than seeded by us. A very different decision
   * to make: nobody has ever vetted this business, where an ordinary claim is
   * someone asserting ownership of a listing that already exists.
   */
  shopIsHidden: boolean;

  claimantId: string;
  claimantName: string;
  claimantAvatar: string | null;
  claimantPhone: string | null;
  claimantJoinedAt: string | null;
}

interface ClaimJoinRow {
  id: string;
  fixer_id: string;
  user_id: string;
  status: ClaimStatus;
  evidence: string | null;
  contact_phone: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  fixer_profiles: {
    id: string;
    slug: string;
    shop_name: string;
    address: string;
    verified: boolean;
    owner_id: string | null;
    is_hidden: boolean | null;
  } | null;
}

interface ClaimantRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

const CLAIM_COLUMNS = `
  id, fixer_id, user_id, status, evidence, contact_phone,
  reviewed_by, reviewed_at, review_note, created_at,
  fixer_profiles!shop_claims_fixer_fkey (
    id, slug, shop_name, address, verified, owner_id, is_hidden
  )
`;

async function attachClaimants(rows: ClaimJoinRow[]): Promise<ClaimRow[]> {
  const supabase = createAdminClient();
  const ids = [...new Set(rows.map((row) => row.user_id))];

  const people = new Map<string, ClaimantRow>();

  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, avatar_url, phone, created_at")
      .in("id", ids)
      .returns<ClaimantRow[]>();

    if (error) {
      // A claim whose claimant cannot be named is still a claim that needs
      // deciding — degrade the name, never drop the row.
      console.error("[claims] claimant profiles failed", error.message);
    } else {
      for (const person of data ?? []) people.set(person.id, person);
    }
  }

  return rows.map((row) => {
    const person = people.get(row.user_id);

    return {
      id: row.id,
      status: row.status,
      evidence: row.evidence,
      contactPhone: row.contact_phone,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNote: row.review_note,
      createdAt: row.created_at,

      shopId: row.fixer_id,
      shopName: row.fixer_profiles?.shop_name ?? "Unknown shop",
      shopSlug: row.fixer_profiles?.slug ?? "",
      shopAddress: row.fixer_profiles?.address ?? "",
      shopVerified: row.fixer_profiles?.verified ?? false,
      shopOwnerId: row.fixer_profiles?.owner_id ?? null,
      // Null on a database where migration 002 has not run: treat that as
      // visible, matching how the column behaved before it existed.
      shopIsHidden: row.fixer_profiles?.is_hidden ?? false,

      claimantId: row.user_id,
      claimantName: person?.display_name ?? "Unknown account",
      claimantAvatar: person?.avatar_url ?? null,
      claimantPhone: person?.phone ?? null,
      claimantJoinedAt: person?.created_at ?? null,
    };
  });
}

/**
 * The queue.
 *
 * Pending first and, within that, oldest first. A claim is a real business
 * unable to trade until someone looks at it, so the one that has waited longest
 * is the most urgent — newest-first would bury exactly the row that matters.
 */
export async function listClaims(
  options: { status?: ClaimStatus | "all"; q?: string } = {},
): Promise<ClaimRow[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("shop_claims")
    .select(CLAIM_COLUMNS)
    .order("created_at", { ascending: true })
    .limit(500);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.returns<ClaimJoinRow[]>();

  if (error) {
    console.error("[claims] list failed", error.message);
    return [];
  }

  const claims = await attachClaimants(data ?? []);

  const needle = options.q?.trim().toLowerCase();
  const filtered = needle
    ? claims.filter((claim) =>
        [claim.shopName, claim.claimantName, claim.shopAddress, claim.contactPhone]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(needle)),
      )
    : claims;

  // Pending ahead of everything, each group already oldest-first from SQL.
  return [
    ...filtered.filter((claim) => claim.status === "pending"),
    ...filtered.filter((claim) => claim.status !== "pending"),
  ];
}

export async function getClaim(id: string): Promise<ClaimRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shop_claims")
    .select(CLAIM_COLUMNS)
    .eq("id", id)
    .maybeSingle<ClaimJoinRow>();

  if (error) {
    console.error("[claims] detail failed", error.message);
    return null;
  }
  if (!data) return null;

  const [claim] = await attachClaimants([data]);
  return claim ?? null;
}

/** Counts per status, for the queue's tab labels. */
export async function getClaimCounts(): Promise<Record<ClaimStatus | "all", number>> {
  const empty: Record<ClaimStatus | "all", number> = {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    withdrawn: 0,
  };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shop_claims")
    .select("status")
    .limit(2000)
    .returns<Array<{ status: ClaimStatus }>>();

  if (error) {
    console.error("[claims] counts failed", error.message);
    return empty;
  }

  const counts = { ...empty };
  for (const row of data ?? []) {
    counts[row.status] += 1;
    counts.all += 1;
  }

  return counts;
}
