"use client";

import { useActionState } from "react";
import { BadgeCheck, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { verifyShop } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";

/**
 * The verified-tick toggle.
 *
 * A form rather than a button with an onClick because the write is a server
 * action and this keeps it working without JavaScript. `useActionState` is here
 * only to surface the refusal — a viewer who somehow reaches this control gets a
 * sentence instead of a silent no-op.
 */
export function VerifyToggle({
  fixerId,
  verified,
}: {
  fixerId: string;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState(verifyShop, ADMIN_INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="fixerId" value={fixerId} />
      <input type="hidden" name="verified" value={verified ? "0" : "1"} />

      <Button type="submit" variant={verified ? "outline" : "secondary"} size="sm" disabled={pending}>
        {verified ? (
          <>
            <ShieldOff aria-hidden className="size-4" />
            {pending ? "Removing…" : "Remove verification"}
          </>
        ) : (
          <>
            <BadgeCheck aria-hidden className="size-4" />
            {pending ? "Verifying…" : "Verify this shop"}
          </>
        )}
      </Button>

      {state.error ? (
        <p role="alert" className="text-xs text-rust">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs text-verdigris">
          {state.message ?? "Saved."}
        </p>
      ) : null}
    </form>
  );
}
