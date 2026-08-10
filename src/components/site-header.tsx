import Link from "next/link";
import { Search, UserRound, Wrench } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { SITE_NAME } from "@/lib/site";

/**
 * Async Server Component: session state is read per request, so the header
 * cannot be statically rendered into the shared layout shell. The auth actions
 * call `revalidatePath("/", "layout")` to drop the cached shell on sign-in and
 * sign-out — without that, a signed-in user keeps seeing the signed-out header.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bench/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl uppercase tracking-tight text-enamel"
        >
          <span className="grid size-7 place-items-center rounded-machined bg-enamel text-bench">
            <Wrench aria-hidden className="size-4" />
          </span>
          {SITE_NAME}
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-6 sm:flex">
          <Link
            href="/search"
            className="font-display text-base uppercase tracking-wide text-steel transition-colors hover:text-enamel"
          >
            Browse experts
          </Link>
          <Link
            href="/blog"
            className="font-display text-base uppercase tracking-wide text-steel transition-colors hover:text-enamel"
          >
            Blog
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
          <Button asChild size="sm">
            <Link href="/search">
              <Search aria-hidden />
              <span className="hidden sm:inline">Find a repair</span>
              <span className="sm:hidden">Search</span>
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
                <span className="sr-only md:hidden">Your account</span>
              </Link>
              <div className="hidden sm:block">
                <SignOutButton />
              </div>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
