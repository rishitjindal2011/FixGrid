import type { Metadata } from "next";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from the emailed recovery link, which passes through
 * `/auth/callback` first — that is where the recovery token becomes a session.
 *
 * Arriving here without one means the link expired, was already used, or someone
 * typed the URL directly. Say so instead of rendering a form that can only fail:
 * `updateUser` requires a session, so the submit would bounce regardless.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthShell
        title="Link expired"
        intro="Password reset links are single-use and expire after an hour."
        footer={<AuthLink href="/login">Back to sign in</AuthLink>}
      >
        <p className="text-sm leading-relaxed text-steel">
          Request a fresh link and use it as soon as it arrives.
        </p>
        <div className="mt-4">
          <AuthLink href="/forgot-password">Send a new reset link</AuthLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      intro={`Choose a new password for ${user.email ?? "your account"}.`}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
