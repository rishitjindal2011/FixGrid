import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarCheck, ShieldCheck, Store } from "lucide-react";

import { JoinForm } from "@/components/join/join-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedShop } from "@/lib/dashboard/owned-shop";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "List your repair shop",
  description:
    "Add your repair business to FixGrid. Free to list, no booking fees, and your dashboard opens as soon as you submit.",
  alternates: { canonical: absoluteUrl("/join") },
};

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_28rem] lg:gap-14">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow">For repair businesses</p>
            <h1 className="mt-3 text-display">List your repair shop</h1>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-steel">
              FixGrid is a directory of repair shops people can actually
              book. Listing is free, there are no booking fees, and you keep
              control of your own hours and prices.
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {[
              {
                icon: Store,
                title: "Your dashboard opens immediately",
                body: "Add services, opening hours and photos the moment you submit — no waiting on us to start building your page.",
              },
              {
                icon: ShieldCheck,
                title: "We check every shop",
                body: "A person reviews your details before the listing goes live. It keeps the directory worth trusting, which is what makes it worth being in.",
              },
              {
                icon: CalendarCheck,
                title: "Bookings, not just a phone number",
                body: "Customers request a slot against your real availability. You accept, decline or propose another time.",
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
            Already listed but not the owner?{" "}
            <Link href="/search" className="text-signal hover:underline">
              Find your shop
            </Link>{" "}
            and claim it instead — that keeps your existing reviews.
          </p>
        </div>

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench sm:p-6">
          {user ? (
            <>
              <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
                Tell us about your shop
              </h2>
              <p className="mb-5 mt-1 text-sm text-steel">
                Signed in as {user.email}.
              </p>
              {/* The uid is passed down rather than read in the browser: the
                  storage policy requires each upload to sit in a folder named
                  after the caller, and the server already knows who that is. */}
              <JoinForm userId={user.id} />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
                Sign in to continue
              </h2>
              <p className="text-sm leading-relaxed text-steel">
                A shop has to belong to an account — that is what gives you the
                dashboard, your bookings and your messages. It takes a minute.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/signup?next=/join"
                  className="inline-flex h-12 items-center justify-center rounded-machined bg-signal px-6 font-display uppercase tracking-wide text-white transition-colors hover:bg-signal-lift"
                >
                  Create an account
                </Link>
                <Link
                  href="/login?next=/join"
                  className="inline-flex h-12 items-center justify-center rounded-machined border border-hairline bg-chalk px-6 font-display uppercase tracking-wide text-enamel transition-colors hover:bg-bench"
                >
                  I already have one
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
