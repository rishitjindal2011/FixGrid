"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { DisputeEvidenceRow } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Evidence upload for a warranty claim.
 *
 * The file goes straight from the browser to Supabase Storage; only the
 * resulting object path is kept. Routing megabytes of photos through a Server
 * Action would spend them twice — once into the Next server, once back out to
 * storage — and Server Actions carry a body-size cap that a couple of phone
 * photos clear easily.
 *
 * The bucket is `booking-attachments`, and it is **private**. Nothing here ever
 * builds a public URL: uploads return a path, and the claim page mints a
 * short-lived signed URL to display it. A leaked path is then not a leaked
 * photo.
 *
 * **Two modes, because a claim's id does not exist until it is filed.**
 *
 *   - With `disputeId` (the claim page): the upload is followed by a
 *     `dispute_evidence` insert, which is the row that makes the file part of
 *     the claim. The policy in `policies-marketplace.sql` allows exactly this —
 *     `is_dispute_party(dispute_id) and uploaded_by = auth.uid()` — so it needs
 *     no server action.
 *   - Without it (the claim form): there is nothing to hang a row off yet, so
 *     the uploads are posted as a JSON manifest in a hidden field for the action
 *     to adopt. `openDispute` does not read that field today; see the note at
 *     the call site in `claim-form.tsx`.
 *
 * **Degradation is the point of this component.** No migration provisions the
 * bucket, and the environment may have no Supabase keys at all. Both cases end
 * in a disabled control with one sentence of explanation — never a thrown
 * error, because a claim that cannot carry a photo is still a claim worth
 * filing.
 */

/**
 * Inlined at build time, so this is a compile-time constant in the bundle. When
 * it is false, `createClient()` would construct a browser client over
 * `undefined!` and throw on first use — so it is never called.
 */
const STORAGE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const BUCKET = "booking-attachments";

/** Matches the `size_bytes integer` column and keeps a phone photo comfortable. */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 6;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export interface EvidenceItem {
  path: string;
  name: string;
  type: string;
  size: number;
}

interface Slot {
  /** Local key only — the storage path is not known until the upload lands. */
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "done" | "error";
  path?: string;
  message?: string;
}

/** `crypto.randomUUID` is unavailable on insecure origins; the fallback is only
 * ever a filename discriminator, never a security boundary. */
function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Storage rejects most punctuation in object keys; keep the extension legible. */
function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceUpload({
  /** Form field carrying the JSON manifest of everything that uploaded. */
  name = "evidence",
  /** Folder inside the bucket. Scoped per booking or per claim by the caller. */
  pathPrefix,
  /**
   * Set on an existing claim. Its presence is what turns an upload into a
   * `dispute_evidence` row rather than a manifest entry.
   */
  disputeId,
  disabled = false,
  className,
}: {
  name?: string;
  pathPrefix: string;
  disputeId?: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [slots, setSlots] = React.useState<Slot[]>([]);
  /**
   * Set only from the upload handler, when storage answers that the bucket is
   * not there. Deriving it during render is impossible — it is the answer to a
   * network call — and an effect that set it would be exactly the
   * `set-state-in-effect` this codebase treats as an error.
   */
  const [bucketMissing, setBucketMissing] = React.useState(false);

  const inputId = React.useId();
  const unavailable = !STORAGE_CONFIGURED || bucketMissing;
  const locked = disabled || unavailable;

  const uploaded: EvidenceItem[] = slots.flatMap((slot) =>
    slot.status === "done" && slot.path
      ? [{ path: slot.path, name: slot.name, type: slot.type, size: slot.size }]
      : [],
  );

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    // Reset immediately, so picking the same file twice still fires a change.
    input.value = "";
    if (chosen.length === 0) return;

    const room = MAX_FILES - slots.length;
    const accepted = chosen.slice(0, Math.max(0, room));

    const queued: Slot[] = accepted.map((file) => ({
      id: randomId(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: file.size > MAX_BYTES ? "error" : "uploading",
      message: file.size > MAX_BYTES ? `Too large — ${formatBytes(MAX_BYTES)} max` : undefined,
    }));

    setSlots((current) => [...current, ...queued]);

    const supabase = createClient();

    // Only needed to stamp `uploaded_by`, which RLS checks against `auth.uid()`.
    const uploader = disputeId
      ? (await supabase.auth.getUser()).data.user?.id ?? null
      : null;

    const results = await Promise.all(
      accepted.map(async (file, index) => {
        const slot = queued[index];
        if (!slot || slot.status === "error") return false;

        const objectPath = `${pathPrefix}/${slot.id}-${safeName(file.name) || "file"}`;

        const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

        if (error) {
          console.error("[warranty] evidence upload failed", error.message);

          // A missing bucket is not a per-file problem — nothing will upload
          // until storage is provisioned. The row is dropped rather than left
          // showing "Upload failed", because that reads as "try again" and
          // there is nothing the customer can do; the control disables itself
          // below and explains why instead.
          if (/bucket/i.test(error.message)) {
            setBucketMissing(true);
            setSlots((current) => current.filter((entry) => entry.id !== slot.id));
            return false;
          }

          setSlots((current) =>
            current.map((entry) =>
              entry.id === slot.id
                ? { ...entry, status: "error", message: "Upload failed" }
                : entry,
            ),
          );
          return false;
        }

        // The row, not the object, is what makes a file part of the claim. A
        // successful upload whose insert fails is reported as a failure for
        // that reason: the customer would otherwise be told their photo was
        // attached to a claim nobody can see it from.
        if (disputeId && uploader) {
          /**
           * `dispute_evidence` is absent from the generated `Database` type —
           * that file is regenerated from `schema.sql`, which predates this
           * migration — so the client types any insert payload as `never`.
           * Naming the row shape from `marketplace.ts` keeps the columns
           * checked against the schema truth, and the cast is only to get past
           * the missing generated type. It stays correct once `database.ts` is
           * regenerated, because `never` is assignable to whatever replaces it.
           */
          const row: Omit<DisputeEvidenceRow, "id" | "created_at"> = {
            dispute_id: disputeId,
            uploaded_by: uploader,
            storage_path: objectPath,
            file_name: file.name.slice(0, 200),
            mime_type: file.type || null,
            size_bytes: file.size,
          };

          const { error: rowError } = await supabase
            .from("dispute_evidence")
            .insert(row as never);

          if (rowError) {
            console.error("[warranty] evidence row failed", rowError.message);
            setSlots((current) =>
              current.map((entry) =>
                entry.id === slot.id
                  ? { ...entry, status: "error", message: "Could not attach" }
                  : entry,
              ),
            );
            return false;
          }
        }

        setSlots((current) =>
          current.map((entry) =>
            entry.id === slot.id ? { ...entry, status: "done", path: objectPath } : entry,
          ),
        );
        return true;
      }),
    );

    // Re-render the server component so the new evidence appears as a real
    // thumbnail with a signed URL, rather than only as a row in this list.
    if (disputeId && results.some(Boolean)) router.refresh();
  }

  function removeSlot(id: string) {
    // The object itself is left in the bucket. Deleting it needs a storage
    // policy that may not exist yet, and an orphaned upload nobody references
    // is cheaper than a delete that fails in front of the customer.
    setSlots((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="eyebrow">
        Evidence <span className="normal-case text-steel-soft">(optional)</span>
      </label>

      <input
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={locked}
        onChange={handleFiles}
        className={cn(
          "w-full rounded-machined border border-hairline bg-chalk px-3 py-2 text-sm text-steel",
          "file:mr-3 file:rounded-machined file:border-0 file:bg-bench file:px-3 file:py-1.5",
          "file:font-display file:text-sm file:uppercase file:tracking-wide file:text-enamel",
          "hover:file:bg-bench-sunk focus:border-signal focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      <p className="text-xs text-steel">
        {unavailable
          ? "Photo uploads are not switched on yet — storage has not been provisioned for this site. Everything else on this form works; the shop and our team still see the claim."
          : `Photos or a PDF of the fault. Up to ${MAX_FILES} files, ${formatBytes(MAX_BYTES)} each.`}
      </p>

      {slots.length > 0 ? (
        <ul aria-live="polite" className="flex flex-col gap-1.5 pt-1">
          {slots.map((slot) => {
            const isImage = slot.type.startsWith("image/");
            const Icon =
              slot.status === "uploading" ? Loader2 : isImage ? ImageIcon : FileText;

            return (
              <li
                key={slot.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-machined border px-3 py-2 text-sm",
                  slot.status === "error"
                    ? "border-rust/30 bg-rust-wash text-rust"
                    : "border-hairline bg-bench text-steel",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    slot.status === "uploading" && "animate-spin",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{slot.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {slot.message ?? formatBytes(slot.size)}
                </span>

                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  className="shrink-0 rounded-machined p-0.5 text-steel-soft hover:text-rust"
                >
                  <X aria-hidden className="size-4" />
                  {/* "Dismiss" once the row exists: the file is on the claim and
                      a claim is append-only, so this only clears the line. */}
                  <span className="sr-only">
                    {disputeId && slot.status === "done" ? "Dismiss" : "Remove"} {slot.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Only in manifest mode. With a `disputeId` the row is already written,
          so there is no form field left to carry — and an input named
          `evidence` sitting inside the reply form would post a duplicate. */}
      {disputeId ? null : (
        // Empty string rather than "[]" when nothing uploaded, so a server-side
        // `z.string().optional()` sees an absent value rather than an empty
        // array it has to special-case.
        <input
          type="hidden"
          name={name}
          value={uploaded.length > 0 ? JSON.stringify(uploaded) : ""}
        />
      )}

      {uploaded.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-verdigris">
          <Paperclip aria-hidden className="size-3.5" />
          {uploaded.length} {uploaded.length === 1 ? "file" : "files"}{" "}
          {disputeId ? "added to the claim" : "attached"}
        </p>
      ) : null}
    </div>
  );
}
