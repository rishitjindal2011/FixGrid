"use client";

import { useActionState } from "react";
import { NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveClientNote } from "@/lib/dashboard/expert-actions";
import { formatRelative } from "@/lib/format";
import type { ClientNoteRow } from "@/lib/types/marketplace";

/**
 * The shop's private notes on one client.
 *
 * Client-side only because of `useActionState` — a note that vanishes on save
 * with no confirmation reads as data loss, and the shop needs to know the write
 * landed before navigating away.
 *
 * The privacy label is not decoration. These rows live in `client_notes` behind
 * an owner-only policy precisely so the customer can never read them, and a shop
 * writing "difficult, always haggles" needs to be certain about that before they
 * type it. Saying so once, plainly, next to the box is the whole point.
 */
type NoteState = Awaited<ReturnType<typeof saveClientNote>>;

const IDLE: NoteState = { error: null, success: false };

export function ClientNotes({
  fixerId,
  customerId,
  notes,
}: {
  fixerId: string;
  customerId: string;
  notes: ClientNoteRow[];
}) {
  const [state, formAction, pending] = useActionState(saveClientNote, IDLE);

  return (
    <section className="rounded-machined border border-hairline bg-chalk shadow-bench">
      <header className="flex items-start gap-3 border-b border-hairline px-4 py-3">
        <NotebookPen aria-hidden className="mt-0.5 size-4 shrink-0 text-steel" />
        <div>
          <h2 className="font-display text-sm uppercase tracking-wide text-enamel">
            Private notes
          </h2>
          <p className="text-xs text-steel">
            Only you and your staff can read these. The customer never sees them.
          </p>
        </div>
      </header>

      <form action={formAction} className="flex flex-col gap-3 border-b border-hairline p-4">
        <input type="hidden" name="fixerId" value={fixerId} />
        <input type="hidden" name="customerId" value={customerId} />

        <label htmlFor="client-note" className="sr-only">
          Add a note about this client
        </label>
        <Textarea
          id="client-note"
          name="body"
          rows={3}
          maxLength={4000}
          required
          placeholder="Prefers a call before collection. Bought the extended warranty in March."
        />

        {state.error ? (
          <p role="alert" className="text-xs text-rust">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-xs text-verdigris">
            Note saved.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Add note"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-steel">
          No notes yet.
        </p>
      ) : (
        <ul className="divide-y divide-hairline">
          {notes.map((note) => (
            <li key={note.id} className="px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-enamel">{note.body}</p>
              <p className="mt-1 font-mono text-xs text-steel-soft">
                {formatRelative(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
