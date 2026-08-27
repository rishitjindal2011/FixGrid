"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(requestPasswordReset, AUTH_INITIAL_STATE);

  // The notice is deliberately the same whether or not the address exists, so
  // there is nothing left to do on this screen either way.
  if (state.notice) return <AuthMessage state={state} />;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label={t("fields.email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          spellCheck={false}
          placeholder={t("placeholders.email")}
        />
      </Field>

      <AuthMessage state={state} />

      <SubmitButton pendingLabel={t("actions.sending")}>{t("actions.sendResetLink")}</SubmitButton>
    </form>
  );
}
