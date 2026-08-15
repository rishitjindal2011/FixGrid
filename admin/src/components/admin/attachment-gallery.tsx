import Image from "next/image";
import { FileText, Paperclip } from "lucide-react";

import type { AttachmentKind, StoredAttachment } from "@/lib/attachments";
import { cn } from "@/lib/utils";

/**
 * Attachment tiles.
 *
 * `hrefs` maps an attachment's **row id** to a URL on this console's own origin,
 * served by `/api/attachments/…`. It used to map a *storage path* to a signed
 * `supabase.co` URL; the prop was renamed rather than re-pointed so that every
 * call site had to be revisited. Silently swapping the meaning of a map's keys is
 * the kind of change that keeps compiling and stops working.
 *
 * Claim evidence has no row of its own, so the claims page keys its map on the
 * synthetic ids it builds and points them at `/api/attachments/claim/…`. The
 * gallery does not care which route an href names, only that the caller decided
 * it — the component never constructs a URL from a storage path.
 *
 * An id with no entry renders as an inert chip rather than an error: evidence
 * that will not load must not take down the claim being reviewed.
 */

const KIND_LABELS: Record<AttachmentKind, string> = {
  fault: "What was wrong",
  completion: "After the repair",
  evidence: "Claim evidence",
};

export function AttachmentGallery({
  items,
  hrefs,
  className,
  emptyLabel = "No photos attached.",
}: {
  items: StoredAttachment[];
  /** Attachment id → URL on this origin. */
  hrefs: Map<string, string>;
  className?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-steel">{emptyLabel}</p>;
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-3", className)}>
      {items.map((item) => (
        <AttachmentTile key={item.id} item={item} url={hrefs.get(item.id) ?? null} />
      ))}
    </div>
  );
}

function isImageAttachment(item: StoredAttachment): boolean {
  if ((item.mimeType ?? "").startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|gif)$/i.test(item.storagePath);
}

function AttachmentTile({
  item,
  url,
}: {
  item: StoredAttachment;
  url: string | null;
}) {
  const isImage = isImageAttachment(item);
  const label = item.fileName ?? KIND_LABELS[item.kind];

  if (url && isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="group block overflow-hidden rounded-machined border border-hairline bg-bench"
      >
        {/*
          `unoptimized` because the route requires the admin session cookie and
          the image optimiser fetches server-side without one — it would get a
          404 and render a broken tile.
        */}
        <Image
          src={url}
          alt={label}
          width={240}
          height={240}
          unoptimized
          className="h-28 w-full object-cover transition-opacity group-hover:opacity-90"
        />
        <span className="block truncate px-2 py-1.5 text-xs text-steel">{KIND_LABELS[item.kind]}</span>
      </a>
    );
  }

  const chip = (
    <>
      <FileText aria-hidden className="size-4 shrink-0 text-steel-soft" />
      <span className="min-w-0 truncate">{label}</span>
    </>
  );

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-3 py-2 text-sm text-enamel hover:border-steel"
    >
      {chip}
    </a>
  ) : (
    <div className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-3 py-2 text-sm text-steel">
      <Paperclip aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
