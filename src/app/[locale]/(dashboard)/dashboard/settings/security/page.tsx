import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, KeyRound, MonitorSmartphone } from "lucide-react";

import { SectionHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/state";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime, formatRelative } from "@/lib/format";
import { getAccountSecurity, getProfile } from "@/lib/dashboard/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Security",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ reset?: string }> };

/**
 * Send this account's password-reset link.
 *
 * Wraps `requestPasswordReset` from `@/lib/auth/actions` rather than
 * reimplementing it — that function owns the throttle, the redirect URL and the
 * no-enumeration response, and a second copy here would be a second thing to
 * keep in step.
 *
 * The address is read from the session inside the action, never from the form.
 * A hidden `email` input would be trivially editable in devtools, which would
 * turn a signed-in page into a "mail a reset link to any address" relay — the
 * one property `/forgot-password` is throttled to protect.
 */
async function sendResetLink(): Promise<void> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login?next=/dashboard/settings/security");

  const payload = new FormData();
  payload.set("email", user.email);

  const result = await requestPasswordReset(AUTH_INITIAL_STATE, payload);

  // The action never reveals whether the address exists, so the only failure it
  // can report is the throttle. Both outcomes are carried in the URL because
  // this form has no client state to hold them.
  redirect(
    `/dashboard/settings/security?reset=${result.error ? "throttled" : "sent"}`,
  );
}

export default async function SecuritySettingsPage({ searchParams }: PageProps) {
  const { reset } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings/security");

  const [account, profile] = await Promise.all([
    getAccountSecurity(),
    getProfile(user.id),
  ]);

  const now = new Date();
  // The customer's own zone, not the runtime's — a sign-in time is a fact about
  // where they were, and the shop's timezone has nothing to do with it.
  const zone = profile?.timezone ?? "Europe/London";
  const email = account?.email ?? user.email;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeader title="Sign-in" />

        {reset === "sent" ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-3 flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            Reset link sent to {email ?? "your address"}. It expires in an hour — check
            spam if it hasn&rsquo;t arrived in a few minutes.
          </p>
        ) : null}

        {reset === "throttled" ? (
          <p
            role="alert"
            aria-live="polite"
            className="mb-3 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            Too many reset requests. Wait a few minutes and try again.
          </p>
        ) : null}

        <dl className="divide-y divide-hairline rounded-machined border border-hairline bg-chalk shadow-bench">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
            <dt className="eyebrow">Email</dt>
            <dd className="flex flex-wrap items-center gap-2 font-mono text-sm text-steel">
              {email ?? "—"}
              {account?.emailConfirmedAt ? (
                <Badge variant="verified">Confirmed</Badge>
              ) : (
                <Badge variant="signal">Unconfirmed</Badge>
              )}
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
            <dt className="eyebrow">Last sign-in</dt>
            <dd className="text-right font-mono text-sm text-steel">
              {account?.lastSignInAt ? (
                <>
                  {formatDateTime(account.lastSignInAt, zone)}
                  <span className="block text-xs text-steel-soft">
                    {formatRelative(account.lastSignInAt, now)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
            <dt className="eyebrow">Account created</dt>
            <dd className="font-mono text-sm text-steel">
              {account?.createdAt ? formatDateTime(account.createdAt, zone) : "—"}
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
            <dt className="eyebrow">Sign-in method</dt>
            <dd className="font-mono text-sm text-steel">
              {account?.providers.length ? account.providers.join(", ") : "email"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <SectionHeader title="Password" />

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-bench text-enamel">
                <KeyRound aria-hidden className="size-4" />
              </span>
              <div className="max-w-prose">
                <p className="font-display text-base uppercase tracking-wide text-enamel">
                  Change your password
                </p>
                <p className="pt-1.5 text-sm leading-relaxed text-steel">
                  We email you a one-time link rather than asking for a new password
                  here. That way a stranger on an unlocked laptop cannot lock you out
                  of your own account.
                </p>
              </div>
            </div>

            {/* No `useActionState`: this posts from a Server Component, so it
                works with JavaScript disabled and the outcome comes back in the
                URL instead of client state. */}
            <form action={sendResetLink} className="shrink-0">
              <Button type="submit" variant="outline" size="sm">
                Send me a reset link
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Other devices" />

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-bench text-enamel">
              <MonitorSmartphone aria-hidden className="size-4" />
            </span>
            <div className="max-w-prose text-sm leading-relaxed text-steel">
              <p className="font-display text-base uppercase tracking-wide text-enamel">
                Signing out everywhere
              </p>
              <p className="pt-1.5">
                Sign out in the top bar clears this browser only. That is deliberate —
                on a shared computer it should not also sign you out on your phone.
              </p>
              <p className="pt-2">
                Ending sessions on your other devices needs an admin-level call we
                have not built yet, so it is not available on this page. If you think
                someone else has access, send yourself a reset link above and change
                your password, then email support so we can revoke the rest.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
