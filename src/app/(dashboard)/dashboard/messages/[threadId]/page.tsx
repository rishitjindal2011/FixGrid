import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MessagesSquare } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { MessagePane } from "@/components/dashboard/message-pane";
import { ThreadList } from "@/components/dashboard/thread-list";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getThread, listThreads } from "@/lib/dashboard/messages";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

/**
 * One conversation.
 *
 * Desktop keeps the inbox rail beside it so switching threads is one click;
 * mobile shows only this pane, with a back link to `/dashboard/messages`. Both
 * come out of the same tree — the rail is simply `hidden lg:block`, which is
 * cheaper and far less fragile than a second mobile-only component.
 *
 * `notFound()` is deliberately not called on a missing thread. `getThread`
 * returns null for "no such thread", "RLS refused it" and "the table does not
 * exist yet" alike, and the last of those is the state this app is in before
 * the migration runs — a 404 there would look like a broken link rather than an
 * un-migrated database. The empty state says what happened and offers the way
 * back.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect(`/login?next=/dashboard/messages/${threadId}`);

  const now = new Date();

  // Independent reads: the rail does not depend on which thread is open.
  const [thread, threads] = await Promise.all([
    getThread(threadId, user.id),
    listThreads(user.id),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="hidden overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench lg:block">
        <ThreadList threads={threads} activeThreadId={threadId} now={now} />
      </div>

      {thread ? (
        <MessagePane
          thread={thread}
          now={now}
          viewerId={user.id}
          viewerName={user.displayName}
          viewerAvatar={user.avatarUrl}
          backHref="/dashboard/messages"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/messages"
            className="inline-flex items-center gap-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            All conversations
          </Link>

          <EmptyState
            icon={MessagesSquare}
            title="Conversation unavailable"
            description="This thread has either been closed or is not one of yours. Your other conversations are all still here."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/messages">Back to inbox</Link>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
