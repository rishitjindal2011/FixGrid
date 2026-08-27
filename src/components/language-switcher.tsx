"use client";

import { useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Language switcher.
 *
 * The one control that changes locale. It navigates to the *same* page in the
 * chosen language via next-intl's locale-aware router, which re-expresses the
 * path under `localePrefix: "as-needed"` — so English drops the prefix and the
 * other six gain `/xx`. next-intl also writes the `NEXT_LOCALE` cookie on this
 * navigation, persisting the choice.
 *
 * The current query string is carried across by reading `window.location.search`
 * at click time rather than `useSearchParams`: the header and footer render this
 * on every page, including statically generated ones, and a `useSearchParams`
 * hook would force a Suspense boundary onto all of them. The read only ever runs
 * inside a click handler, where `window` is defined.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    if (locale === activeLocale) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale });
    });
  }

  const active = LOCALE_META[activeLocale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("chooseLanguage")}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 rounded-machined px-2 py-1.5 text-sm text-steel outline-none transition-colors",
          "hover:text-enamel focus-visible:ring-2 focus-visible:ring-signal",
          "data-[state=open]:text-enamel disabled:opacity-60",
          className,
        )}
      >
        <Globe aria-hidden className="size-4 shrink-0" />
        <span lang={active.tag} className="hidden sm:inline">
          {active.nativeName}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((locale) => {
          const meta = LOCALE_META[locale];
          const isActive = locale === activeLocale;
          return (
            <DropdownMenuItem
              key={locale}
              lang={meta.tag}
              onSelect={() => switchTo(locale)}
              className="pl-8"
            >
              <span className="absolute left-2 grid size-4 place-items-center">
                {isActive ? <Check className="size-3.5 text-signal" aria-hidden /> : null}
              </span>
              <span>{meta.nativeName}</span>
              <span className="ml-auto font-mono text-eyebrow uppercase tracking-[0.12em] text-steel-soft">
                {locale}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
