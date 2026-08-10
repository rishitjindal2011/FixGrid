"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The shop's photo strip — list, upload, remove, reorder, set cover.
 *
 * Two stores, one screen. The files live in a **public** Supabase Storage
 * bucket; `fixer_profiles.photos` holds the resulting URLs in display order and
 * is the only thing the public page reads. Nothing here is a booking
 * attachment: those go to the private `booking-attachments` bucket and are
 * served through short-lived signed URLs, because a photo of somebody's broken
 * laptop is not shop marketing.
 *
 * Files go straight from the browser to storage rather than through a Server
 * Action, for the same reason `EvidenceUpload` does: routing megabytes through
 * the Next server spends them twice and Server Actions carry a body-size cap a
 * couple of phone photos clear easily.
 *
 * **The array write is a direct PostgREST update, and that is deliberate.** The
 * `owner updates own profile` policy in `supabase/policies.sql` already scopes
 * `fixer_profiles` updates to `owner_id = auth.uid()`, which is the same gate a
 * server action would be asking RLS to apply anyway. A policy refusal returns
 * *zero rows*, which PostgREST reports as success — so every write below
 * selects the id back and treats a missing row as a refusal, exactly as
 * `assertOwnership` does on the server side.
 *
 * **Degradation is a feature, not a fallback.** No migration provisions this
 * bucket and the environment may carry no Supabase keys at all. Both cases end
 * in disabled controls and one sentence of explanation — never a thrown error,
 * because a shop with no photos is a shop that still trades.
 */

/**
 * Inlined at build time, so this is a compile-time constant in the bundle. When
 * it is false, `createClient()` would construct a browser client over
 * `undefined!` and throw on first use — so it is never called.
 */
const STORAGE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const BUCKET = "shop-photos";
const MAX_PHOTOS = 12;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

/** `crypto.randomUUID` is unavailable on insecure origins; this is only ever a
 * filename discriminator, never a security boundary. */
function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Storage rejects most punctuation in object keys; keep the extension legible. */
function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * The object key behind one of our own public URLs, or null for anything else.
 *
 * Seeded shops carry stock photography from other hosts, and a delete keyed off
 * a URL we do not own would either fail noisily or — worse, if the path
 * happened to collide — remove a file belonging to nothing on this screen.
 */
function objectPathOf(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  try {
    return decodeURIComponent(url.slice(at + marker.length));
  } catch {
    return null;
  }
}

export function PhotoManager({
  fixerId,
  photos: initialPhotos,
}: {
  fixerId: string;
  /** Seeds the list once, at mount. Local state is authoritative afterwards. */
  photos: string[];
}) {
  const router = useRouter();
  const inputId = React.useId();

  /**
   * Seeded from props and then owned here. Re-syncing it from a refreshed prop
   * would need an effect, and `react-hooks/set-state-in-effect` is an error in
   * this config — so every mutation writes the database *and* this list from
   * the same handler, and the two cannot drift.
   */
  const [photos, setPhotos] = React.useState<string[]>(initialPhotos);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [uploading, setUploading] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  /**
   * Set only from the upload handler, when storage answers that the bucket is
   * not there. It cannot be derived during render — it is the answer to a
   * network call — and an effect that set it would be the lint error above.
   */
  const [bucketMissing, setBucketMissing] = React.useState(false);

  const busy = saving || uploading > 0;
  const unavailable = !STORAGE_CONFIGURED;
  const uploadsClosed = unavailable || bucketMissing || photos.length >= MAX_PHOTOS;

  /**
   * Write the whole array. Order *is* the data — position 0 is the cover — so
   * every operation is a replacement rather than an edit of one element, and
   * there is no partial state to recover from if it fails.
   */
  async function commit(next: string[], success: string): Promise<boolean> {
    setSaving(true);
    setNotice(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("fixer_profiles")
      .update({ photos: next })
      .eq("id", fixerId)
      .select("id")
      .maybeSingle<{ id: string }>();

    setSaving(false);

    if (error) {
      console.error("[expert] shop photo save failed", error.message);
      setNotice({
        tone: "error",
        text:
          error.code === "42501"
            ? "You do not have permission to change this shop's photos."
            : "Those photos could not be saved. Try again in a moment.",
      });
      return false;
    }

    // Zero rows updated. RLS refused, and PostgREST reports that as success.
    if (!data) {
      setNotice({ tone: "error", text: "You do not manage that shop." });
      return false;
    }

    setPhotos(next);
    setNotice({ tone: "ok", text: success });
    // The preview card beside this list and the live listing both read the
    // column that just changed.
    router.refresh();
    return true;
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    // Reset immediately, so picking the same file twice still fires a change.
    input.value = "";
    if (chosen.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setNotice({
        tone: "error",
        text: `That is the ${MAX_PHOTOS}-photo limit — remove one before adding another.`,
      });
      return;
    }

    const considered = chosen.slice(0, room);
    const accepted = considered.filter((file) => file.size <= MAX_BYTES);
    if (accepted.length === 0) {
      setNotice({ tone: "error", text: `Every photo has to be under ${formatBytes(MAX_BYTES)}.` });
      return;
    }

    setUploading(accepted.length);
    setNotice(null);

    const supabase = createClient();
    const uploaded: string[] = [];
    // Oversized files never reach storage but they were still chosen, so they
    // count towards what the owner is told did not make it.
    let failed = considered.length - accepted.length;
    // Read back in this handler rather than from the `bucketMissing` state,
    // which is the value captured when this render began and stays false for
    // the whole pass no matter what the setter above does.
    let bucketGone = false;

    // Sequential rather than parallel: the order they were chosen in becomes
    // the order they appear in, and a handful of photos is not worth racing.
    for (const file of accepted) {
      const objectPath = `${fixerId}/${randomId()}-${safeName(file.name) || "photo"}`;

      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

      if (error) {
        console.error("[expert] shop photo upload failed", error.message);

        // A missing bucket is not a per-file problem — nothing will upload
        // until storage is provisioned, so the rest of the batch is abandoned
        // and the control disables itself below.
        if (/bucket/i.test(error.message)) {
          bucketGone = true;
          setBucketMissing(true);
          break;
        }

        failed += 1;
        continue;
      }

      uploaded.push(supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl);
    }

    setUploading(0);

    if (uploaded.length === 0) {
      // The bucket case explains itself in the hint under the input; saying it
      // twice would read as two separate problems.
      if (!bucketGone) {
        setNotice({ tone: "error", text: "Those photos could not be uploaded. Try again." });
      }
      return;
    }

    const saved = await commit(
      [...photos, ...uploaded],
      uploaded.length === 1 ? "Photo added." : `${uploaded.length} photos added.`,
    );

    if (saved && failed > 0) {
      setNotice({
        tone: "error",
        text: `${uploaded.length} added, ${failed} would not upload — check the file type and try those again.`,
      });
    }
  }

  function move(index: number, direction: -1 | 1) {
    const to = index + direction;
    const moved = photos[index];
    const displaced = photos[to];
    if (!moved || !displaced) return;

    const next = [...photos];
    next[index] = displaced;
    next[to] = moved;

    void commit(next, to === 0 ? "New cover photo set." : "Photo moved.");
  }

  function setCover(index: number) {
    const target = photos[index];
    if (!target || index === 0) return;

    // Lifted to the front rather than swapped with whatever is there, so the
    // rest of the strip keeps the order it was arranged in.
    void commit(
      [target, ...photos.filter((_, position) => position !== index)],
      "Cover photo set.",
    );
  }

  async function remove(index: number) {
    const target = photos[index];
    if (!target) return;

    const next = photos.filter((_, position) => position !== index);
    const saved = await commit(
      next,
      index === 0 && next.length > 0 ? "Photo removed — the next one is now the cover." : "Photo removed.",
    );
    if (!saved) return;

    // Best effort, and after the column is already correct. The array is what
    // the public page reads, so an object left behind costs storage and nothing
    // else — where a delete that failed *first* would leave a live URL pointing
    // at a file we had told the owner was gone.
    const path = objectPathOf(target);
    if (!path) return;

    const { error } = await createClient().storage.from(BUCKET).remove([path]);
    if (error) console.error("[expert] shop photo delete failed", error.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="eyebrow">
          Add photos
        </label>

        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={uploadsClosed || busy}
          onChange={handleFiles}
          aria-describedby={`${inputId}-hint`}
          className={cn(
            "w-full rounded-machined border border-hairline bg-chalk px-3 py-2 text-sm text-steel",
            "file:mr-3 file:rounded-machined file:border-0 file:bg-bench file:px-3 file:py-1.5",
            "file:font-display file:text-sm file:uppercase file:tracking-wide file:text-enamel",
            "hover:file:bg-bench-sunk focus:border-signal focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />

        <p id={`${inputId}-hint`} className="text-xs leading-relaxed text-steel-soft">
          {unavailable
            ? "Photo uploads are not switched on yet — storage has not been provisioned for this site. Everything else on this page works, and your listing still shows your name, hours and services."
            : bucketMissing
              ? "Photo storage is not provisioned for this site yet, so nothing will upload. Your existing photos are unaffected."
              : `JPEG, PNG or WebP, up to ${formatBytes(MAX_BYTES)} each. ${photos.length} of ${MAX_PHOTOS} used. The first photo is your cover — it is what customers see in search results.`}
        </p>
      </div>

      {uploading > 0 ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-steel"
        >
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Uploading {uploading} {uploading === 1 ? "photo" : "photos"}…
        </p>
      ) : null}

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "flex items-start gap-2 rounded-machined border px-3 py-2.5 text-sm leading-relaxed",
            notice.tone === "error"
              ? "border-rust/30 bg-rust-wash text-rust"
              : "border-verdigris/30 bg-verdigris-wash text-verdigris",
          )}
        >
          {notice.tone === "error" ? (
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          {notice.text}
        </p>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="A shop front, the bench, a repair in progress. Listings with photos get opened far more often than listings without."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo}
              className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench"
            >
              <div className="relative aspect-[4/3] bg-bench-sunk">
                <Image
                  // Unoptimised on purpose: a seeded listing can carry a photo
                  // from a host the image config does not allow, and the
                  // optimiser answers that with a broken thumbnail. This is a
                  // 200px management tile — correctness beats a few kilobytes.
                  unoptimized
                  src={photo}
                  alt={index === 0 ? "Cover photo" : `Photo ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                />

                {index === 0 ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-machined border border-signal/30 bg-signal-wash px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal">
                    <Star aria-hidden className="size-3" />
                    Cover
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-1 border-t border-hairline px-2 py-1.5">
                <span className="pl-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {index + 1}
                </span>

                <div className="flex items-center gap-0.5">
                  <TileButton
                    label={`Move photo ${index + 1} earlier`}
                    icon={ArrowLeft}
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <TileButton
                    label={`Move photo ${index + 1} later`}
                    icon={ArrowRight}
                    disabled={busy || index === photos.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <TileButton
                    label={`Make photo ${index + 1} the cover`}
                    icon={Star}
                    disabled={busy || index === 0}
                    onClick={() => setCover(index)}
                  />
                  <TileButton
                    label={`Remove photo ${index + 1}`}
                    icon={Trash2}
                    tone="destructive"
                    disabled={busy}
                    onClick={() => void remove(index)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** An icon control on a photo tile. Always labelled — the icon alone is not one. */
function TileButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-machined text-steel transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "destructive"
          ? "hover:bg-rust-wash hover:text-rust"
          : "hover:bg-bench-sunk hover:text-enamel",
      )}
    >
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
