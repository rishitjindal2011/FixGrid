"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Lock, MessagesSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addDisputeMessage } from "@/lib/bookings/actions";
import type { DisputeMessageEntry } from "@/lib/dashboard/warranty";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The claim transcript, and the box for adding to it.
 *
 * A claim is append-only by policy — `policies-marketplace.sql` revokes update
 * and delete on `disputes` from `authenticated` — so this is a transcript, not
 * an editor. Nothing here offers to change a message that has been sent, and
 * the read-only variant is the honest rendering of a resolved claim rather than
 * a disabled input that hints the decision is still up for discussion.
 *
 * The reply box is uncontrolled. React 19 resets a form after its action
 * resolves, which clears the textarea without a `setState` in an effect —
 * exactly the pattern `react-hooks/set-state-in-effect` exists to prevent.
 */

type MessageState = Awaited<ReturnType<typeof addDisputeMessage>>;

const INITIAL_STATE = { error: null, success: false } as MessageState;

function ReplyButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending…" : "Send reply"}
    </Button>
  );
}

function Message({ message, now }: { message: DisputeMessageEntry; now: Date }) {
  const mine = message.isMine;

  return (
    <li className={cn("flex flex-col gap-1.5", mine && "items-end")}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
          {message.authorName}
        </span>
        {message.authorRole === "admin" ? <Badge variant="solid">FixGrid team</Badge> : null}
        <time
          dateTime={message.createdAt}
          title={formatDateTime(message.createdAt)}
          className="font-mono text-eyebrow tabular-nums text-steel-soft"
        >
          {formatRelative(message.createdAt, now)}
        </time>
      </div>

      <div
        className={cn(
          "max-w-[46ch] rounded-machined border px-3.5 py-2.5 text-sm leading-relaxed",
          mine
            ? "border-hairline bg-bench text-enamel"
            : message.authorRole === "admin"
              ? "border-enamel/25 bg-chalk text-enamel"
              : "border-hairline bg-chalk text-enamel",
        )}
      >
        {/* Stored as plain text and rendered as plain text. `whitespace-pre-wrap`
            keeps the customer's own line breaks without letting markup in. */}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
      </div>
    </li>
  );
}

export function DisputeThread({
  disputeId,
  messages,
  now,
  readOnly = false,
  className,
}: {
  disputeId: string;
  messages: DisputeMessageEntry[];
  now: Date;
  /** True once the claim is settled — the transcript stays, the box goes. */
  readOnly?: boolean;
  className?: string;
}) {
  const [state, formAction] = useActionState(addDisputeMessage, INITIAL_STATE);

  return (
    <section
      className={cn(
        "rounded-machined border border-hairline bg-chalk shadow-bench",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-3.5">
        <MessagesSquare aria-hidden className="size-4 text-steel-soft" />
        <h2 className="font-display text-lg uppercase tracking-wide text-enamel">Thread</h2>
        <span className="font-mono text-eyebrow tabular-nums text-steel-soft">
          {messages.length}
        </span>
      </div>

      {messages.length > 0 ? (
        <ul className="flex flex-col gap-5 p-5">
          {messages.map((message) => (
            <Message key={message.id} message={message} now={now} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-steel">
          Nothing here yet. Your claim has been sent to the shop and to our team — replies
          appear in this thread.
        </p>
      )}

      {readOnly ? (
        <p className="flex items-start gap-2 border-t border-hairline bg-bench px-5 py-4 text-sm text-steel">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          This claim is closed, so the thread is read-only. If something is still wrong, raise
          a new claim while the warranty is open, or message the shop directly.
        </p>
      ) : (
        <form action={formAction} className="border-t border-hairline p-5">
          <input type="hidden" name="disputeId" value={disputeId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="claim-reply" className="eyebrow">
              Add to the claim
            </label>
            <Textarea
              id="claim-reply"
              name="body"
              rows={3}
              required
              maxLength={4000}
              placeholder="Anything new — what the shop has said, what you have tried, what changed."
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="mt-3 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-steel">Both the shop and our team can read this.</p>
            <ReplyButton />
          </div>
        </form>
      )}
    </section>
  );
}
