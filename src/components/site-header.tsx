import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Async Server Component: session state is read per request, so the header
 * cannot be statically rendered into the shared layout shell. The auth actions
 * call `revalidatePath("/", "layout")` to drop the cached shell on sign-in and
 * sign-out — without that, a signed-in user keeps seeing the signed-out header.
 *
 * Strings come from `getTranslations`, not `useTranslations`: this component is
 * async, and the hook form is only for synchronous ones.
 *
 * `href` values stay unprefixed. `Link` is re-exported from `@/i18n/navigation`
 * elsewhere, but here the plain one is fine because next-intl's proxy rewrite
 * already resolves an unprefixed path to the active locale — and hard-coding a
 * prefix would strand English on `/hi/...`.
 */
export async function SiteHeader() {
  const [user, t, tc] = await Promise.all([
    getCurrentUser(),
    getTranslations("header"),
    getTranslations("common"),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bench/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-xl uppercase tracking-tight text-enamel"
        >
          <BrandMark size="md" className="group-hover:scale-105" />
          <span className="flex items-baseline">
            <span>FIX</span>
            <span className="text-[#0284c7]">GRID</span>
          </span>
        </Link>

        <nav aria-label={t("mainNav")} className="ml-auto hidden items-center gap-6 sm:flex">
          <Link
            href="/search"
            className="font-display text-base uppercase tracking-wide text-steel transition-colors hover:text-enamel"
          >
            {t("browseExperts")}
          </Link>
          <Link
            href="/blog"
            className="font-display text-base uppercase tracking-wide text-steel transition-colors hover:text-enamel"
          >
            {t("blog")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
          <LanguageSwitcher />

          <Button asChild size="sm">
            <Link href="/search">
              <Search aria-hidden />
              <span className="hidden sm:inline">{tc("findARepair")}</span>
              <span className="sm:hidden">{tc("search")}</span>
            </Link>
          </Button>

          {user ? (
            <>
              {/* The name is the affordance on wide screens; below that it would
                  crowd out the primary action, so it collapses to the icon. */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium tracking-wide text-steel transition-colors hover:text-signal"
              >
                <UserRound aria-hidden className="size-4 shrink-0" />
                <span className="hidden max-w-[12ch] truncate md:inline">
                  {user.displayName}
                </span>
                <span className="sr-only md:hidden">{tc("yourAccount")}</span>
              </Link>
              <div className="hidden sm:block">
                <SignOutButton />
              </div>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{tc("signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
