import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Marketing chrome for every public URL.
 *
 * `(site)` is a route group, so the parentheses are stripped from the path —
 * `(site)/page.tsx` still serves `/`, `(site)/search` still serves `/search`.
 * Nothing about the public URL space changed when these files moved here; the
 * group exists purely so the dashboard can opt out of this header and footer
 * without either layout knowing about the other.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-machined focus:bg-enamel focus:px-4 focus:py-2 focus:text-bench"
      >
        Skip to content
      </a>

      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
