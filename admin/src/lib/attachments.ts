import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const BOOKING_ATTACHMENTS_BUCKET = "booking-attachments";
export const CLAIM_EVIDENCE_BUCKET = "shop-claims-evidence";

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

/**
 * Which route serves a given kind of file, under `admin/src/app/api/attachments/`.
 *
 * Replaces `signStoragePaths`, which minted five-minute signed `supabase.co`
 * URLs. Those put a bearer token for *somebody else's* booking photos in the
 * reviewer's address bar, could not be revoked once issued, and left the link
 * dead after the TTL. These URLs carry no credential and re-check the admin
 * session on every request.
 *
 * Claim evidence is absent deliberately: it has no row id to key on, so those
 * hrefs are built from a claim id and a position by the claims page itself.
 */
export type AttachmentRoute = "booking" | "evidence";

/** Attachment row id → URL on this origin. */
export function attachmentHrefs(
  route: AttachmentRoute,
  items: readonly { id: string }[],
): Map<string, string> {
  return new Map(
    items.map((item) => [item.id, `/api/attachments/${route}/${item.id}`]),
  );
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
