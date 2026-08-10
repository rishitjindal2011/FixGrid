"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Modal dialog, built on the native `<dialog>` element.
 *
 * Not Radix. `showModal()` gives the focus trap, the inert background, the
 * top-layer stacking and Escape-to-close in the platform rather than in
 * JavaScript — all of which are easy to write badly by hand and impossible to
 * notice are wrong until someone using a keyboard is stuck inside a confirm
 * step. The one thing it does not give is a controlled `open` prop, which is
 * what the effect below supplies.
 *
 * Motion is a plain CSS transition on the backdrop; the global
 * `prefers-reduced-motion` block in globals.css collapses it. There is no
 * animation library in this app and `animate-in`-style utilities would silently
 * generate nothing.
 *
 * Usage — the caller owns the state:
 *
 *   const [open, setOpen] = useState(false);
 *   <Dialog open={open} onClose={() => setOpen(false)} labelledBy="refund-title">
 *     <DialogHeader><DialogTitle id="refund-title">Refund</DialogTitle></DialogHeader>
 *     <DialogBody>…</DialogBody>
 *     <DialogFooter>…</DialogFooter>
 *   </Dialog>
 */
export interface DialogProps extends Omit<React.ComponentProps<"dialog">, "open" | "onClose"> {
  open: boolean;
  /** Fired for every dismissal route: Escape, backdrop click, `DialogCloseButton`. */
  onClose: () => void;
  /** `id` of the `DialogTitle`. Without it the dialog has no accessible name. */
  labelledBy?: string;
  /** Hide the corner close button when the dialog must be answered, not dismissed. */
  hideClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  labelledBy,
  hideClose = false,
  className,
  children,
  ...props
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  /*
   * Drive the element imperatively from the `open` prop. This sets no state —
   * `react-hooks/set-state-in-effect` is an error in this project, and a
   * dialog that mirrors its own prop into state would be exactly that.
   *
   * `showModal()` throws if the element is already open, so both calls are
   * guarded on the element's own `open` attribute rather than on the prop.
   */
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /*
   * The native `close` event fires for every dismissal, including the Escape
   * key, which never passes through React. Listening here is what keeps the
   * caller's state in step when the platform closes the dialog behind our back.
   */
  const handleClose = React.useCallback(() => {
    if (open) onClose();
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      /*
       * Backdrop click. A native modal's backdrop is part of the <dialog>
       * element itself, so a click that lands on it has the dialog as its
       * target; a click on any content has a child as its target. That identity
       * check is the whole test — no separate overlay element, and nothing to
       * `stopPropagation` on the way up.
       */
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={labelledBy}
      /*
       * A native modal fills nothing by default and inherits no page styles, so
       * position, size and the backdrop are all spelled out. `p-0` overrides the
       * UA's 1em padding, which would otherwise sit outside the card border.
       */
      className={cn(
        "fixed left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 p-0",
        "w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto",
        "rounded-machined border border-hairline bg-chalk text-enamel shadow-lift",
        "backdrop:bg-enamel/40 backdrop:transition-opacity backdrop:duration-150",
        className,
      )}
      {...props}
    >
      {children}

      {hideClose ? null : (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-3 top-3 grid size-8 place-items-center rounded-machined",
            "text-steel transition-colors hover:bg-bench hover:text-enamel",
          )}
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      )}
    </dialog>
  );
}

/**
 * Open state for a dialog that wraps a server action, closing itself once that
 * action reports success.
 *
 * The obvious version of this is `if (state.success) { setOpen(false);
 * state.success = false }` — and it does work, because `useActionState` hands
 * back the same object until the next result arrives, so the mutation stops the
 * condition firing twice. It is still writing to state React owns, which the
 * React compiler is entitled to break, and it makes a successful action
 * unrepeatable if the object is ever frozen.
 *
 * Acknowledging the result *object* instead gets the same convergence from
 * identity: a second success is a new object, so the dialog closes again.
 *
 * The update runs during render rather than in an effect deliberately —
 * `react-hooks/set-state-in-effect` is an error in this project, and an effect
 * would also paint one frame of an open dialog over a completed action.
 */
export function useCloseOnSuccess<S extends { success?: boolean }>(state: S) {
  const [open, setOpen] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState<S | null>(null);

  if (state.success && state !== acknowledged) {
    setAcknowledged(state);
    if (open) setOpen(false);
  }

  return [open, setOpen] as const;
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 border-b border-hairline p-5 pr-12", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("font-display text-display-sm uppercase text-enamel", className)} {...props} />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-steel", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Reversed on mobile so the confirming action sits under the thumb and
        // "Cancel" is not the first thing a stray tap lands on.
        "flex flex-col-reverse gap-2 border-t border-hairline p-5 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
