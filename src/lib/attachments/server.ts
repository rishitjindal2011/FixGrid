import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentKind } from "@/lib/types/marketplace";

export const BOOKING_ATTACHMENTS_BUCKET = "booking-attachments";
export const CLAIM_EVIDENCE_BUCKET = "shop-claims-evidence";
const SIGNED_URL_TTL_SECONDS = 300;

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

export async function signStoragePaths(
  bucket: string,
  paths: string[],
  useAdmin = false,
): Promise<Map<string, string | null>> {
  const signed = new Map<string, string | null>();
  if (paths.length === 0) return signed;

  for (const path of paths) signed.set(path, null);

  try {
    const supabase = useAdmin ? createAdminClient().storage : (await createClient()).storage;
    const { data, error } = await supabase.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[attachments] signing failed", error.message);
      return signed;
    }

    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  } catch (error) {
    console.error(
      "[attachments] storage unavailable",
      error instanceof Error ? error.message : error,
    );
  }

  return signed;
}

/** Parse storage paths embedded in shop_claims.evidence text. */
export function parseClaimEvidencePaths(evidence: string | null): string[] {
  if (!evidence) return [];

  return evidence
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("• "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
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
