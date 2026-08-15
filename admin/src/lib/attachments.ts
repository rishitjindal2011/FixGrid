import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const BOOKING_ATTACHMENTS_BUCKET = "booking-attachments";
export const CLAIM_EVIDENCE_BUCKET = "shop-claims-evidence";
const SIGNED_URL_TTL_SECONDS = 300;

export type AttachmentKind = "fault" | "completion" | "evidence";

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

export async function listBookingAttachments(bookingId: string): Promise<StoredAttachment[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
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

export async function signStoragePaths(
  bucket: string,
  paths: string[],
): Promise<Map<string, string | null>> {
  const signed = new Map<string, string | null>();
  if (paths.length === 0) return signed;

  for (const path of paths) signed.set(path, null);

  try {
    const { data, error } = await createAdminClient()
      .storage.from(bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

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

export function claimEvidenceNotes(evidence: string | null, paths: string[]): string | null {
  if (!evidence) return null;

  const pathSet = new Set(paths);
  const lines = evidence.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("• ")) return true;
    return !pathSet.has(trimmed.slice(2).trim());
  });

  const text = lines.join("\n").trim();
  return text || null;
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
