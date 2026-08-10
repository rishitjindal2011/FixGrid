"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * `useFormStatus` reads from the nearest enclosing form, so this has to be a
 * separate component rendered inside it.
 *
 * Disabling while pending is not only polish: an impatient double-click would
 * otherwise spend two auth round-trips and two throttle attempts against the
 * per-IP cap in `lib/auth/actions.ts`.
 */
export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
