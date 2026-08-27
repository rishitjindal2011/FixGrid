import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("reset.metaTitle"),
    robots: { index: false, follow: false },
  };
}

/**
 * Reached from the emailed recovery link, which passes through
 * `/auth/callback` first — that is where the recovery token becomes a session.
 *
 * Arriving here without one means the link expired, was already used, or someone
 * typed the URL directly. Say so instead of rendering a form that can only fail:
 * `updateUser` requires a session, so the submit would bounce regardless.
 */
export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthShell
        title={t("reset.expiredTitle")}
        intro={t("reset.expiredIntro")}
        footer={<AuthLink href="/login">{t("reset.back")}</AuthLink>}
      >
        <p className="text-sm leading-relaxed text-steel">
          {t("reset.expiredBody")}
        </p>
        <div className="mt-4">
          <AuthLink href="/forgot-password">{t("reset.expiredCta")}</AuthLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("reset.title")}
      intro={t("reset.intro", { email: user.email ?? t("reset.yourAccount") })}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
