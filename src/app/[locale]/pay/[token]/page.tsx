import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";

import { PayPinSheet } from "@/components/dashboard/pay-pin-sheet";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAYEE_NAME, PAYEE_VPA } from "@/lib/wallet/upi";
import { formatMoney } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wallet");
  return {
    title: t("page.metaTitle"),
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * Where a scanned payment QR lands.
 *
 * Deliberately outside the `(dashboard)` group and **without a session check**,
 * because the device that scanned the code has never signed in here. The token in
 * the URL is the whole authorisation, which is why it is 32 random bytes rather
 * than the short reference, and why this page reads through the service-role
 * client — there is no `auth.uid()` to satisfy an RLS policy with.
 *
 * That makes the token a bearer credential, so the page is careful with it:
 *
 *   • It renders nothing identifying. No customer name, no email, no balance —
 *     only the amount and the reference. Anyone who obtains the link can already
 *     complete the payment; they should not also learn whose it is.
 *   • A spent or unknown token gets the same 404. Distinguishing them would turn
 *     the page into an oracle for which tokens exist.
 *   • `nocache` and no-index, so it does not end up in a crawler or a shared
 *     cache.
 *
 * Styled to look like a UPI app rather than like the rest of this product,
 * because that is the point of the exercise — and it says plainly, twice, that it
 * is a simulation. A page that imitates a bank's PIN pad convincingly and does not
 * admit it is teaching a bad habit.
 */
export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Bounded before it reaches a query. The column is 32 bytes base64url.
  if (!token || token.length < 32 || token.length > 64) notFound();

  const t = await getTranslations("wallet");

  const { data: attempt, error } = await createAdminClient()
    .from("wallet_topups")
    .select("reference, amount_minor, status, method")
    .eq("pay_token", token)
    .maybeSingle<{
      reference: string;
      amount_minor: number;
      status: string;
      method: string;
    }>();

  if (error || !attempt) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-5 bg-slate-50 px-5 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">
          {t("page.securePayment")}
        </p>
        <p className="pt-1 text-lg font-semibold text-slate-900">{PAYEE_NAME}</p>
      </div>

      {/*
        First of the two disclosures. Above the sheet, before anything is typed —
        not in small print underneath it after the fact.
      */}
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <span>
          {t.rich("page.simulationWarning", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </span>
      </p>

      {attempt.status === "pending" ? (
        <PayPinSheet
          token={token}
          amountMinor={attempt.amount_minor}
          payeeName={PAYEE_NAME}
          payeeVpa={PAYEE_VPA}
          reference={attempt.reference}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {attempt.status === "succeeded" ? t("page.alreadyPaid") : t("page.paymentClosed")}
          </p>
          <p className="pt-2 text-sm leading-relaxed text-slate-600">
            {attempt.status === "succeeded"
              ? t("page.alreadyAddedNote", { amount: formatMoney(attempt.amount_minor) })
              : t("page.declinedNote")}
          </p>
          <p className="pt-3 font-mono text-xs uppercase tracking-widest text-slate-400">
            {attempt.reference}
          </p>
        </div>
      )}
    </main>
  );
}
