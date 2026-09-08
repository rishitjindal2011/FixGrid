"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthMessage, Field } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { Input } from "@/components/ui/input";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/paths";

export function SignUpForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();

  const [state, setState] = useState<{ error: string | null; notice: string | null }>({
    error: null,
    notice: null,
  });
  
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = async (formData: FormData) => {
    if (!isLoaded || !signUp) return;
    setState({ error: null, notice: null });

    const displayName = formData.get("displayName") as string;
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;

    const nameParts = displayName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    try {
      const { error: signUpError } = await signUp.password({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      if (signUpError) {
        setState({ error: signUpError.message || t("errors.unknown"), notice: null });
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (!sendError) {
        setPendingVerification(true);
      } else {
        setState({ error: sendError.message || t("errors.unknown"), notice: null });
      }
    } catch (err: any) {
      console.error(err);
      setState({ error: err.errors?.[0]?.message || t("errors.unknown"), notice: null });
    }
  };

  const handleVerify = async (formData: FormData) => {
    if (!isLoaded || !signUp) return;
    setState({ error: null, notice: null });

    const code = formData.get("code") as string;

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      
      if (verifyError) {
        setState({ error: verifyError.message || "Invalid verification code", notice: null });
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
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
      }
    } catch (err: any) {
      console.error(err);
      setState({ error: err.errors?.[0]?.message || "Invalid verification code", notice: null });
    }
  };

  if (pendingVerification) {
    return (
      <div className="flex flex-col gap-4">
        <form action={handleVerify} className="flex flex-col gap-4" noValidate>
          <Field label="Verification Code" htmlFor="code" hint="Check your email for the code.">
            <Input
              id="code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              required
              autoFocus
              placeholder="Enter 6-digit code"
            />
          </Field>
          <AuthMessage state={state} />
          <SubmitButton pendingLabel="Verifying...">Verify Email</SubmitButton>
        </form>
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

      <form action={handleSignUp} className="flex flex-col gap-4" noValidate>
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
