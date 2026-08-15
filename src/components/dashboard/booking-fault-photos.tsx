"use client";

import * as React from "react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";

import { FAULT_PHOTO_LIMITS } from "@/lib/bookings/attachments-client";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PendingFile {
  id: string;
  file: File;
  tooLarge: boolean;
}

export function BookingFaultPhotos({
  files,
  onChange,
  disabled = false,
  className,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputId = React.useId();
  const full = files.length >= FAULT_PHOTO_LIMITS.maxFiles;

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (chosen.length === 0) return;

    const room = FAULT_PHOTO_LIMITS.maxFiles - files.length;
    const next = [...files, ...chosen.slice(0, Math.max(0, room))];
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-2.5 py-1.5 text-xs text-enamel"
          >
            <ImageIcon aria-hidden className="size-3.5 text-steel-soft" />
            <span className="max-w-[12rem] truncate">{file.name}</span>
            <span className="font-mono text-steel-soft">{formatBytes(file.size)}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded p-0.5 text-steel hover:text-enamel"
                aria-label={`Remove ${file.name}`}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-machined border border-dashed border-hairline bg-bench-sunk px-4 py-6 text-center transition-colors",
          disabled || full ? "cursor-not-allowed opacity-60" : "hover:border-steel hover:bg-bench",
        )}
      >
        <Camera aria-hidden className="size-5 text-steel-soft" />
        <span className="text-sm text-enamel">
          {full ? "Photo limit reached" : "Add photos of the fault (optional)"}
        </span>
        <span className="text-xs text-steel-soft">
          Up to {FAULT_PHOTO_LIMITS.maxFiles} images · {formatBytes(FAULT_PHOTO_LIMITS.maxBytes)} each
        </span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled || full}
          onChange={handlePick}
          className="sr-only"
        />
      </label>

      <p className="text-xs text-steel-soft">
        Photos upload when you send the request. The shop sees them on your booking.
      </p>
    </div>
  );
}

export function BookingSubmitSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {label}
    </span>
  );
}
