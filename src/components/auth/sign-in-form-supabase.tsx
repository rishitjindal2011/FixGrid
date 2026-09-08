"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { signIn } from "@/lib/auth/actions";
import { AuthMessage, AuthLink, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignInSupabase } from "@/components/auth/google-sign-in-supabase";
import { Input } from "@/components/ui/input";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/paths";

export function SignInFormSupabase({ next, linkError }: { next?: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(signIn, { error: null, notice: null });

  const shown = state.error
    ? state
    : linkError
      ? {
          error: t("errors.linkExpiredOrUsed"),
          notice: null,
        }
      : state;

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

        <Field label={t("fields.password")} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <AuthMessage state={shown} />

        <SubmitButton pendingLabel={t("actions.signingIn")}>{t("actions.signIn")}</SubmitButton>

        <p className="text-center text-sm text-steel">
          <AuthLink href="/forgot-password">{t("actions.forgotPassword")}</AuthLink>
        </p>
      </form>
    </div>
  );
}
