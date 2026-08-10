"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Off-canvas panel — the dashboard sidebar under `md`, and filter panels on
 * mobile.
 *
 * Built on Radix Dialog rather than a second primitive: a sheet *is* a modal
 * dialog that happens to be edge-anchored, and it needs the same focus trap,
 * scroll lock and Escape handling. Sharing the primitive means those behave
 * identically in both, which is the whole reason not to hand-roll it.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SIDES = {
  left: "inset-y-0 left-0 h-full w-[min(20rem,85vw)] border-r data-[state=closed]:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-[min(20rem,85vw)] border-l data-[state=closed]:translate-x-full",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] w-full border-t data-[state=closed]:translate-y-full",
} as const;

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof SIDES;
  hideClose?: boolean;
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent(
  { className, children, side = "left", hideClose = false, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-enamel/40 transition-opacity duration-200",
          "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col overflow-y-auto border-hairline bg-chalk shadow-lift",
          "transition-transform duration-200 ease-out focus:outline-none",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}

        {hideClose ? null : (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 grid size-8 place-items-center rounded-machined",
              "text-steel transition-colors hover:bg-bench hover:text-enamel",
            )}
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-hairline p-5 pr-12", className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn("font-display text-display-sm uppercase text-enamel", className)}
      {...props}
    />
  );
});

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm leading-relaxed text-steel", className)}
      {...props}
    />
  );
});
