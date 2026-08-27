import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MessagesSquare, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { ThreadList } from "@/components/dashboard/thread-list";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listThreads } from "@/lib/dashboard/messages";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

/**
 * The inbox, for whichever side of a booking is looking.
 *
 * `listThreads` resolves "the other party" per viewer, so this one page is the
 * customer's inbox and the shop's inbox — there is no second implementation
 * under the expert routes, and no branch on who is signed in.
 *
 * On a phone this is the whole screen and a thread is the next one. On desktop
 * the list is the left rail and the right pane is a prompt to pick something;
 * `messages/[threadId]` renders the same rail with a conversation beside it.
 * That is why the mobile pattern is a route and not a drawer: one URL per
 * conversation, a working back button, and a link you can send someone.
 */
export default async function MessagesPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/messages");

  const now = new Date();
  const threads = await listThreads(user.id);

  const unreadTotal = threads.reduce((total, thread) => total + thread.unreadCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Messages"
        title="Inbox"
        description={
          unreadTotal > 0
            ? `${unreadTotal} unread ${unreadTotal === 1 ? "message" : "messages"} across your bookings.`
            : "Every conversation is attached to a booking, so nothing arrives out of context."
        }
      />

      {threads.length === 0 ? (
        /* Also the state before the migration has run: `listThreads` degrades to
           an empty array on a missing table, so this page explains itself rather
           than failing. */
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Messaging opens as soon as you make a booking — it is attached to the job, so the shop always knows which repair you mean."
          action={
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/discover">
                <Search aria-hidden />
                Find an expert
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
            <ThreadList threads={threads} now={now} />
          </div>

          {/* Desktop only: on a phone the list *is* the page, and an empty pane
              underneath it would just be dead scroll. */}
          <div className="hidden lg:block">
            <EmptyState
              icon={MessagesSquare}
              title="Pick a conversation"
              description="Choose a thread on the left to read it and reply."
              className="h-full justify-center"
            />
          </div>
        </div>
      )}
    </div>
  );
}
