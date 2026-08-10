"use server";

import { cache } from "react";

import { getOwnedShop } from "@/lib/dashboard/owned-shop";

/**
 * Shop ownership, memoised for the length of one request.
 *
 * This file used to hold the whole claim flow — a shop search, a claim insert
 * and a reader for the claimant's pending claim — behind
 * `/dashboard/expert/claim`. That flow only worked for businesses already in our
 * seeded directory: an expert whose shop had never been listed reached a search
 * box that could never find them, and the journey ended there.
 *
 * `/join` replaced it. That route creates the `fixer_profiles` row and its
 * `shop_claims` row together (see `src/lib/join/actions.ts`), which covers both
 * the "claim an existing listing" and "add a new shop" cases in one form. The
 * dead functions were deleted rather than left in place, because two different
 * ways to claim a shop — one of them unreachable — is how a codebase starts
 * lying about itself.
 *
 * What remains is the ownership read. It lives in a `"use server"` module rather
 * than a plain one for a boring reason: a layout cannot pass props to the page
 * beneath it, and a page file cannot export a shared helper — Next type-checks
 * page and layout exports against a fixed set and rejects the rest.
 */

/**
 * The expert layout gates on this and the page inside it needs the same answer.
 * `cache` is the only mechanism the App Router gives for that, so the two reads
 * collapse into one round-trip instead of the page re-asking a question the gate
 * has already answered.
 */
const readOwnedShop = cache(getOwnedShop);

export async function getMyShop(userId: string) {
  return readOwnedShop(userId);
}
