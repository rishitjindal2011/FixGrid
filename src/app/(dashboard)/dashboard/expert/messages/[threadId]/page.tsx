import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MessagesSquare, Wrench } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { CompletionPanel } from "@/components/dashboard/expert/completion-panel";
import { MessagePane } from "@/components/dashboard/message-pane";
import { ThreadList } from "@/components/dashboard/thread-list";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { allowedActions } from "@/lib/bookings/actions-map";
import { getMyShop } from "@/lib/dashboard/claims";
import { getBookingNote, listExpertBookings } from "@/lib/dashboard/expert";
import { getThread, listThreads } from "@/lib/dashboard/messages";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

/** See the note on the same constant in the inbox page — one read, two jobs. */
const SHOP_BOOKING_SCAN = 500;

/**
 * One conversation, with the job it is about.
 *
 * A thin wrapper: the rail, the transcript and the composer are the same
 * components the customer's inbox renders, handed the shop owner's own user id.
 * What this page adds is `CompletionPanel` — the summary, the shop-private
 * note, the completion photos and the transitions `allowedActions` says are
 * legal right now. That panel is the entire reason the expert route exists
 * separately from `/dashboard/messages/[threadId]`.
 *
 * Three reads go out together and one follows, because the note is keyed on a
 * booking id that only the thread knows.
 *
 * `notFound()` is deliberately not called on a missing thread. `getThread`
 * returns null for "no such thread", "RLS refused it" and "the table does not
 * exist yet" alike, and the last of those is the state this app is in before
 * the migration runs — a 404 there would look like a broken link rather than an
 * un-migrated database.
 */
export default async function ExpertThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect(`/login?next=/dashboard/expert/messages/${threadId}`);

  // Already read by the layout's ownership gate and memoised for the request,
  // so this narrows rather than re-queries.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();

  const [thread, threads, bookings] = await Promise.all([
    getThread(threadId, user.id),
    listThreads(user.id),
    listExpertBookings(shop.id, { limit: SHOP_BOOKING_SCAN }),
  ]);

  const byBookingId = new Map(bookings.map((booking) => [booking.id, booking]));
  const shopThreads = threads.filter((entry) => byBookingId.has(entry.bookingId));

  /**
   * `viewerIsShop` is the second gate and it is not redundant.
   *
   * A shop owner who books a repair elsewhere is a party to that thread too, so
   * RLS lets `getThread` return it — but reading it *here* would put a "mark
   * complete" panel on somebody else's shop's job. Their own customer threads
   * live under `/dashboard/messages`, which is where this sends them.
   */
  const shopThread = thread?.viewerIsShop ? thread : null;
  const booking = shopThread ? (byBookingId.get(shopThread.bookingId) ?? null) : null;

  // Depends on the booking, so it cannot join the batch above. One round-trip,
  // and a shop with no note on this job gets null rather than an error.
  const note = booking ? await getBookingNote(booking.id) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
      <div className="hidden overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench lg:block">
        <ThreadList
          threads={shopThreads}
          activeThreadId={threadId}
          now={now}
          basePath="/dashboard/expert/messages"
        />
      </div>

      {shopThread ? (
        <>
          <MessagePane
            thread={shopThread}
            now={now}
            viewerId={user.id}
            viewerName={user.displayName}
            viewerAvatar={user.avatarUrl}
            backHref="/dashboard/expert/messages"
          />

          {/* The panel is a third column on a wide screen and the next block
              down on anything narrower — it collapses under the conversation
              rather than disappearing, because the job is the point of the
              conversation. The explicit placement is what stops it landing
              beneath the rail at `lg`, where the grid has only two columns. */}
          {booking ? (
            <CompletionPanel
              bookingId={booking.id}
              fixerId={shop.id}
              reference={booking.reference}
              status={booking.status}
              customerName={booking.customer?.display_name ?? "Customer"}
              customerPhone={booking.customer?.phone ?? null}
              serviceName={booking.service?.name ?? null}
              deliveryMode={booking.delivery_mode}
              slot={booking.slot}
              timezone={shop.timezone}
              grossPence={grossPence(booking)}
              netPence={netPence(booking)}
              currency={booking.currency}
              warrantyDays={booking.warranty_days}
              warrantyExpiresAt={booking.warranty_expires_at}
              note={note?.body ?? ""}
              actions={allowedActions(booking, "shop", now)}
              now={now}
              className="lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100vh-13rem)] xl:overflow-y-auto"
            />
          ) : (
            <div className="lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1">
              <EmptyState
                icon={Wrench}
                title="Job unavailable"
                description="This conversation is attached to a booking that is no longer on your shop's list, so there is nothing to fulfil against. You can still read and reply."
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4 lg:col-start-2">
          <Link
            href="/dashboard/expert/messages"
            className="inline-flex items-center gap-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            All conversations
          </Link>

          <EmptyState
            icon={MessagesSquare}
            title="Not one of your shop's conversations"
            description="This thread is either closed, not yours, or one where you are the customer rather than the shop. Your own bookings with other shops live in your customer inbox."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/expert/messages">Back to client inbox</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/messages">Your customer inbox</Link>
                </Button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * Gross in pence, mirroring `expert.ts`.
 *
 * `final_amount` wins because a job that came in over or under the quote
 * settles at the final figure; falling back to the quote stops a job that has
 * not been finalised yet from reading as £0.
 */
function grossPence(booking: {
  quoted_amount: number | null;
  final_amount: number | null;
}): number {
  return booking.final_amount ?? booking.quoted_amount ?? 0;
}

/**
 * What a payout on this job would actually carry: gross less the platform's
 * cut. Floored at zero — a fee larger than the price is a reconciliation
 * problem for the ledger, not a negative number to put in a confirmation
 * dialog.
 */
function netPence(booking: {
  quoted_amount: number | null;
  final_amount: number | null;
  platform_fee: number;
}): number {
  return Math.max(0, grossPence(booking) - booking.platform_fee);
}
