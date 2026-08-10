"use client";

import { useActionState } from "react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The heart toggle on an expert card.
 *
 * The action is a prop rather than an import so this component stays ignorant
 * of where the write lives: it is a two-state toggle over a server action, and
 * the only thing it needs to know is what the server said the state is now.
 *
 * `useActionState` — not `useOptimistic` — because the truthful answer here is
 * cheap. The write is a single row against `saved_experts`, and a heart that
 * fills instantly and then quietly empties again when RLS rejects it is worse
 * than one that takes 200ms and is right. The returned state is authoritative;
 * the `saved` prop only seeds it.
 */

export interface SaveExpertState {
  saved: boolean;
  error: string | null;
}

/** Shape of the server action this button drives, for the page that supplies it. */
export type ToggleSavedExpert = (
  prev: SaveExpertState,
  formData: FormData,
) => Promise<SaveExpertState>;

export function SaveExpertButton({
  fixerId,
  shopName,
  saved,
  action,
  className,
}: {
  fixerId: string;
  shopName: string;
  saved: boolean;
  action: ToggleSavedExpert;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { saved, error: null });

  const label = state.saved
    ? `Remove ${shopName} from your saved shops`
    : `Save ${shopName} to your shops`;

  return (
    <form action={formAction} className={cn("contents", className)}>
      <input type="hidden" name="fixerId" value={fixerId} />
      {/* The server toggles against what the client last saw, so a double-tap
          lands on one state rather than racing between two. */}
      <input type="hidden" name="saved" value={state.saved ? "1" : "0"} />

      <button
        type="submit"
        disabled={pending}
        aria-pressed={state.saved}
        title={label}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-machined border transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          state.saved
            ? "border-signal/30 bg-signal-wash text-signal hover:bg-signal-wash/70"
            : "border-hairline bg-chalk text-steel-soft hover:border-steel-soft hover:text-signal",
        )}
      >
        <Heart aria-hidden className={cn("size-4", state.saved && "fill-signal")} />
        <span className="sr-only">{label}</span>
      </button>

      {/* Announced, not drawn: a failed save is worth telling a screen reader
          about, but a red box hanging off a card in a grid is not. */}
      <span aria-live="polite" className="sr-only">
        {state.error ?? ""}
      </span>
    </form>
  );
}
