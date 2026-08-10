import Link from "next/link";

import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ThreadSummary } from "@/lib/dashboard/messages";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The inbox rail.
 *
 * Every row is a `Link` to `/dashboard/messages/[threadId]` rather than a
 * client-side pane swap, because routing *is* the mobile pattern here: on a
 * phone this list is the whole screen and the conversation is the next one, so
 * a tap has to be a navigation with a back stack. Desktop shows both panes and
 * the same href simply changes which one is active — no second code path, and
 * a conversation stays linkable and shareable.
 *
 * Serves both dashboards unchanged. `listThreads` already resolves "the other
 * party" per viewer, so a shop owner sees customer names here and a customer
 * sees shop names, with nothing to branch on.
 *
 * The one thing that does differ between the two is where a row leads: the
 * shop's inbox lives under `/dashboard/expert/messages`, where the conversation
 * carries a fulfilment panel the customer must never see. `basePath` is that
 * difference and nothing else — same rows, same reads, one segment swapped.
 */
export function ThreadList({
  threads,
  activeThreadId,
  now,
  basePath = "/dashboard/messages",
  className,
}: {
  threads: ThreadSummary[];
  /** Highlights the open conversation on the desktop two-pane layout. */
  activeThreadId?: string;
  /** The request time, threaded through so every row agrees on "2 hours ago". */
  now: Date;
  /** Route the rows link into. Defaults to the customer inbox. */
  basePath?: string;
  className?: string;
}) {
  if (threads.length === 0) {
    return (
      <p className={cn("px-4 py-6 text-sm text-steel", className)}>
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {threads.map((thread, index) => {
        const active = thread.id === activeThreadId;
        const unread = thread.unreadCount > 0;

        return (
          <li key={thread.id}>
            <Link
              href={`${basePath}/${thread.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex gap-3 border-l-2 p-3 transition-colors",
                index > 0 && "border-t border-t-hairline",
                active
                  ? "border-l-enamel bg-bench-sunk"
                  : unread
                    /* An unread thread is live state waiting on the reader, which
                       is exactly what signal is reserved for. */
                    ? "border-l-signal bg-signal-wash/50 hover:bg-signal-wash"
                    : "border-l-transparent hover:bg-bench",
              )}
            >
              <UserAvatar
                src={thread.otherPartyAvatar}
                name={thread.otherPartyName}
                size="md"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate font-display text-sm uppercase tracking-wide",
                      unread ? "text-signal" : "text-enamel",
                    )}
                  >
                    {thread.otherPartyName}
                  </span>

                  {thread.lastMessageAt ? (
                    <time
                      dateTime={thread.lastMessageAt}
                      className="shrink-0 font-mono text-eyebrow tabular-nums text-steel-soft"
                    >
                      {formatRelative(thread.lastMessageAt, now)}
                    </time>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {thread.bookingReference ? (
                    <span className="truncate font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                      {thread.bookingReference}
                    </span>
                  ) : (
                    <span className="sr-only">Booking reference unavailable</span>
                  )}

                  {unread ? (
                    <Badge variant="signal" className="shrink-0 tabular-nums">
                      <span className="sr-only">Unread messages: </span>
                      {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                    </Badge>
                  ) : null}
                </div>

                <p
                  className={cn(
                    "truncate pt-1.5 text-xs",
                    unread ? "text-enamel" : "text-steel",
                  )}
                >
                  {thread.lastMessagePreview ?? "No messages yet — say hello."}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
