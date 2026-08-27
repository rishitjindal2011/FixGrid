import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarCheck, ShieldCheck, Store } from "lucide-react";

import { JoinForm } from "@/components/join/join-form";
import { ENROLLMENT_FEE_MINOR } from "@/lib/join/state";
import { getWallet } from "@/lib/wallet/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedShop } from "@/lib/dashboard/owned-shop";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: absoluteUrl("/join") },
  };
}

/**
 * The expert onboarding route.
 *
 * Replaces a footer link that pointed at nothing — `/join` was referenced from
 * `site-footer.tsx` but no route existed, so "List your shop" was a 404.
 *
 * Signed-out visitors are not redirected away. The pitch is the page's job, and
 * bouncing someone to a login form before they know what they are signing up
 * for loses them; the form itself asks them to sign in at the point it matters.
 */
export default async function JoinPage() {
  const user = await getCurrentUser();

  // Someone who already runs a shop does not need this form, and letting them
  // through would create a second shop under the same account.
  if (user) {
    const shop = await getOwnedShop(user.id);
    if (shop) redirect("/dashboard/expert");
  }

  /*
   * The balance, for the payment sheet.
   *
   * Zero for a signed-out visitor: the page still renders the form and its price,
   * because "what does this cost" is a question worth answering before asking
   * anyone to sign in. The sheet is only reachable after signing in, and the
   * server action re-reads the real balance regardless.
   */
  const wallet = user
    ? await getWallet("user", user.id)
    : { balanceMinor: 0, currency: "INR" };

  const t = await getTranslations("join");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_28rem] lg:gap-14">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-3 text-display">{t("heading")}</h1>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-steel">
              {t("intro")}
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {[
              {
                icon: Store,
                title: t("benefit1Title"),
                body: t("benefit1Body"),
              },
              {
                icon: ShieldCheck,
                title: t("benefit2Title"),
                body: t("benefit2Body"),
              },
              {
                icon: CalendarCheck,
                title: t("benefit3Title"),
                body: t("benefit3Body"),
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-machined border border-hairline bg-chalk text-enamel">
                  <item.icon aria-hidden className="size-4" />
                </span>
                <div>
                  <p className="font-display text-base uppercase tracking-wide text-enamel">
                    {item.title}
                  </p>
                  <p className="mt-0.5 max-w-[48ch] text-sm leading-relaxed text-steel">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm text-steel">
            {t.rich("claim", {
              find: (chunks) => (
                <Link href="/search" className="text-signal hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench sm:p-6">
          {user ? (
            <>
              <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
                {t("formHeading")}
              </h2>
              <p className="mb-5 mt-1 text-sm text-steel">
                {t("signedInAs", { email: user.email ?? "" })}
              </p>
              {/* The uid is passed down rather than read in the browser: the
                  storage policy requires each upload to sit in a folder named
                  after the caller, and the server already knows who that is. */}
              <JoinForm
                userId={user.id}
                balanceMinor={wallet.balanceMinor}
                enrollmentFeeMinor={ENROLLMENT_FEE_MINOR}
              />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
                {t("signInHeading")}
              </h2>
              <p className="text-sm leading-relaxed text-steel">
                {t("signInBody")}
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/signup?next=/join"
                  className="inline-flex h-12 items-center justify-center rounded-machined bg-signal px-6 font-display uppercase tracking-wide text-white transition-colors hover:bg-signal-lift"
                >
                  {t("createAccount")}
                </Link>
                <Link
                  href="/login?next=/join"
                  className="inline-flex h-12 items-center justify-center rounded-machined border border-hairline bg-chalk px-6 font-display uppercase tracking-wide text-enamel transition-colors hover:bg-bench"
                >
                  {t("haveAccount")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
