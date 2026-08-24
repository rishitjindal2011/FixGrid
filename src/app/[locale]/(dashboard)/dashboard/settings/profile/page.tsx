import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { SectionHeader } from "@/components/dashboard/page-header";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountSecurity, getProfile, listAddresses } from "@/lib/dashboard/settings";
import { formatDay } from "@/lib/format";
import type { UserAddressRow } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings/profile");

  const [profile, addresses, account] = await Promise.all([
    getProfile(user.id),
    listAddresses(user.id),
    getAccountSecurity(),
  ]);

  // `getProfile` returns null only when the row itself is unreadable, which the
  // signup trigger makes rare — but the form still needs values, and the
  // session already carries a usable display name.
  const values = {
    displayName: profile?.display_name ?? user.displayName,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    timezone: profile?.timezone ?? "Europe/London",
    preferredContact: profile?.preferred_contact ?? ("email" as const),
    marketingOptIn: profile?.marketing_opt_in ?? false,
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeader title="Your details" />

        <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench sm:p-6">
          <ProfileForm values={values} email={account?.email ?? user.email} />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Saved addresses"
          action={
            addresses.length > 0 ? (
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {addresses.length} saved
              </span>
            ) : null
          }
        />

        {addresses.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {addresses.map((address) => (
              <AddressRow key={address.id} address={address} timezone={values.timezone} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Book a home visit and the address you give is saved here for next time. Addresses are copied onto each booking, so editing one later never rewrites where an engineer already went."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/discover">Find an expert</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

/**
 * One saved address.
 *
 * The default marker is a badge rather than a radio: switching default is a
 * write, and there is no action for it yet — a control that looks selectable and
 * does nothing is worse than a label that states the fact.
 */
function AddressRow({
  address,
  timezone,
}: {
  address: UserAddressRow;
  /** The customer's own zone. "Saved 8 Aug" must not shift with the deploy region. */
  timezone: string;
}) {
  const lines = [
    address.line1,
    address.line2,
    address.city,
    address.postcode,
    // 'GB' is the column default and true of nearly every row; printing it on
    // each card is noise.
    address.country === "GB" ? null : address.country,
  ].filter((line): line is string => Boolean(line?.trim()));

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base uppercase tracking-wide text-enamel">
            {address.label?.trim() || "Address"}
          </p>
          {address.is_default ? <Badge variant="verified">Default</Badge> : null}
        </div>

        <address className="pt-1.5 text-sm not-italic leading-relaxed text-steel">
          {lines.join(", ")}
        </address>
      </div>

      <p className="shrink-0 font-mono text-xs text-steel-soft">
        Saved {formatDay(address.created_at, timezone)}
      </p>
    </li>
  );
}
