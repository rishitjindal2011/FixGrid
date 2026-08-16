"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import { Building2, Loader2, MapPin, Phone, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitShop } from "@/lib/join/actions";
import { JOIN_INITIAL_STATE } from "@/lib/join/state";
import { PaymentSheet } from "@/components/dashboard/payment-sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The shop submission form.
 *
 * Evidence goes **from the browser straight to Supabase Storage**, and only the
 * resulting paths are posted to the server action. That is not an optimisation:
 * a Server Action body is capped at 1 MB, so sending four 5 MB photographs
 * through it fails outright with "Body exceeded 1 MB limit" — which is exactly
 * what the first version of this form did. Raising `bodySizeLimit` would only
 * move the ceiling while still round-tripping every byte through the Next
 * server for no reason.
 *
 * No service-role key is involved. The `claimant uploads own evidence` policy
 * scopes each upload to a folder named after the caller's own uid, so the anon
 * client is sufficient and the server re-checks the prefix on submit.
 *
 * Files upload as they are picked rather than on submit, so the wait is spread
 * across filling in the form instead of landing on the button all at once.
 */

const BUCKET = "shop-claims-evidence";
const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

interface Attachment {
  name: string;
  size: number;
  /** Storage path — what the action receives and records on the claim. */
  path: string;
}

function Field({
  label,
  htmlFor,
  hint,
  icon: Icon,
  invalid,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className={cn("eyebrow flex items-center gap-2", invalid ? "text-rust" : "text-steel")}
      >
        <Icon aria-hidden className="size-3.5" />
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-steel">{hint}</p> : null}
    </div>
  );
}

export function JoinForm({
  userId,
  balanceMinor,
  enrollmentFeeMinor,
}: {
  userId: string;
  balanceMinor: number;
  enrollmentFeeMinor: number;
}) {
  /*
   * The listing fee is chosen, not deducted.
   *
   * The form used to submit straight into an action that debited the balance, so
   * the first a submitter knew about the charge was either a smaller balance or a
   * refusal. Now the button opens the payment sheet, and the real submit only
   * happens once the money is there — by balance or by card.
   */
  const formRef = React.useRef<HTMLFormElement>(null);
  const [paying, setPaying] = React.useState(false);
  const [state, action, pending] = useActionState(submitShop, JOIN_INITIAL_STATE);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Bumped to remount the file input — the only way to clear a file control.
  const [inputKey, setInputKey] = useState(0);

  async function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;

    const room = MAX_FILES - files.length;
    const chosen = Array.from(incoming).slice(0, room);

    setUploadError(null);
    setUploading(true);

    const supabase = createClient();
    const accepted: Attachment[] = [];

    for (const file of chosen) {
      if (file.size > MAX_BYTES) {
        setUploadError(`"${file.name}" is over 5 MB.`);
        continue;
      }
      if (!ALLOWED.includes(file.type)) {
        setUploadError(`"${file.name}" must be a JPEG, PNG, WebP, HEIC or PDF.`);
        continue;
      }

      const extension = (file.name.split(".").pop() ?? "bin")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8);

      // uid first: the storage policy compares that segment against auth.uid().
      // `crypto.randomUUID` rather than an index, so two picks in the same
      // millisecond cannot collide.
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        setUploadError(`"${file.name}" could not be uploaded. Try again.`);
        continue;
      }

      accepted.push({ name: file.name, size: file.size, path });
    }

    setFiles((current) => [...current, ...accepted].slice(0, MAX_FILES));
    setUploading(false);
    setInputKey((key) => key + 1);
  }

  /**
   * Removes the row and the uploaded object together. Leaving the file behind
   * would put someone's licence photograph in the bucket with nothing
   * referencing it and no way for them to withdraw it.
   */
  async function removeFile(index: number) {
    const target = files[index];
    if (!target) return;

    setFiles((current) => current.filter((_, i) => i !== index));
    await createClient().storage.from(BUCKET).remove([target.path]);
  }

  const busy = pending || uploading;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      {/* Paths, not files — this is what keeps the action body a few hundred
          bytes instead of twenty megabytes. */}
      {files.map((file) => (
        <input key={file.path} type="hidden" name="evidencePaths" value={file.path} />
      ))}

      <Field
        label="Shop name"
        htmlFor="shopName"
        icon={Building2}
        invalid={state.field === "shopName"}
        hint="The name customers know you by."
      >
        <Input id="shopName" name="shopName" required minLength={2} maxLength={120} />
      </Field>

      <Field
        label="Address"
        htmlFor="address"
        icon={MapPin}
        invalid={state.field === "address"}
        hint="Street, town and postcode. Customers use this to find you."
      >
        <Textarea id="address" name="address" required rows={2} minLength={6} maxLength={300} />
      </Field>

      <Field
        label="Contact phone"
        htmlFor="contactPhone"
        icon={Phone}
        invalid={state.field === "contactPhone"}
        hint="Shown on your public page once approved."
      >
        <Input
          id="contactPhone"
          name="contactPhone"
          type="tel"
          required
          inputMode="tel"
          placeholder="+44 20 7946 0100"
          className="font-mono"
        />
      </Field>

      <Field
        label="Proof of business"
        htmlFor="evidence"
        icon={Upload}
        invalid={state.field === "evidence"}
        hint={`A licence, your storefront or a business card. Up to ${MAX_FILES} files, 5 MB each. Only our review team sees these.`}
      >
        <input
          key={inputKey}
          id="evidence"
          type="file"
          multiple
          accept={ALLOWED.join(",")}
          onChange={(event) => void addFiles(event.target.files)}
          disabled={busy || files.length >= MAX_FILES}
          className={cn(
            "block w-full rounded-machined border border-hairline bg-chalk p-2 text-sm text-enamel",
            "file:mr-3 file:rounded-machined file:border-0 file:bg-bench-sunk file:px-3 file:py-1.5",
            "file:font-display file:text-xs file:uppercase file:tracking-wide file:text-enamel",
            "disabled:opacity-50",
          )}
        />
      </Field>

      {uploading ? (
        <p className="flex items-center gap-2 text-sm text-steel" aria-live="polite">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Uploading…
        </p>
      ) : null}

      {uploadError ? (
        <p role="alert" className="text-sm text-rust">
          {uploadError}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, index) => (
            <li
              key={file.path}
              className="flex items-center justify-between gap-3 rounded-machined border border-hairline bg-bench px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-enamel">{file.name}</span>
              <span className="font-mono text-xs text-steel">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => void removeFile(index)}
                className="grid size-6 shrink-0 place-items-center rounded-machined text-steel transition-colors hover:bg-bench-sunk hover:text-rust"
              >
                <X aria-hidden className="size-3.5" />
                <span className="sr-only">Remove {file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Field
        label="Anything else (optional)"
        htmlFor="notes"
        icon={Building2}
        hint="Trading years, registration number, or anything that helps us verify you."
      >
        <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
      </Field>

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-machined border border-rust/30 bg-rust-wash px-4 py-3 text-sm text-enamel"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="button" size="lg" disabled={busy} onClick={() => setPaying(true)}>
        {pending ? "Submitting…" : uploading ? "Waiting for uploads…" : "Submit for review"}
      </Button>

      <p className="text-xs text-steel">
        Your dashboard opens straight away so you can add services, hours and
        photos. The shop appears in search once we have checked your details.
      </p>

      {paying ? (
        <PaymentSheet
          open
          onClose={() => setPaying(false)}
          amountMinor={enrollmentFeeMinor}
          balanceMinor={balanceMinor}
          title="Listing fee"
          description="A one-off fee to list your shop, refunded in full if we cannot verify it. Choose how you want to pay."
          purchaseFields={{}}
          /* The purchase here is the whole submission, which this form already
             owns — so the sheet only assures the funds and hands back. */
          onFunded={() => {
            setPaying(false);
            formRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </form>
  );
}
