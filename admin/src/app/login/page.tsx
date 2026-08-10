import type { Metadata } from "next";
import { Wrench } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * The proxy already sends signed-in visitors away from this route, so this page
 * does not re-check the session — it would be a second verify on every render
 * for a case that cannot reach here.
 *
 * `next` arrives as a search param from the proxy redirect and is passed
 * through to a hidden field. It is validated again inside the login action: a
 * hidden field is user input, and the value has made a round trip through the
 * browser by the time it comes back.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = Array.isArray(next) ? next[0] : next;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 place-items-center rounded-machined bg-enamel text-bench">
            <Wrench className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-display-sm">Platform admin</h1>
            <p className="mt-1 text-sm text-steel">Fix-It Registry operations console</p>
          </div>
        </div>

        <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
          <LoginForm next={target} />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-steel-soft">
          Internal tool. Accounts are provisioned directly in the database — there
          is no sign-up and no password reset by design.
        </p>
      </div>
    </main>
  );
}
