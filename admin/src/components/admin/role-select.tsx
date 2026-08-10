"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { setUserRole } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import type { PlatformRole } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

/**
 * Change an account's role, in place in the table row.
 *
 * Submits on change rather than behind a save button. There is one field and no
 * way to get it wrong beyond picking the wrong option — which a save button does
 * not prevent — so the extra click buys nothing.
 *
 * Owner-only server-side. A viewer or editor gets the refusal as a message here;
 * hiding the control for them would be friendlier, but the page cannot know the
 * session role without threading it through every row, and the action has to
 * check regardless. The message is the honest fallback.
 */
export function RoleSelect({
  userId,
  role,
  disabled = false,
}: {
  userId: string;
  role: PlatformRole;
  /** True for viewers and editors — the action would refuse anyway. */
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(setUserRole, ADMIN_INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex items-center gap-1.5">
        {pending ? (
          <Loader2 aria-hidden className="size-3.5 animate-spin text-steel" />
        ) : null}

        <label className="sr-only" htmlFor={`role-${userId}`}>
          Role
        </label>
        <select
          id={`role-${userId}`}
          name="role"
          defaultValue={role}
          disabled={disabled || pending}
          // Native `<select>`: this posts inside an uncontrolled form and needs
          // no composed content, which is exactly the case the styled listbox is
          // the wrong tool for.
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className={cn(
            "rounded-machined border border-hairline bg-chalk px-2 py-1",
            "font-display text-xs uppercase tracking-wide text-enamel",
            "focus-visible:border-signal focus-visible:outline-none",
            "disabled:opacity-50",
          )}
        >
          <option value="customer">Customer</option>
          <option value="fixer">Fixer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {state.error ? (
        <p role="alert" className="max-w-[16rem] text-right text-xs text-rust">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p aria-live="polite" className="text-right text-xs text-verdigris">
          Saved
        </p>
      ) : null}
    </form>
  );
}
