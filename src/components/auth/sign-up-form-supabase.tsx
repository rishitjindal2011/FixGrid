"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { signUp } from "@/lib/auth/actions";
import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignInSupabase } from "@/components/auth/google-sign-in-supabase";
import { Input } from "@/components/ui/input";

export function SignUpFormSupabase({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(signUp, { error: null, notice: null });

  if (state.notice) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="font-medium text-enamel">{state.notice}</p>
        <p className="text-sm text-steel">{t("notices.checkEmail")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignInSupabase next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-signal/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-steel">{t("divider.email")}</span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field label={t("fields.displayName")} htmlFor="displayName">
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            autoFocus
            spellCheck={false}
          />
        </Field>

        <Field label={t("fields.email")} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            spellCheck={false}
            placeholder={t("placeholders.email")}
          />
        </Field>

        <Field label={t("fields.password")} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>

        <AuthMessage state={state} />

        <SubmitButton pendingLabel={t("actions.signingUp")}>{t("actions.signUp")}</SubmitButton>
      </form>
    </div>
  );
}
