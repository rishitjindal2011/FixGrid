import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { AuthLink } from "@/components/auth/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ updated?: string }> };

export default async function AccountPage({ searchParams }: PageProps) {
  const { updated } = await searchParams;
  const user = await getCurrentUser();

  // Server-side gate. There is no proxy matcher for this route because the
  // check belongs next to the data it protects, not in a list of paths that
  // drifts out of sync with the app.
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14">
      <h1 className="text-display">Your account</h1>

      {updated === "password" ? (
        <p
          role="status"
          className="mt-6 flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
        >
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your password has been updated.
        </p>
      ) : null}

      <dl className="mt-8 divide-y divide-hairline rounded-machined border border-hairline bg-chalk shadow-bench">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
          <dt className="eyebrow">Name</dt>
          <dd className="text-enamel">{user.displayName}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
          <dt className="eyebrow">Email</dt>
          <dd className="font-mono text-sm text-steel">{user.email ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
          <dt className="eyebrow">Password</dt>
          <dd className="text-sm">
            <AuthLink href="/forgot-password">Send a reset link</AuthLink>
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
