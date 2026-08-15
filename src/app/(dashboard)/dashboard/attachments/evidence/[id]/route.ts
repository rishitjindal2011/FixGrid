import { z } from "zod";

import { attachmentNotFound, attachmentResponse } from "@/lib/attachments/serve";
import { BOOKING_ATTACHMENTS_BUCKET } from "@/lib/attachments/server";
import { createClient } from "@/lib/supabase/server";

/**
 * `GET /dashboard/attachments/evidence/[id]` — one file attached to a warranty claim.
 *
 * Identical in shape to `../booking/[id]/route.ts`, and separate from it on
 * purpose: the two read different tables, and therefore lean on two different
 * RLS policies. Folding them into one handler with a `kind` parameter would put
 * the choice of which policy authorises the request into a query string.
 *
 * Authorisation is the row read: `parties read dispute evidence` is
 * `is_dispute_party(dispute_id)`, which resolves through the dispute's booking to
 * "customer on it, or owner of the shop that did the work".
 *
 * The files themselves live in `booking-attachments` under a `claims/<booking>/`
 * prefix rather than in a bucket of their own — the storage policy's
 * `attachment_booking_id()` helper understands both layouts.
 */

export const dynamic = "force-dynamic";

const IdSchema = z.string().uuid();

interface EvidenceRow {
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return attachmentNotFound();

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("dispute_evidence")
    .select("storage_path, file_name, mime_type")
    .eq("id", parsed.data)
    .maybeSingle<EvidenceRow>();

  if (error || !row) return attachmentNotFound();

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BOOKING_ATTACHMENTS_BUCKET)
    .download(row.storage_path);

  if (downloadError || !blob) {
    console.error("[attachments] evidence download failed", {
      id: parsed.data,
      message: downloadError?.message,
    });
    return attachmentNotFound();
  }

  return attachmentResponse(blob, {
    mimeType: row.mime_type,
    fileName: row.file_name,
  });
}
