"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthMessage, AuthLink, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { Input } from "@/components/ui/input";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/paths";

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();
  
  const [state, setState] = useState<{ error: string | null; notice: string | null }>({
    error: null,
    notice: null,
  });

  const handleSubmit = async (formData: FormData) => {
    if (!isLoaded || !signIn) return;
    setState({ error: null, notice: null });

    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error: signInError } = await signIn.password({
        identifier: emailAddress,
        password,
      });

      if (signInError) {
        setState({ error: signInError.message || t("errors.unknown"), notice: null });
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            const dest = next || DEFAULT_SIGNED_IN_PATH;
            const url = decorateUrl(dest);
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else {
        setState({ error: "Additional verification required. Please contact support.", notice: null });
      }
    } catch (err: any) {
      console.error(err);
      setState({ error: err.errors?.[0]?.message || t("errors.unknown"), notice: null });
    }
  };

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
      <GoogleSignIn next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-signal/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-steel">{t("divider.email")}</span>
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4" noValidate>
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
