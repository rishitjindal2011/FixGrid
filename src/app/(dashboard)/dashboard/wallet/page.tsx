import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { WalletPanel } from "@/components/dashboard/wallet-panel";
import { WalletTopUp } from "@/components/dashboard/wallet-topup";
import { getCurrentUser } from "@/lib/auth/session";
import { getWallet, listLedger } from "@/lib/wallet/server";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false, follow: false },
};

/**
 * The customer's balance, and where they top it up.
 *
 * Its own page rather than a panel on Payments because it is the thing a booking
 * depends on: a failed booking sends someone looking for "where do I add money",
 * and that should be a nav item rather than a section halfway down an invoice
 * screen. Payments keeps a tile that links here.
 *
 * `force-dynamic` is inherited from the dashboard layout, but the reads here are
 * per-user money and must never be cached across requests regardless.
 */
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  // The layout already gated this; the redirect is here so `user` narrows.
  if (!user) redirect("/login?next=/dashboard/wallet");

  const [wallet, ledger] = await Promise.all([
    getWallet("user", user.id),
    listLedger("user", user.id, 50),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Wallet"
        title="Your balance"
        description="Booking fees come out of this balance. Top it up here, and every movement is listed below."
      />

      {/*
        Stated plainly rather than buried. Nobody should discover from a support
        conversation that the card form was a simulation — and while it is one, a
        customer typing a real card number into it is a genuine hazard.
      */}
      <p className="flex items-start gap-2 rounded-machined border border-signal/30 bg-signal-wash px-4 py-3 text-sm leading-relaxed text-enamel">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
        <span>
          Payments are <strong>simulated</strong> while we finish setting up our
          provider. Nothing is charged to a real card or account, and no card details
          are stored — do not enter a real card number.
        </span>
      </p>

      <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
        <h2 className="eyebrow">Add funds</h2>
        <div className="pt-3">
          <WalletTopUp balanceMinor={wallet.balanceMinor} />
        </div>
      </section>

      <WalletPanel
        wallet={wallet}
        lines={ledger}
        title="Balance and activity"
        emptyLabel="Nothing has moved through your balance yet. Add funds above to get started."
      />
    </div>
  );
}
