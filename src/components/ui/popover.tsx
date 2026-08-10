"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Anchored floating panel for arbitrary content — a filter form, a date range,
 * a confirmation.
 *
 * `@radix-ui/react-popover` is deliberately NOT a dependency of this app, so this
 * is composed from the dropdown-menu primitive, which already carries the parts
 * that are genuinely hard to write: Popper anchoring with collision flipping, the
 * portal, the focus scope, outside-click dismissal and Escape.
 *
 * Three menu-specific behaviours have to be undone for non-menu content — see
 * `PopoverContent`. If `react-popover` is ever added to package.json, this file
 * should be swapped to it wholesale; the exported API below is deliberately the
 * same shape, so no call site would change.
 */

type PopoverContextValue = { close: () => void };

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export function Popover({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  // Mirrors Radix's own controllable-state contract: `open` wins when provided,
  // otherwise we hold it. Derived during render — never synced in an effect,
  // which `react-hooks/set-state-in-effect` would reject outright.
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const context = React.useMemo<PopoverContextValue>(
    () => ({ close: () => setOpen(false) }),
    [setOpen],
  );

  return (
    <PopoverContext.Provider value={context}>
      <DropdownMenuPrimitive.Root open={isOpen} onOpenChange={setOpen} {...props}>
        {children}
      </DropdownMenuPrimitive.Root>
    </PopoverContext.Provider>
  );
}

/**
 * The primitive trigger hard-codes `aria-haspopup="menu"`, which would contradict
 * the `role="dialog"` on the content and tell assistive tech to expect a menu.
 * `triggerProps` spreads after it, so overriding here is enough.
 */
export const PopoverTrigger = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(function PopoverTrigger(props, ref) {
  return <DropdownMenuPrimitive.Trigger ref={ref} aria-haspopup="dialog" {...props} />;
});

export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function PopoverContent({ className, children, sideOffset = 6, align = "start", ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        // 1 & 2. The primitive hard-codes role="menu" and aria-orientation on the
        // Popper element, then spreads these props over them. A panel holding a
        // form is not a menu, and announcing it as one sends screen-reader users
        // looking for menu items that do not exist.
        role="dialog"
        aria-orientation={undefined}
        className={cn(
          "z-50 min-w-56 rounded-machined border border-hairline bg-chalk p-4 shadow-lift",
          "max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto",
          "focus:outline-none",
          className,
        )}
        {...props}
      >
        {/* 3. The menu's own keydown handler swallows Tab (menus close on it) and
            routes every printable character into typeahead. Both are wrong here:
            they make a text input inside the popover untypable and trap keyboard
            users on the first field. Stopping those two key classes before they
            reach the Content element restores normal form behaviour. Escape and
            the arrow keys are let through so dismissal still works. */}
        <div
          onKeyDown={(event) => {
            const isPrintable =
              event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
            if (event.key === "Tab" || isPrintable) event.stopPropagation();
          }}
        >
          {children}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

/**
 * Dismiss button. The menu primitive's `Close` equivalent is `Item`, which would
 * reintroduce `role="menuitem"`, so this closes through context instead.
 */
export const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(
  function PopoverClose({ asChild = false, onClick, ...props }, ref) {
    const context = React.useContext(PopoverContext);
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) context?.close();
        }}
        {...props}
      />
    );
  },
);

export function PopoverHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-3 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel", className)}
      {...props}
    />
  );
}

export function PopoverFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-col-reverse gap-2 border-t border-hairline pt-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
