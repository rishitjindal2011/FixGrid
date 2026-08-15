import { z } from "zod";

import { attachmentNotFound, attachmentResponse } from "@/lib/attachments/serve";
import { BOOKING_ATTACHMENTS_BUCKET } from "@/lib/attachments";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `GET /api/attachments/evidence/[id]` — one file attached to a warranty claim.
 *
 * Separate from `../booking/[id]/route.ts` rather than folded into it behind a
 * `kind` parameter: the two read different tables, and keeping them apart means
 * the table being read is decided by the route file rather than by a value in the
 * request.
 *
 * These files live in `booking-attachments` under a `claims/<booking>/` prefix
 * rather than in a bucket of their own, which is why the bucket constant here
 * looks like the booking one.
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
  const session = await getSession();
  if (!session) return attachmentNotFound();

  const { id } = await params;

  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return attachmentNotFound();

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("dispute_evidence")
    .select("storage_path, file_name, mime_type")
    .eq("id", parsed.data)
    .maybeSingle<EvidenceRow>();

  if (error || !row) return attachmentNotFound();

  const { data: blob, error: downloadError } = await admin.storage
    .from(BOOKING_ATTACHMENTS_BUCKET)
    .download(row.storage_path);

  if (downloadError || !blob) {
    console.error("[attachments] admin evidence download failed", {
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
