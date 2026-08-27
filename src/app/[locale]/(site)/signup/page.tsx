import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Store } from "lucide-react";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { DEFAULT_SIGNED_IN_PATH, localizedTarget, safeNextPath } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("signup.metaTitle"),
    description: t("signup.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function SignUpPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { next } = await searchParams;
  const target = safeNextPath(next);
  const t = await getTranslations({ locale, namespace: "auth" });

  if (await getCurrentUser()) redirect(localizedTarget(target, locale));

  return (
    <AuthShell
      title={t("signup.title")}
      intro={t("signup.intro")}
      footer={
        <>
          {t("signup.footerPrompt")}{" "}
          <AuthLink href={next ? `/login?next=${encodeURIComponent(target)}` : "/login"}>
            {t("signup.footerCta")}
          </AuthLink>
        </>
      }
    >
      <SignUpForm next={target === DEFAULT_SIGNED_IN_PATH ? undefined : target} />

      {/*
        Experts arrive on this page too, and until now nothing here told them
        the shop side existed — they signed up as a customer and had to find
        /join on their own. The card sits below the form rather than above it
        because most people signing up genuinely are customers; this is a branch
        for the minority, not a fork in the main path.

        Deliberately not a `next=/join` link. Sending them through signup and
        landing on the form loses nothing, and pre-loading a redirect would skip
        the onboarding gate that has to run first anyway.
      */}
      <div className="mt-6 flex items-start gap-3 rounded-machined border border-hairline bg-bench p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
          <Store aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm uppercase tracking-wide text-enamel">
            {t("signup.expertTitle")}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-steel">
            {t("signup.expertBody")}{" "}
            <AuthLink href="/join">{t("signup.expertCta")}</AuthLink>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
