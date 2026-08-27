import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { DEFAULT_SIGNED_IN_PATH, localizedTarget, safeNextPath } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

// Auth screens must never be served from a cache, and there is nothing here for
// a crawler — a login form in the index is a ranking liability, not a feature.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("login.metaTitle"),
    description: t("login.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { next, error } = await searchParams;
  const target = safeNextPath(next);
  const t = await getTranslations({ locale, namespace: "auth" });

  // Already signed in: send them where they were headed rather than showing a
  // form that would sign them in as the same person again. Keep them in-locale.
  if (await getCurrentUser()) redirect(localizedTarget(target, locale));

  return (
    <AuthShell
      title={t("login.title")}
      intro={t("login.intro")}
      footer={
        <>
          {t("login.footerPrompt")}{" "}
          <AuthLink href={next ? `/signup?next=${encodeURIComponent(target)}` : "/signup"}>
            {t("login.footerCta")}
          </AuthLink>
        </>
      }
    >
      <SignInForm
        next={target === DEFAULT_SIGNED_IN_PATH ? undefined : target}
        linkError={error === "link_invalid"}
      />
    </AuthShell>
  );
}
