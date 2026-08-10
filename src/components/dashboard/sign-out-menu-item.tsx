"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";

/**
 * Sign out, from inside a dropdown menu.
 *
 * The obvious version — a `<form action={signOut}>` wrapping a submit button —
 * does not work here, and the reason is worth recording because it looks
 * correct and silently does nothing:
 *
 * Radix closes the menu on select, which unmounts `DropdownMenuContent` and the
 * form inside it. The unmount happens in the same tick as the click, before the
 * browser dispatches the form's submit event, so the request is never made. The
 * same markup works fine in the marketing header (`SignOutButton`) because
 * nothing there unmounts it.
 *
 * So the action is called directly instead. `onSelect` still lets the menu
 * close — keeping it open while navigating away looks broken — but the call is
 * already in flight by then, and `useTransition` keeps it alive across the
 * unmount rather than tying it to a DOM node that is about to disappear.
 */
export function SignOutMenuItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      tone="danger"
      disabled={pending}
      onSelect={() => {
        startTransition(async () => {
          await signOut();
        });
      }}
    >
      <LogOut aria-hidden className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </DropdownMenuItem>
  );
}
