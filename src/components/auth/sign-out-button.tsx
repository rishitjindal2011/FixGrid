"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

function Inner({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <LogOut aria-hidden />
      {pending ? "Signing out…" : label}
    </Button>
  );
}

/**
 * A form rather than an onClick handler: sign-out mutates session state, so it
 * must not be reachable by a GET. A prefetch or a link-scanner would otherwise
 * be able to sign a user out just by looking at the page.
 */
export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <Inner label={label} />
    </form>
  );
}
