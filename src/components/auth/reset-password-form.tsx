"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(updatePassword, AUTH_INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label={t("fields.newPassword")} htmlFor="password" hint={t("hints.atLeast8")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={8}
          aria-describedby="password-hint"
        />
      </Field>

      <Field label={t("fields.confirmPassword")} htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <AuthMessage state={state} />

      <SubmitButton pendingLabel={t("actions.saving")}>{t("actions.setNewPassword")}</SubmitButton>
    </form>
  );
}
