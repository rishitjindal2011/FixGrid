import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { SectionHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerStats } from "@/lib/dashboard/customer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Close your account",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ state?: string; ref?: string }> };

/** The word the user has to type. Uppercase so it cannot be muscle memory. */
const CONFIRM_WORD = "DELETE";

/**
 * Raise a deletion request.
 *
 * This does **not** delete anything, and the page says so in as many words.
 * Removing an account means deleting rows in `auth.users`, which needs the
 * service-role key and a considered cascade over bookings, payments and
 * disputes — none of which exists yet. Wiring this button to
 * `auth.admin.deleteUser` would throw; wiring it to a soft "deleted" flag would
 * be a lie told to someone exercising a legal right.
 *
 * So it does the honest thing: authenticates the request, records it where the
 * on-call rota can see it, and hands back a reference. The copy below states
 * plainly that a person actions it, and how long that takes.
 */
async function requestAccountDeletion(formData: FormData): Promise<void> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/settings/danger");

  // Compared exactly, and on the server. The `pattern` attribute on the input
  // is a convenience for the person typing, not a control — anything that only
  // runs in the browser is absent for anyone who posts this form directly.
  if (String(formData.get("confirm") ?? "").trim() !== CONFIRM_WORD) {
    redirect("/dashboard/settings/danger?state=mismatch");
  }

  // Derived from the user id rather than random, so support can find the account
  // from the reference alone and a resubmitted request reuses the same one.
  const reference = `DEL-${user.id.slice(0, 8).toUpperCase()}`;

  // Deliberately a log line and not a table write. `account_deletion_requests`
  // does not exist in `001_marketplace.sql`, and inventing a table from a page
  // would put the app out of step with the migration. `console.error`, not
  // `warn`, because that is the level the log drain alerts on — a deletion
  // request nobody sees is the failure mode that actually matters here.
  console.error("[settings] account deletion requested", {
    reference,
    userId: user.id,
    email: user.email,
    requestedAt: new Date().toISOString(),
  });

  redirect(`/dashboard/settings/danger?state=received&ref=${encodeURIComponent(reference)}`);
}

export default async function DangerSettingsPage({ searchParams }: PageProps) {
  const { state, ref } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings/danger");

  // Degrades to zeros on a missing table, so this renders before the migration.
  const stats = await getCustomerStats(user.id);

  if (state === "received") {
    return (
      <section>
        <SectionHeader title="Request received" />

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench sm:p-6">
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            We have your request to close this account.
          </p>

          <dl className="pt-5">
            <dt className="eyebrow">Your reference</dt>
            <dd className="pt-1.5 font-mono text-lg text-enamel">{ref ?? "—"}</dd>
          </dl>

          <div className="max-w-prose pt-5 text-sm leading-relaxed text-steel">
            <p className="font-display text-base uppercase tracking-wide text-enamel">
              What happens next
            </p>
            <ol className="flex list-decimal flex-col gap-2 pl-5 pt-2">
              <li>
                Someone on our team emails {user.email ?? "your address"} within two
                working days to confirm it was you. We will never ask for your password.
              </li>
              <li>
                Any booking still in progress is settled or cancelled with the shop
                first — we cannot delete a job someone is halfway through.
              </li>
              <li>
                The account and your personal details are erased within 30 days of that
                confirmation, which is the window UK data protection law gives us.
              </li>
            </ol>

            <p className="pt-3">
              Completed bookings and their invoices are kept for six years because HMRC
              requires it, with your name and contact details removed. Reviews you have
              left stay up, unattributed.
            </p>

            <p className="pt-3">
              Nothing has been deleted yet, and you can keep using your account in the
              meantime. To call it off, reply to that email or quote{" "}
              <span className="font-mono text-enamel">{ref ?? "your reference"}</span> to
              support.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Close your account" />

      <div className="rounded-machined border border-rust/30 bg-chalk shadow-bench">
        <div className="flex items-start gap-3 border-b border-rust/20 bg-rust-wash p-5">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-rust" />
          <div className="max-w-prose">
            <h3 className="font-display text-display-sm uppercase text-rust">
              Delete this account
            </h3>
            <p className="pt-1.5 text-sm leading-relaxed text-steel">
              This removes your profile, saved addresses, saved shops and message
              history. It cannot be undone once it goes through.
            </p>
          </div>
        </div>

        <div className="p-5">
          <p className="max-w-prose text-sm leading-relaxed text-steel">
            Deleting an account is handled by a person, not by this button. Pressing it
            raises a request and gives you a reference — support then confirms it is you
            by email, settles anything outstanding with the shops you have booked, and
            erases the account within 30 days.
          </p>

          {stats.active > 0 ? (
            <p className="mt-4 flex items-start gap-2 rounded-machined border border-signal/30 bg-signal-wash px-3 py-2.5 text-sm leading-relaxed text-signal">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                You have <span className="font-mono">{stats.active}</span>{" "}
                {stats.active === 1 ? "booking" : "bookings"} still open. Those have to
                be completed or cancelled before the account can be closed — you can
                still raise the request now.
              </span>
            </p>
          ) : null}

          {state === "mismatch" ? (
            <p
              role="alert"
              aria-live="polite"
              className="mt-4 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              That didn&rsquo;t match. Type {CONFIRM_WORD} exactly, in capitals, to
              confirm.
            </p>
          ) : null}

          {/* A Server Component form: no client state, so it still works with
              JavaScript off and the outcome comes back in the URL. */}
          <form action={requestAccountDeletion} className="flex flex-col gap-2 pt-5">
            <label htmlFor="confirm" className="eyebrow">
              Type {CONFIRM_WORD} to confirm
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Input
                id="confirm"
                name="confirm"
                required
                pattern={CONFIRM_WORD}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby="confirm-hint"
                className="font-mono uppercase sm:max-w-56"
              />

              <Button type="submit" variant="danger" className="shrink-0">
                Request deletion
              </Button>
            </div>

            <p id="confirm-hint" className="text-xs leading-relaxed text-steel-soft">
              Typing the word is the whole safety net — there is no second confirmation
              dialog after this.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
