import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDay, formatMoney } from "@/lib/format";
import type { LedgerLine, WalletSummary } from "@/lib/wallet/server";
import { cn } from "@/lib/utils";

/**
 * A balance and the entries behind it.
 *
 * Deliberately shows the statement rather than just the number. There is no
 * payment provider to check against, so this ledger *is* the receipt — if a fee
 * or a rebate is disputed, this list is the only place either side can look, and
 * a balance with no explanation invites exactly that conversation.
 *
 * Signs are rendered from the amount, not from the kind. A refund and a top-up
 * are both credits and a fee and a plan payment are both debits; deriving the
 * arrow from `kind` would mean a new kind renders with no sign at all, whereas
 * deriving it from the number cannot be wrong.
 */

/** Human wording for `ledger_entries.kind`. */
const KIND_LABELS: Record<string, string> = {
  charge: "Repair payment",
  fee: "Platform fee",
  refund: "Refund",
  payout: "Payout",
  adjustment: "Adjustment",
  topup: "Money added",
  rebate: "Bill rebate",
  subscription: "Plan payment",
  enrollment: "Listing fee",
  enrollment_refund: "Listing fee refunded",
  extra_request: "Extra booking request",
};

/**
 * An unrecognised kind renders as itself rather than as "Unknown".
 *
 * The column is free text, so a kind added in SQL before it is added here is a
 * real possibility. Showing `some_new_kind` is ugly but honest, and a person
 * reading their own statement can still tell what moved.
 */
function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}

export function WalletPanel({
  wallet,
  lines,
  title = "Balance",
  description,
  emptyLabel = "Nothing has moved through your balance yet.",
  className,
}: {
  wallet: WalletSummary;
  lines: LedgerLine[];
  title?: string;
  description?: string;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-machined border border-hairline bg-chalk p-5 shadow-bench",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="eyebrow flex items-center gap-2">
            <Wallet aria-hidden className="size-3.5" />
            {title}
          </h2>
          {description ? (
            <p className="pt-1 text-sm leading-relaxed text-steel">{description}</p>
          ) : null}
        </div>

        <p
          className={cn(
            "font-mono text-display-xs tabular-nums",
            // A negative balance is only reachable for the platform wallet, but
            // if one ever renders here it must not look like a normal figure.
            wallet.balanceMinor < 0 ? "text-rust" : "text-enamel",
          )}
        >
          {formatMoney(wallet.balanceMinor, wallet.currency)}
        </p>
      </div>

      <div className="pt-4">
        {lines.length === 0 ? (
          <EmptyState icon={Wallet} title="No activity" description={emptyLabel} />
        ) : (
          <ul className="flex flex-col">
            {lines.map((line) => {
              const credit = line.amountMinor >= 0;
              const Icon = credit ? ArrowDownLeft : ArrowUpRight;

              return (
                <li
                  key={line.id}
                  className="flex items-baseline justify-between gap-3 border-b border-hairline py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm text-enamel">
                      <Icon
                        aria-hidden
                        className={cn(
                          "size-3.5 shrink-0",
                          credit ? "text-verdigris" : "text-steel-soft",
                        )}
                      />
                      {kindLabel(line.kind)}
                    </p>
                    {line.memo ? (
                      <p className="truncate pl-5 text-xs leading-relaxed text-steel">
                        {line.memo}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        credit ? "text-verdigris" : "text-enamel",
                      )}
                    >
                      {/* The sign is explicit on credits. `formatMoney` renders a
                          negative amount with its own minus, so debits need no
                          prefix and would otherwise read "+-₹100". */}
                      {credit ? "+" : ""}
                      {formatMoney(line.amountMinor, line.currency)}
                    </p>
                    <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                      {formatDay(line.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
