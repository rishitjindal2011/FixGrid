import { z } from "zod";

import { attachmentNotFound, attachmentResponse } from "@/lib/attachments/serve";
import { BOOKING_ATTACHMENTS_BUCKET } from "@/lib/attachments/server";
import { createClient } from "@/lib/supabase/server";

/**
 * `GET /dashboard/attachments/booking/[id]` — one booking photo, on our origin.
 *
 * Replaces handing the browser a signed `supabase.co` URL. That URL carried a
 * five-minute bearer token in its query string: it sat in history, survived a
 * copy-paste, and could not be revoked once minted. This URL carries no
 * credential at all, and authorisation is re-decided on every single request.
 *
 * **Authorisation is the row read itself.** The `parties read booking
 * attachments` policy is `is_booking_party(booking_id)`, so a row coming back
 * from this select *is* the proof that the caller is the customer or the shop.
 * There is no second check to keep in step with the policy — same approach, and
 * the same reasoning, as `../../bookings/[reference]/calendar/route.ts`.
 *
 * **The download uses the user's client too, not the service role.** Storage has
 * its own policy over `booking-attachments` keyed on the same helper, so it acts
 * as an independent second gate: a mistake in the row read alone cannot put
 * somebody else's photo on the wire.
 *
 * **`id` is a row id, never a storage path.** A path parameter would make this
 * an open proxy over the whole bucket, and the bucket holds every customer's
 * fault photos and every warranty claim's evidence.
 */

/** Per-caller by definition. A cached response here would be served to the wrong person. */
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
  const { id } = await params;

  // A malformed id is indistinguishable from a missing one, on purpose.
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return attachmentNotFound();

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("booking_attachments")
    .select("storage_path, file_name, mime_type")
    .eq("id", parsed.data)
    .maybeSingle<AttachmentRow>();

  // RLS hides other people's rows, so "not found" here covers "not yours".
  if (error || !row) return attachmentNotFound();

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BOOKING_ATTACHMENTS_BUCKET)
    .download(row.storage_path);

  if (downloadError || !blob) {
    // Logged rather than surfaced: the row exists and the caller is entitled to
    // it, so this is our problem, not theirs — but they still get a 404 so the
    // response shape never varies with the reason.
    console.error("[attachments] booking download failed", {
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
