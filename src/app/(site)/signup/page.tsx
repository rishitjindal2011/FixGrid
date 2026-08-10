import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a FixGrid account to review the shops you've used.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function SignUpPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  if (await getCurrentUser()) redirect(target);

  return (
    <AuthShell
      title="Create an account"
      intro="You only need one to leave a review. Browsing the directory needs nothing at all."
      footer={
        <>
          Already have an account?{" "}
          <AuthLink href={next ? `/login?next=${encodeURIComponent(target)}` : "/login"}>
            Sign in
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
            Are you a repair expert?
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-steel">
            Register your shop to take bookings, set your prices and manage your
            calendar.{" "}
            <AuthLink href="/join">List your shop</AuthLink>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
