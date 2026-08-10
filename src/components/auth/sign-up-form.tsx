"use client";

import { useActionState } from "react";

import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signUp, AUTH_INITIAL_STATE);

  // On success the action returns a notice and the form stays mounted. Hiding
  // the fields stops the user re-submitting and burning throttle attempts while
  // they go looking for the confirmation email.
  if (state.notice) {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage state={state} />
        <p className="text-sm leading-relaxed text-steel">
          Didn&apos;t get it? The link can take a minute, and it sometimes lands in spam.
          Reload this page to send another.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Your name" htmlFor="displayName" hint="Shown on any reviews you write.">
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          autoFocus
          maxLength={80}
          aria-describedby="displayName-hint"
          placeholder="Alex Fernandes"
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          spellCheck={false}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby="password-hint"
        />
      </Field>

      <AuthMessage state={state} />

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
