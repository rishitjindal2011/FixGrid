import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";

// Auth screens must never be served from a cache, and there is nothing here for
// a crawler — a login form in the index is a ranking liability, not a feature.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to write reviews and manage your FixGrid account.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;
  const target = safeNextPath(next);

  // Already signed in: send them where they were headed rather than showing a
  // form that would sign them in as the same person again.
  if (await getCurrentUser()) redirect(target);

  return (
    <AuthShell
      title="Sign in"
      intro="Write reviews, and keep track of the shops you've used."
      footer={
        <>
          New here?{" "}
          <AuthLink href={next ? `/signup?next=${encodeURIComponent(target)}` : "/signup"}>
            Create an account
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
