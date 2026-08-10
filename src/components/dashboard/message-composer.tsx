"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Paperclip, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/bookings/actions";
import { cn } from "@/lib/utils";

/**
 * The reply box.
 *
 * Three constraints shape it, and they pull against each other:
 *
 *   1. **The message must appear instantly.** A chat that waits for a round-trip
 *      before showing what you typed reads as broken. `useOptimistic` lives in
 *      `MessagePane` (it owns the transcript); the draft is handed up through
 *      `onOptimistic`, called *inside* the action so React holds the optimistic
 *      entry for exactly as long as the action runs and drops it the moment the
 *      server's copy arrives.
 *
 *   2. **No `setState` in an effect.** `react-hooks/set-state-in-effect` is an
 *      error in this config, and clearing the box by watching the action state
 *      is the textbook way to trip it. The box is cleared inside the action
 *      instead — after the send resolves, and only when it resolved cleanly, so
 *      a failed send does not eat what someone typed.
 *
 *   3. **Enter sends.** With Shift+Enter for a newline, and never mid-IME
 *      composition, where Enter is committing a candidate rather than a message.
 */

/**
 * The action module is authored separately from this component, so the composer
 * reads exactly one field of its state — the error to show — and takes the rest
 * of the type from the action itself. The idle value is asserted for the same
 * reason: a field added to the action's state should not need an edit here.
 */
type SendState = Awaited<ReturnType<typeof sendMessage>>;
const IDLE_STATE = { error: null, success: false } as SendState;

/** Matches the composer's own guard on the server: an empty body is not a message. */
const MAX_BODY = 4000;

export interface OptimisticDraft {
  body: string;
  attachmentNames: string[];
}

export function MessageComposer({
  threadId,
  onOptimistic,
  className,
}: {
  threadId: string;
  /**
   * Hands the draft to the transcript so it can render immediately. Called
   * inside the action on purpose — see the note above.
   */
  onOptimistic: (draft: OptimisticDraft) => void;
  className?: string;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  // Controlled, so that clearing is a state change we own rather than React 19's
  // automatic form reset — which fires whether the send worked or not.
  const [body, setBody] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  // Bumped to remount the file input, the only way to clear a file control.
  const [fileKey, setFileKey] = React.useState(0);

  const [state, formAction, pending] = React.useActionState<SendState, FormData>(
    async (previous, formData) => {
      const draft = String(formData.get("body") ?? "").trim();

      // The state list is the source of truth for attachments — chips can be
      // removed individually, which a FileList cannot express.
      formData.delete("attachments");
      for (const file of files) formData.append("attachments", file);

      onOptimistic({ body: draft, attachmentNames: files.map((file) => file.name) });

      const result = await sendMessage(previous, formData);

      if (!result.error) {
        setBody("");
        setFiles([]);
        setFileKey((key) => key + 1);
        // The action revalidates, but refreshing from inside the action keeps
        // the transition open until the server's transcript has landed — so the
        // optimistic bubble is replaced rather than blinking out and back.
        router.refresh();
      }

      return result;
    },
    IDLE_STATE,
  );

  const empty = body.trim().length === 0;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // `isComposing` guards IME input, where Enter accepts a candidate.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (empty || pending) return;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn("border-t border-hairline bg-chalk p-3", className)}
    >
      <input type="hidden" name="threadId" value={threadId} />

      {state.error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-2 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-sm text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2 py-1 text-xs text-steel"
            >
              <Paperclip aria-hidden className="size-3 shrink-0" />
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                className="rounded-machined text-steel-soft transition-colors hover:text-rust"
              >
                <X aria-hidden className="size-3" />
                <span className="sr-only">Remove {file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-2">
        <label htmlFor="message-body" className="sr-only">
          Your message
        </label>
        <textarea
          id="message-body"
          name="body"
          rows={1}
          maxLength={MAX_BODY}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          className={cn(
            "max-h-40 min-h-10 w-full flex-1 resize-none rounded-machined border border-hairline bg-chalk px-3 py-2",
            "text-[0.95rem] leading-relaxed text-enamel field-sizing-content",
            "placeholder:text-steel-soft focus:border-signal focus:outline-none",
          )}
        />

        <label
          className={cn(
            "grid size-10 shrink-0 cursor-pointer place-items-center rounded-machined border border-hairline bg-chalk text-steel",
            "transition-colors hover:border-steel-soft hover:text-enamel",
            "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal",
          )}
        >
          <Paperclip aria-hidden className="size-4" />
          <span className="sr-only">Attach a file</span>
          <input
            key={fileKey}
            type="file"
            name="attachments"
            multiple
            onChange={(event) =>
              setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])
            }
            className="sr-only"
          />
        </label>

        <Button type="submit" size="icon" disabled={pending || empty} aria-label="Send message">
          <SendHorizontal aria-hidden />
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">
        {pending ? "Sending your message" : ""}
      </p>
    </form>
  );
}
