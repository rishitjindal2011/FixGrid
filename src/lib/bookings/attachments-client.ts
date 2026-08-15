"use client";

import { createClient } from "@/lib/supabase/client";
const BOOKING_ATTACHMENTS_BUCKET = "booking-attachments";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 6;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
}

export interface FaultUploadResult {
  uploaded: number;
  failed: number;
}

/** Upload customer fault photos after the booking row exists. */
export async function uploadBookingFaultPhotos(
  bookingId: string,
  files: File[],
): Promise<FaultUploadResult> {
  if (files.length === 0) return { uploaded: 0, failed: 0 };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { uploaded: 0, failed: files.length };

  let uploaded = 0;
  let failed = 0;

  for (const file of files.slice(0, MAX_FILES)) {
    if (file.size > MAX_BYTES) {
      failed += 1;
      continue;
    }

    const objectPath = `${bookingId}/fault/${randomId()}-${safeName(file.name) || "photo"}`;

    const { error: uploadError } = await supabase.storage
      .from(BOOKING_ATTACHMENTS_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("[bookings] fault photo upload failed", uploadError.message);
      failed += 1;
      continue;
    }

    const { error: rowError } = await supabase.from("booking_attachments").insert({
      booking_id: bookingId,
      uploaded_by: user.id,
      storage_path: objectPath,
      file_name: file.name.slice(0, 200),
      mime_type: file.type || null,
      size_bytes: file.size,
      kind: "fault",
    });

    if (rowError) {
      console.error("[bookings] fault photo row failed", rowError.message);
      failed += 1;
      continue;
    }

    uploaded += 1;
  }

  return { uploaded, failed };
}

export const FAULT_PHOTO_LIMITS = { maxFiles: MAX_FILES, maxBytes: MAX_BYTES };
