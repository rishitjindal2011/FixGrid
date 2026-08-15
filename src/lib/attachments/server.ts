import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentKind } from "@/lib/types/marketplace";

export const BOOKING_ATTACHMENTS_BUCKET = "booking-attachments";

export interface StoredAttachment {
  id: string;
  storagePath: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number;
  kind: AttachmentKind;
  createdAt: string;
}

interface AttachmentRow {
  id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  kind: AttachmentKind;
  created_at: string;
}

/** List attachments on one booking (customer or shop via RLS). */
export async function listBookingAttachments(bookingId: string): Promise<StoredAttachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_attachments")
    .select("id, storage_path, file_name, mime_type, size_bytes, kind, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .returns<AttachmentRow[]>();

  if (error) {
    console.error("[attachments] list failed", error.message);
    return [];
  }

  return (data ?? []).map(mapAttachment);
}

/** Admin read — bypasses RLS. */
export async function listBookingAttachmentsAdmin(bookingId: string): Promise<StoredAttachment[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("booking_attachments")
    .select("id, storage_path, file_name, mime_type, size_bytes, kind, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .returns<AttachmentRow[]>();

  if (error) {
    console.error("[attachments] admin list failed", error.message);
    return [];
  }

  return (data ?? []).map(mapAttachment);
}

/**
 * Which route serves a given kind of file. Both live under
 * `src/app/(dashboard)/dashboard/attachments/`, and each authorises through the
 * RLS policy on its own table — so this choice decides which policy applies and
 * is never taken from user input.
 */
export type AttachmentRoute = "booking" | "evidence";

/**
 * The gallery's `hrefs` map: attachment row id → URL on this origin.
 *
 * Replaces `signStoragePaths`, which minted five-minute signed `supabase.co`
 * URLs. Those put a bearer token in the address bar, could not be revoked once
 * issued, and left the link dead after the TTL. These URLs carry no credential
 * and are re-authorised on every request.
 */
export function attachmentHrefs(
  route: AttachmentRoute,
  items: readonly { id: string }[],
): Map<string, string> {
  return new Map(
    items.map((item) => [item.id, `/dashboard/attachments/${route}/${item.id}`]),
  );
}

function mapAttachment(row: AttachmentRow): StoredAttachment {
  return {
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    kind: row.kind,
    createdAt: row.created_at,
  };
}
