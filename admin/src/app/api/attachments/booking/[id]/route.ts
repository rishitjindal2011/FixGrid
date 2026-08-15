import { z } from "zod";

import { attachmentNotFound, attachmentResponse } from "@/lib/attachments/serve";
import { BOOKING_ATTACHMENTS_BUCKET } from "@/lib/attachments";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `GET /api/attachments/booking/[id]` — one booking photo, on the console's origin.
 *
 * Replaces handing the reviewer a signed `supabase.co` URL. That URL carried a
 * five-minute bearer token in its query string: it sat in history, survived a
 * copy-paste into a ticket, and could not be revoked once minted. Worse here than
 * in the consumer app, because an admin's signed URL is for *somebody else's*
 * booking — a customer's fault photos, pasted into an internal chat, outliving
 * the reason anyone needed to look.
 *
 * Authorisation is the admin session and nothing else. Unlike the consumer route,
 * there is no RLS to lean on: admins have no Supabase identity at all, so this
 * reads with the service-role client and the session check *is* the whole gate.
 * `proxy.ts` also matches `/api`, but a route handler re-checks for itself — the
 * same rule the server actions follow, for the same reason.
 *
 * **`id` is a row id, never a storage path.** A path parameter would make this an
 * open proxy over a bucket holding every customer's fault photos and every
 * warranty claim's evidence, readable by anyone who could reach the console.
 */

/** Per-session by definition. A cached response here would be served to the wrong reviewer. */
export const dynamic = "force-dynamic";

const IdSchema = z.string().uuid();

interface AttachmentRow {
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

  // A malformed id is indistinguishable from a missing one, on purpose.
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return attachmentNotFound();

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("booking_attachments")
    .select("storage_path, file_name, mime_type")
    .eq("id", parsed.data)
    .maybeSingle<AttachmentRow>();

  if (error || !row) return attachmentNotFound();

  const { data: blob, error: downloadError } = await admin.storage
    .from(BOOKING_ATTACHMENTS_BUCKET)
    .download(row.storage_path);

  if (downloadError || !blob) {
    console.error("[attachments] admin booking download failed", {
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
