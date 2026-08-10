import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddressBook } from "@/components/dashboard/address-book";
import { SectionHeader } from "@/components/dashboard/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { listAddresses } from "@/lib/dashboard/addresses";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default async function AddressSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings/addresses");

  const addresses = await listAddresses(user.id);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="Your addresses" />

        <p className="pb-4 text-sm text-steel">
          Saved here once, then offered whenever you book a home visit or a collection. A shop only
          sees an address when you book with them.
        </p>

        <AddressBook addresses={addresses} />
      </section>
    </div>
  );
}
