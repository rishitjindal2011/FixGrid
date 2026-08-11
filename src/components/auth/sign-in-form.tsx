"use client";

import { useActionState } from "react";

import { AuthMessage, AuthLink, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, formAction] = useActionState(signIn, AUTH_INITIAL_STATE);

  // An expired link is a server-side fact carried in the query string, so it is
  // merged into the same banner the action uses. The action's own error wins —
  // it describes what just happened, the link error describes how they arrived.
  const shown = state.error
    ? state
    : linkError
      ? {
          error: "That link has expired or was already used. Sign in, or request a new one.",
          notice: null,
        }
      : state;

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignIn next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-signal/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-steel">Or continue with email</span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          spellCheck={false}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <AuthMessage state={shown} />

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

      <p className="text-center text-sm text-steel">
        <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
      </p>
    </form>
    </div>
  );
}
