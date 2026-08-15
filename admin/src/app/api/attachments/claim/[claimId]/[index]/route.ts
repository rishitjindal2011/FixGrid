import { z } from "zod";

import { attachmentNotFound, attachmentResponse } from "@/lib/attachments/serve";
import { CLAIM_EVIDENCE_BUCKET, parseClaimEvidencePaths } from "@/lib/attachments";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `GET /api/attachments/claim/[claimId]/[index]` — one file a claimant uploaded
 * to prove they run a shop.
 *
 * Addressed by claim and position rather than by a row id, because claim evidence
 * has no row of its own: the paths are bullet lines inside the
 * `shop_claims.evidence` text column, which `parseClaimEvidencePaths` pulls out.
 * The obvious alternative — take the storage path as a parameter — is the one
 * thing this route must not do. It would turn a single endpoint into an open
 * proxy over the whole bucket for anyone holding an admin session, and there
 * would be nothing tying a fetched file to the claim being reviewed.
 *
 * So `index` is resolved against *this claim's* own list, server-side. An index
 * past the end is a 404 rather than an error, which also makes a stale page whose
 * claim has since been edited fail quietly instead of throwing.
 *
 * This is the highest-privilege read in the console — approving a claim hands
 * somebody a live public listing and the ability to take money — so the same
 * rules apply as everywhere else here: session first, service role second, 404
 * for every kind of failure.
 */

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  claimId: z.string().uuid(),
  // Bounded rather than merely numeric: a claim carries a handful of files, and
  // this refuses "-1", "1e3" and "01" before any of them reach the array.
  index: z.string().regex(/^\d{1,2}$/),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ claimId: string; index: string }> },
) {
  const session = await getSession();
  if (!session) return attachmentNotFound();

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) return attachmentNotFound();

  const position = Number(parsed.data.index);

  const admin = createAdminClient();

  const { data: claim, error } = await admin
    .from("shop_claims")
    .select("evidence")
    .eq("id", parsed.data.claimId)
    .maybeSingle<{ evidence: string | null }>();

  if (error || !claim) return attachmentNotFound();

  const paths = parseClaimEvidencePaths(claim.evidence);
  const path = paths[position];
  if (!path) return attachmentNotFound();

  const { data: blob, error: downloadError } = await admin.storage
    .from(CLAIM_EVIDENCE_BUCKET)
    .download(path);

  if (downloadError || !blob) {
    console.error("[attachments] admin claim download failed", {
      claimId: parsed.data.claimId,
      position,
      message: downloadError?.message,
    });
    return attachmentNotFound();
  }

  return attachmentResponse(blob, {
    // No stored mime type for these — the allowlist in `serve.ts` decides from
    // the blob, and anything it does not recognise downloads as opaque bytes.
    mimeType: null,
    fileName: path.split("/").pop() ?? "evidence",
  });
}
