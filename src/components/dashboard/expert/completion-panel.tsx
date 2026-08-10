"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";

import { BookingActions } from "@/components/dashboard/booking-actions";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BookingAction } from "@/lib/bookings/actions-map";
import { slotEnd, slotStart, statusExplainer } from "@/lib/bookings/actions-map";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { saveBookingNote } from "@/lib/dashboard/expert-actions";
import { daysUntil, formatDateTime, formatMoney, formatSlot } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  DELIVERY_MODE_LABELS,
  type BookingStatus,
  type DeliveryMode,
} from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * The fulfilment side of a conversation: what the job is, what the shop has
 * written about it privately, what it looks like finished, and the moves it is
 * legally allowed to make next.
 *
 * It sits beside the transcript because the two are the same piece of work. A
 * shop reading "is it done yet?" should be able to answer it and mark the job
 * complete without leaving the page, and the whole reason the messaging tables
 * hang off a booking is so this panel always knows which job is meant.
 *
 * A client component in full, because three of its four sections are
 * interactive — the note form, the upload, and the transition dialogs. The
 * fourth (the summary) is cheap text that would not be worth a second
 * round-trip to keep on the server.
 *
 * **Nothing here decides what is legal.** `actions` arrives already filtered by
 * `allowedActions(booking, "shop", now)` on the server, and every transition is
 * re-checked inside `transitionBooking` before a row moves. This is the
 * drawing, not the enforcement — the one thing it adds is wording, below.
 */

/**
 * Inlined at build time, so this is a compile-time constant in the bundle. When
 * it is false, `createClient()` would construct a browser client over
 * `undefined!` and throw on first use — so it is never called.
 */
const STORAGE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Private, and shared with the customer's own booking page via a signed URL. */
const BUCKET = "booking-attachments";

/** Matches the `size_bytes integer` column and keeps a phone photo comfortable. */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 8;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

/**
 * Where a completion photo means anything.
 *
 * Before the device is on the bench there is nothing to photograph, and once
 * the job is cancelled, declined or closed the record is settled. An upload box
 * on either would be a control that does nothing worth doing, so the section is
 * left out rather than rendered disabled.
 */
const PHOTO_STATUSES: readonly BookingStatus[] = [
  "confirmed",
  "in_progress",
  "completed",
  "disputed",
];

export interface CompletionPanelProps {
  bookingId: string;
  /** The shop this job belongs to. `saveBookingNote` checks it against the booking. */
  fixerId: string;
  reference: string;
  status: BookingStatus;
  customerName: string;
  customerPhone: string | null;
  serviceName: string | null;
  deliveryMode: DeliveryMode;
  /** `tstzrange` text. Parsed with `slotStart`/`slotEnd`. */
  slot: string;
  /** The shop's zone — the only correct one to render this booking's slot in. */
  timezone: string;
  /** Pence, gross: what the customer pays. */
  grossPence: number;
  /** Pence, net of the platform fee: what a payout on this job would carry. */
  netPence: number;
  currency: string;
  warrantyDays: number;
  warrantyExpiresAt: string | null;
  /** The existing `booking_notes` body. Empty string when there is none. */
  note: string;
  /** Already filtered by `allowedActions(booking, "shop", now)` on the server. */
  actions: BookingAction[];
  /** The request time, so the panel and the transcript agree on the instant. */
  now: Date;
  className?: string;
}

export function CompletionPanel({
  bookingId,
  fixerId,
  reference,
  status,
  customerName,
  customerPhone,
  serviceName,
  deliveryMode,
  slot,
  timezone,
  grossPence,
  netPence,
  currency,
  warrantyDays,
  warrantyExpiresAt,
  note,
  actions,
  now,
  className,
}: CompletionPanelProps) {
  const start = slotStart(slot);
  const end = slotEnd(slot);

  // Derived during render rather than stored: `actions` is the server's answer
  // and this only rewrites one sentence of it.
  const resolved = actions.map((action) =>
    action.to === "completed"
      ? { ...action, confirm: completionConsequence(warrantyDays, netPence, currency) }
      : action,
  );

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <section className="rounded-machined border border-hairline bg-chalk shadow-bench">
        <header className="flex items-start justify-between gap-3 border-b border-hairline p-4">
          <div className="min-w-0">
            <p className="eyebrow">The job</p>
            <p className="truncate pt-1.5 font-mono text-sm uppercase tracking-[0.14em] text-enamel">
              {reference || "—"}
            </p>
          </div>
          <StatusBadge status={status} className="mt-0.5 shrink-0" />
        </header>

        <dl className="flex flex-col gap-4 p-4">
          <Fact label="Customer">
            <span className="block truncate">{customerName}</span>
            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-eyebrow tracking-[0.08em] text-steel hover:text-signal"
              >
                <Phone aria-hidden className="size-3" />
                {customerPhone}
              </a>
            ) : null}
          </Fact>

          <Fact label="Service">
            <span className="block truncate">{serviceName ?? "Not specified"}</span>
            <span className="block pt-0.5 text-xs text-steel">
              {DELIVERY_MODE_LABELS[deliveryMode]}
            </span>
          </Fact>

          <Fact label="Slot">
            {start && end ? (
              <span className="font-mono tabular-nums">
                {formatSlot(start, end, timezone)}
              </span>
            ) : (
              <span className="text-steel">Not scheduled</span>
            )}
          </Fact>

          <Fact label="Amount">
            <span className="font-mono tabular-nums">
              {grossPence > 0 ? formatMoney(grossPence, currency) : "Not priced yet"}
            </span>
            {grossPence > 0 ? (
              <span className="block pt-0.5 text-xs text-steel">
                <span className="font-mono tabular-nums">
                  {formatMoney(netPence, currency)}
                </span>{" "}
                to you after the platform fee
              </span>
            ) : null}
          </Fact>

          <Fact label="Warranty">
            {warrantyExpiresAt ? (
              <span className="flex items-start gap-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-verdigris" />
                <span>
                  <span className="font-mono tabular-nums">
                    {daysUntil(warrantyExpiresAt, now)}
                  </span>{" "}
                  days left
                  <span className="block pt-0.5 text-xs text-steel">
                    Closes {formatDateTime(warrantyExpiresAt, timezone)}
                  </span>
                </span>
              </span>
            ) : warrantyDays > 0 ? (
              <span className="text-steel">
                <span className="font-mono tabular-nums text-enamel">{warrantyDays}</span> days,
                starting when you mark this complete
              </span>
            ) : (
              <span className="text-steel">None on this service</span>
            )}
          </Fact>
        </dl>
      </section>

      <PrivateNote bookingId={bookingId} fixerId={fixerId} note={note} />

      {PHOTO_STATUSES.includes(status) ? (
        <CompletionPhotos bookingId={bookingId} />
      ) : null}

      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h3 className="eyebrow">Where this stands</h3>
        <p className="pt-2 text-sm leading-relaxed text-steel">
          {statusExplainer(status, "shop")}
        </p>

        {resolved.length > 0 ? (
          <div className="pt-4">
            <BookingActions bookingId={bookingId} reference={reference} actions={resolved} />
          </div>
        ) : (
          <p className="pt-2 text-xs leading-relaxed text-steel-soft">
            Nothing to press on this one — the next move is not yours. You can still write
            here, and the customer sees it straight away.
          </p>
        )}
      </section>
    </aside>
  );
}

/**
 * "Mark complete", in this job's own numbers.
 *
 * `SHOP_ACTIONS` in `actions-map.ts` already carries a sentence, but it has no
 * booking to read and can only speak in general terms. Completion is the one
 * transition a shop cannot walk back — it starts the customer's warranty clock
 * and it is what releases the money — so the dialog says how long and how much
 * rather than leaving both to be discovered afterwards.
 */
function completionConsequence(
  warrantyDays: number,
  netPence: number,
  currency: string,
): string {
  const money =
    netPence > 0
      ? `queues ${formatMoney(netPence, currency)} for payout`
      : "releases this job for payout";

  if (warrantyDays <= 0) {
    return `Marking this complete ${money}. This service carries no warranty, so nothing holds it back. You cannot undo it.`;
  }

  return `Marking this complete starts the customer's ${warrantyDays}-day warranty on this repair and ${money} — the money is released once that window closes. You cannot undo it: anything wrong after this is handled as a warranty claim.`;
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow pb-1.5">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertTriangle : CheckCircle2;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "mt-3 flex items-start gap-2 rounded-machined border px-3 py-2.5 text-sm leading-relaxed",
        tone === "error"
          ? "border-rust/30 bg-rust-wash text-rust"
          : "border-verdigris/30 bg-verdigris-wash text-verdigris",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

/* ── The shop's private note ──────────────────────────────────────────────── */

function SaveNoteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save note"}
    </Button>
  );
}

/**
 * `booking_notes`, and the label that has to be on it.
 *
 * The table exists precisely because RLS is row-level: a customer who may read
 * their own booking may read every column of it, so no column of `bookings`
 * could ever hold this. That is invisible from the outside, which is why the
 * badge and the hint below both say so — a shop that is not certain who sees a
 * note writes a useless note.
 *
 * The textarea is uncontrolled. `saveBookingNote` revalidates the job screens
 * rather than this one, so re-seeding `defaultValue` from a fresh prop would
 * need an effect, and `react-hooks/set-state-in-effect` is an error here. What
 * was typed stays put and the success line confirms it landed.
 */
function PrivateNote({
  bookingId,
  fixerId,
  note,
}: {
  bookingId: string;
  fixerId: string;
  note: string;
}) {
  const [state, formAction] = useActionState(saveBookingNote, BOOKING_INITIAL_STATE);
  const fieldId = React.useId();

  return (
    <form
      action={formAction}
      className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fixerId" value={fixerId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="eyebrow">
          Shop note
        </label>
        <Badge variant="neutral">
          <Lock aria-hidden />
          Private
        </Badge>
      </div>

      <Textarea
        id={fieldId}
        name="body"
        rows={4}
        maxLength={4000}
        defaultValue={note}
        aria-describedby={`${fieldId}-hint`}
        placeholder="Waiting on a screen from the supplier. Customer prefers a text, not a call."
        className="mt-2"
      />

      <p id={`${fieldId}-hint`} className="pt-2 text-xs leading-relaxed text-steel">
        Only your shop can read this. It is never shown to the customer, and it does not
        appear on the booking or in the conversation. Saving an empty box clears it.
      </p>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success && state.message ? <Notice tone="ok">{state.message}</Notice> : null}

      <div className="flex justify-end pt-3">
        <SaveNoteButton />
      </div>
    </form>
  );
}

/* ── Completion photos ────────────────────────────────────────────────────── */

interface Slot {
  /** Local key only — the storage path is not known until the upload lands. */
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "done" | "error";
  message?: string;
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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "After the repair" photos, straight from the browser to storage.
 *
 * Routing megabytes through a Server Action would spend them twice — once into
 * the Next server, once back out to storage — and Server Actions carry a
 * body-size cap that a couple of phone photos clear easily. The same reasoning
 * as `EvidenceUpload` and `PhotoManager`.
 *
 * The bucket is private and nothing here ever builds a public URL: the upload
 * returns a path, the `booking_attachments` row makes it part of the job, and
 * the customer's own booking page mints a short-lived signed URL to show it
 * under "After the repair". A leaked path is then not a leaked photo.
 *
 * The row, not the object, is what attaches a photo — so an upload whose insert
 * fails is reported as a failure. Telling a shop the photo is on the job when
 * nothing can find it is worse than telling them to try again.
 *
 * **Degradation is the point.** No migration provisions the bucket and the
 * environment may carry no Supabase keys at all. Both end in a disabled control
 * and one sentence, never a thrown error — a job with no photos is still a job
 * that can be completed.
 */
function CompletionPhotos({ bookingId }: { bookingId: string }) {
  const [slots, setSlots] = React.useState<Slot[]>([]);
  /**
   * Set only from the upload handler, when storage answers that the bucket is
   * not there. It cannot be derived during render — it is the answer to a
   * network call — and an effect that set it would be the lint error above.
   */
  const [bucketMissing, setBucketMissing] = React.useState(false);

  const inputId = React.useId();
  const unavailable = !STORAGE_CONFIGURED || bucketMissing;
  const attached = slots.filter((slot) => slot.status === "done").length;
  const full = slots.length >= MAX_FILES;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    // Reset immediately, so picking the same file twice still fires a change.
    input.value = "";
    if (chosen.length === 0) return;

    const accepted = chosen.slice(0, Math.max(0, MAX_FILES - slots.length));
    if (accepted.length === 0) return;

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
    const uploader = (await supabase.auth.getUser()).data.user?.id ?? null;

    await Promise.all(
      accepted.map(async (file, index) => {
        const slot = queued[index];
        if (!slot || slot.status === "error") return;

        if (!uploader) {
          setSlots((current) =>
            current.map((entry) =>
              entry.id === slot.id
                ? { ...entry, status: "error", message: "Sign in again" }
                : entry,
            ),
          );
          return;
        }

        const objectPath = `${bookingId}/completion/${slot.id}-${safeName(file.name) || "photo"}`;

        const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

        if (error) {
          console.error("[expert] completion photo upload failed", error.message);

          // A missing bucket is not a per-file problem — nothing will upload
          // until storage is provisioned. The row is dropped rather than left
          // reading "Upload failed", because that invites a retry that cannot
          // work; the control disables itself below and explains instead.
          if (/bucket/i.test(error.message)) {
            setBucketMissing(true);
            setSlots((current) => current.filter((entry) => entry.id !== slot.id));
            return;
          }

          setSlots((current) =>
            current.map((entry) =>
              entry.id === slot.id
                ? { ...entry, status: "error", message: "Upload failed" }
                : entry,
            ),
          );
          return;
        }

        const { error: rowError } = await supabase.from("booking_attachments").insert({
          booking_id: bookingId,
          uploaded_by: uploader,
          storage_path: objectPath,
          file_name: file.name.slice(0, 200),
          mime_type: file.type || null,
          size_bytes: file.size,
          kind: "completion",
        });

        if (rowError) {
          console.error("[expert] completion photo row failed", rowError.message);
          setSlots((current) =>
            current.map((entry) =>
              entry.id === slot.id
                ? { ...entry, status: "error", message: "Could not attach" }
                : entry,
            ),
          );
          return;
        }

        setSlots((current) =>
          current.map((entry) =>
            entry.id === slot.id ? { ...entry, status: "done" } : entry,
          ),
        );
      }),
    );
  }

  return (
    <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
      <label htmlFor={inputId} className="eyebrow flex items-center gap-2">
        <Camera aria-hidden className="size-3.5" />
        Completion photos
      </label>

      <input
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={unavailable || full}
        onChange={handleFiles}
        aria-describedby={`${inputId}-hint`}
        className={cn(
          "mt-3 w-full rounded-machined border border-hairline bg-chalk px-3 py-2 text-sm text-steel",
          "file:mr-3 file:rounded-machined file:border-0 file:bg-bench file:px-3 file:py-1.5",
          "file:font-display file:text-sm file:uppercase file:tracking-wide file:text-enamel",
          "hover:file:bg-bench-sunk focus:border-signal focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      <p id={`${inputId}-hint`} className="pt-2 text-xs leading-relaxed text-steel">
        {unavailable
          ? "Photo uploads are not switched on yet — storage has not been provisioned for this site. Everything else on this panel works, and the job can still be completed."
          : full
            ? `That is the ${MAX_FILES}-photo limit for one visit here.`
            : `A photo of the finished repair, for the record. Up to ${MAX_FILES} files, ${formatBytes(MAX_BYTES)} each. Unlike the note above, the customer sees these on their booking.`}
      </p>

      {slots.length > 0 ? (
        <ul aria-live="polite" className="flex flex-col gap-1.5 pt-3">
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
                  // The object and its row are both left alone. A photo on the
                  // job is part of its record, and this only clears the line
                  // from a list that exists for the length of this visit.
                  onClick={() =>
                    setSlots((current) => current.filter((entry) => entry.id !== slot.id))
                  }
                  className="shrink-0 rounded-machined p-0.5 text-steel-soft transition-colors hover:text-rust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <X aria-hidden className="size-4" />
                  <span className="sr-only">
                    {slot.status === "done" ? "Dismiss" : "Remove"} {slot.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {attached > 0 ? (
        <p className="flex items-center gap-1.5 pt-2 text-xs text-verdigris">
          <CheckCircle2 aria-hidden className="size-3.5" />
          {attached} {attached === 1 ? "photo" : "photos"} on the job
        </p>
      ) : null}
    </section>
  );
}
