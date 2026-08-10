"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";

import { MessageComposer, type OptimisticDraft } from "@/components/dashboard/message-composer";
import { DaySeparator, MessageBubble } from "@/components/dashboard/message-bubble";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UserAvatar } from "@/components/ui/avatar";
import { markThreadRead } from "@/lib/bookings/actions";
import { slotEnd, slotStart } from "@/lib/bookings/actions-map";
import type { ThreadDetail, ThreadMessage } from "@/lib/dashboard/messages";
import { formatDay, formatSlot } from "@/lib/format";

/**
 * One conversation: header, transcript, composer.
 *
 * A client component for three reasons and no others — the optimistic
 * transcript, the scroll-to-bottom ref, and stamping the thread read on arrival.
 * Everything presentational underneath it stays a server component.
 *
 * Two things it must not do, both of them lint errors in this config
 * (`react-hooks/set-state-in-effect`):
 *
 *   • derive the day separators into state — they are computed during render
 *     from the message list, which is the only place they can be correct;
 *   • scroll by storing a flag. The effect below writes `scrollTop` on a ref,
 *     which is a DOM write rather than a state update, and is fine.
 */

/**
 * Read receipts fire from the client, not from the page.
 *
 * A Server Component that mutated during render would be writing on every
 * prefetch, and `revalidatePath` inside a render throws. Opening the
 * conversation is a real user event, so it belongs on the client side of the
 * boundary.
 */
function useMarkRead(threadId: string) {
  React.useEffect(() => {
    void markThreadRead(threadId);
  }, [threadId]);
}

/**
 * "Today" / "Yesterday" / "Sat 8 Aug", in the shop's zone.
 *
 * Compared as formatted strings rather than by date arithmetic: the boundary
 * that matters is midnight *at the shop*, and `formatDay` is already the one
 * function in the codebase that knows how to ask that question.
 */
function dayLabel(iso: string, now: Date, timeZone: string): string {
  const day = formatDay(iso, timeZone);
  if (day === formatDay(now, timeZone)) return "Today";

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day === formatDay(yesterday, timeZone)) return "Yesterday";

  return day;
}

export function MessagePane({
  thread,
  now,
  viewerId,
  viewerName,
  viewerAvatar,
  backHref,
}: {
  thread: ThreadDetail;
  /** The request time, so the server render and this one agree on "Today". */
  now: Date;
  viewerId: string;
  viewerName: string;
  viewerAvatar: string | null;
  /** Mobile only: the route back to the inbox. Desktop shows both panes. */
  backHref?: string;
}) {
  useMarkRead(thread.id);

  const timeZone = thread.shopTimezone;

  const [optimistic, addOptimistic] = React.useOptimistic(
    thread.messages,
    (current: ThreadMessage[], draft: OptimisticDraft) => [
      ...current,
      {
        // Not a real id — it exists only until the server's copy replaces it.
        // Prefixed so it can never collide with a uuid from the database.
        id: `pending-${current.length}`,
        senderId: viewerId,
        // A shop speaks under its trading name, matching how `getThread`
        // attributes the persisted message once it comes back.
        senderName: thread.viewerIsShop ? thread.shopName : viewerName,
        // The sender's own avatar. `ThreadDetail` carries the shop's photo only
        // as `otherPartyAvatar`, which is the *customer's* when the viewer is
        // the shop — reusing it here would caption your own message with the
        // face of the person you are replying to. Neither field is rendered on
        // an own-side bubble today, so this is about not leaving a trap.
        senderAvatar: viewerAvatar,
        isMine: true,
        body: draft.body,
        readAt: null,
        createdAt: new Date().toISOString(),
        attachments: draft.attachmentNames.map((name, index) => ({
          id: `pending-file-${index}`,
          message_id: `pending-${current.length}`,
          storage_path: "",
          file_name: name,
          mime_type: null,
          size_bytes: null,
          created_at: new Date().toISOString(),
        })),
      },
    ],
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Jump to the newest message on open and whenever the transcript grows. A DOM
  // write on a ref, deliberately — not state, and not smooth, so it also does
  // the right thing under `prefers-reduced-motion`.
  React.useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [optimistic.length]);

  const start = slotStart(thread.bookingSlot);
  const end = slotEnd(thread.bookingSlot);

  // A shop owner manages the job under the expert routes; the customer under
  // their own. Same reference, two different destinations.
  //
  // The shop side addresses a job by query param rather than a path segment,
  // matching `PendingRequestsPanel`. That is the deliberate shape: the requests
  // screen is one board that focuses a row, so an unrecognised reference still
  // lands on a useful page instead of 404ing on a route segment that does not
  // exist.
  const bookingHref = thread.viewerIsShop
    ? `/dashboard/expert/requests?booking=${encodeURIComponent(thread.bookingReference)}`
    : `/dashboard/bookings/${thread.bookingReference}`;

  return (
    <section className="flex h-[calc(100vh-11rem)] min-h-100 flex-col overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench lg:h-[calc(100vh-13rem)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-hairline p-3 sm:p-4">
        {backHref ? (
          <Link
            href={backHref}
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-machined border border-hairline bg-chalk text-steel transition-colors hover:text-enamel lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span className="sr-only">Back to all conversations</span>
          </Link>
        ) : null}

        <UserAvatar
          src={thread.otherPartyAvatar}
          name={thread.otherPartyName}
          size="md"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base uppercase tracking-wide text-enamel">
            {thread.otherPartyName}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            {thread.bookingReference ? (
              <Link
                href={bookingHref}
                className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
              >
                {thread.bookingReference}
              </Link>
            ) : null}

            {start && end ? (
              <span className="font-mono text-eyebrow tabular-nums text-steel-soft">
                {formatSlot(start, end, timeZone)}
              </span>
            ) : null}
          </div>
        </div>

        <StatusBadge status={thread.bookingStatus} className="mt-0.5 shrink-0" />
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bench px-3 py-4 sm:px-4">
        {optimistic.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="grid size-10 place-items-center rounded-machined border border-hairline bg-chalk text-steel-soft">
              <MessageSquarePlus aria-hidden className="size-5" />
            </span>
            <p className="font-display text-base uppercase tracking-wide text-enamel">
              No messages yet
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-steel">
              This conversation is attached to booking{" "}
              <span className="font-mono">{thread.bookingReference || "—"}</span>. Anything you
              send here reaches {thread.otherPartyName} directly.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {optimistic.map((message, index) => {
              const previous = index > 0 ? optimistic[index - 1] : undefined;
              const newDay =
                !previous ||
                formatDay(previous.createdAt, timeZone) !==
                  formatDay(message.createdAt, timeZone);
              // The avatar marks who started speaking, so it is dropped inside a
              // run from one sender and restored after a day break.
              const showAvatar = newDay || previous?.senderId !== message.senderId;

              return (
                <React.Fragment key={message.id}>
                  {newDay ? (
                    <DaySeparator label={dayLabel(message.createdAt, now, timeZone)} />
                  ) : null}
                  <MessageBubble
                    message={message}
                    timeZone={timeZone}
                    showAvatar={showAvatar}
                    pending={message.id.startsWith("pending-")}
                  />
                </React.Fragment>
              );
            })}
          </ol>
        )}
      </div>

      <MessageComposer threadId={thread.id} onOptimistic={addOptimistic} className="shrink-0" />
    </section>
  );
}
