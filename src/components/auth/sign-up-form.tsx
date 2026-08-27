"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";

export function SignUpForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(signUp, AUTH_INITIAL_STATE);

  // On success the action returns a notice and the form stays mounted. Hiding
  // the fields stops the user re-submitting and burning throttle attempts while
  // they go looking for the confirmation email.
  if (state.notice) {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage state={state} />
        <p className="text-sm leading-relaxed text-steel">{t("signup.checkSpam")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignIn next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-signal/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-steel">{t("divider.signupEmail")}</span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={t("fields.yourName")} htmlFor="displayName" hint={t("hints.nameOnReviews")}>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          autoFocus
          maxLength={80}
          aria-describedby="displayName-hint"
          placeholder={t("placeholders.name")}
        />
      </Field>

      <Field label={t("fields.email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          spellCheck={false}
          placeholder={t("placeholders.email")}
        />
      </Field>

      <Field label={t("fields.password")} htmlFor="password" hint={t("hints.atLeast8")}>
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

      <SubmitButton pendingLabel={t("actions.creatingAccount")}>
        {t("actions.createAccount")}
      </SubmitButton>
    </form>
    </div>
  );
}
