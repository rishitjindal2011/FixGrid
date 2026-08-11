"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";

import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: LoginState = { error: null };

/**
 * `useFormStatus` has to read from a component *inside* the form, which is the
 * only reason this is split out. It gives a real pending state without tracking
 * one by hand, and disabling on submit is what stops an impatient double-click
 * from spending two bcrypt comparisons and eating two throttle attempts.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Checking…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="eyebrow">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          spellCheck={false}
          placeholder="you@vytron.me"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="eyebrow">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {/*
        `role="alert"` and `aria-live` so the failure is announced rather than
        only appearing. The message itself never says which field was wrong —
        see the no-enumeration note in the login action.
      */}
      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
