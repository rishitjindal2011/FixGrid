import { Check, CheckCheck, Clock, Paperclip } from "lucide-react";

import { UserAvatar } from "@/components/ui/avatar";
import { formatTime } from "@/lib/format";
import type { ThreadMessage } from "@/lib/dashboard/messages";
import { cn } from "@/lib/utils";

/**
 * One message in a transcript.
 *
 * Not a client component: a bubble has no state of its own. It renders inside
 * `MessagePane`, which is a client component only because the transcript needs
 * optimistic entries and a scroll ref — that boundary should not spread down
 * into every leaf.
 *
 * Times use the **shop's** timezone, passed in, for the same reason booking
 * slots do: a transcript read next to an appointment has to agree with it, and
 * "you said 09:00" must mean the clock on the counter wall.
 */

/** Attachment sizes are `integer` bytes in the schema. Mono, so it lines up. */
function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MessageBubble({
  message,
  timeZone,
  showAvatar = true,
  pending = false,
  className,
}: {
  message: ThreadMessage;
  timeZone: string;
  /** False for the second and later messages in a run from the same sender. */
  showAvatar?: boolean;
  /** True while an optimistic message is still in flight. */
  pending?: boolean;
  className?: string;
}) {
  const mine = message.isMine;

  return (
    <li className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", className)}>
      {mine ? null : (
        /* The gutter is held even when the avatar is dropped, so a run of
           messages from one sender stays on a single left edge. */
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <UserAvatar src={message.senderAvatar} name={message.senderName} size="sm" />
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-machined px-3 py-2 sm:max-w-[75%]",
          mine
            ? "bg-enamel text-bench"
            : "border border-hairline bg-chalk text-enamel shadow-bench",
          pending && "opacity-70",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
          {message.body}
        </p>

        {message.attachments.length > 0 ? (
          <ul className="flex flex-col gap-1 pt-2">
            {message.attachments.map((file) => {
              const size = formatBytes(file.size_bytes);

              return (
                <li
                  key={file.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-machined border px-2 py-1 text-xs",
                    mine
                      ? "border-bench/25 bg-bench/10 text-bench"
                      : "border-hairline bg-bench text-steel",
                  )}
                >
                  <Paperclip aria-hidden className="size-3 shrink-0" />
                  <span className="truncate">{file.file_name ?? "Attachment"}</span>
                  {size ? (
                    <span className="shrink-0 font-mono tabular-nums opacity-70">{size}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        <p
          className={cn(
            "flex items-center gap-1.5 pt-1 font-mono text-eyebrow tabular-nums",
            mine ? "justify-end text-bench/70" : "text-steel-soft",
          )}
        >
          <time dateTime={message.createdAt}>{formatTime(message.createdAt, timeZone)}</time>

          {/* Receipts are only meaningful on your own messages — the other
              party's read state is not yours to know, and "read" on a message
              you were sent would just describe your own screen. */}
          {mine ? (
            pending ? (
              <span className="flex items-center gap-1">
                <Clock aria-hidden className="size-3" />
                <span className="sr-only">Sending</span>
              </span>
            ) : message.readAt ? (
              <span className="flex items-center gap-1">
                <CheckCheck aria-hidden className="size-3" />
                <span className="sr-only">Read</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Check aria-hidden className="size-3" />
                <span className="sr-only">Sent, not read yet</span>
              </span>
            )
          ) : null}
        </p>
      </div>
    </li>
  );
}

/**
 * A day break in the transcript.
 *
 * The label is computed by the pane, which knows the request time; this only
 * draws it. A rule through the middle rather than a floating pill — the token
 * comment rules pills out, and a full-width rule reads as a boundary.
 */
export function DaySeparator({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 py-1" role="separator" aria-label={label}>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
      <span className="eyebrow shrink-0 text-steel-soft">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
    </li>
  );
}
