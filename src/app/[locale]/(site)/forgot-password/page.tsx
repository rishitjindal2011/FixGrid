import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("forgot.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("forgot.title")}
      intro={t("forgot.intro")}
      footer={<AuthLink href="/login">{t("forgot.back")}</AuthLink>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
