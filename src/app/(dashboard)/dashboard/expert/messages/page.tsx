import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Inbox, MessagesSquare } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { ThreadList } from "@/components/dashboard/thread-list";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listExpertBookings } from "@/lib/dashboard/expert";
import { listThreads } from "@/lib/dashboard/messages";

export const metadata: Metadata = {
  title: "Client inbox",
  robots: { index: false, follow: false },
};

/**
 * How many of the shop's bookings are read to scope the inbox.
 *
 * `listThreads` is scoped by RLS to every thread the caller is a party to,
 * which for a shop owner who also books repairs of their own includes threads
 * where they are the *customer*. Those belong in `/dashboard/messages`, not
 * here: this screen carries a fulfilment panel and a "mark complete" button.
 *
 * `ThreadSummary` exposes `bookingId` and nothing about which side the viewer
 * is on, so the shop's own booking ids are the filter. The ceiling is generous
 * because `listThreads` returns at most 50 rows anyway — the list only has to
 * be wide enough to recognise them, and the same read supplies the job under
 * discussion on the conversation screen.
 */
const SHOP_BOOKING_SCAN = 500;

/**
 * The shop's client inbox.
 *
 * Deliberately the same rail, the same reads and the same conversation
 * components as the customer's inbox — `listThreads` already resolves "the
 * other party" per viewer, so a shop owner sees customer names here with
 * nothing to branch on. The only two differences are the scoping above and
 * where a row leads: `/dashboard/expert/messages/[threadId]` adds the
 * fulfilment panel, which the customer must never see.
 *
 * On a phone this list is the whole screen and a conversation is the next one.
 * On desktop the list is the left rail. That is why the mobile pattern is a
 * route and not a drawer: one URL per conversation, a working back button, and
 * a link that can be sent to whoever is on the bench.
 */
export default async function ExpertMessagesPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/expert/messages");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this narrows rather than re-queries. A null shop cannot reach here — the
  // gate renders the claim screen in place of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();

  // Independent reads: neither depends on the other's answer.
  const [threads, bookings] = await Promise.all([
    listThreads(user.id),
    listExpertBookings(shop.id, { limit: SHOP_BOOKING_SCAN }),
  ]);

  const shopBookings = new Set(bookings.map((booking) => booking.id));
  const shopThreads = threads.filter((thread) => shopBookings.has(thread.bookingId));

  const unreadTotal = shopThreads.reduce((total, thread) => total + thread.unreadCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={shop.shopName}
        title="Client inbox"
        description={
          unreadTotal > 0
            ? `${unreadTotal} unread ${unreadTotal === 1 ? "message" : "messages"} across your jobs. Every conversation opens with the booking it belongs to, so you can answer and update the job in one place.`
            : "Every conversation here is attached to one of your bookings, so nothing arrives without a job behind it. Open one to reply and to work the job alongside it."
        }
      />

      {shopThreads.length === 0 ? (
        /* Also the state before the migration has run: both reads degrade to an
           empty array on a missing table, so this page explains itself rather
           than failing. */
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="A thread opens the moment a customer requests a repair from you, and it stays attached to that job for its whole life — through the quote, the bench and the warranty window."
          action={
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/expert/requests">
                <Inbox aria-hidden />
                Open requests
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
            <ThreadList
              threads={shopThreads}
              now={now}
              basePath="/dashboard/expert/messages"
            />
          </div>

          {/* Desktop only: on a phone the list *is* the page, and an empty pane
              underneath it would just be dead scroll. */}
          <div className="hidden lg:block">
            <EmptyState
              icon={MessagesSquare}
              title="Pick a conversation"
              description="Opening one puts the job beside it — the slot, the price, your private note, completion photos and every move the booking can legally make next."
              className="h-full justify-center"
            />
          </div>
        </div>
      )}
    </div>
  );
}
