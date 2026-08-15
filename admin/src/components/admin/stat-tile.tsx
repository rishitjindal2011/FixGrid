import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One headline number.
 *
 * `value` is a pre-formatted string, not a number, because the caller knows
 * whether it is money (`formatMoney`, integer paise) or a count
 * (`formatCount`). Formatting inside would mean guessing, and a stat tile that
 * renders `4999` for ₹49.99 is the kind of bug nobody notices for a month.
 *
 * `tone` is not decoration. `signal` means this number is a queue waiting on
 * the person reading it — pending claims, open disputes. A tile that is merely
 * large stays neutral, however impressive.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = "neutral",
  className,
}: {
  label: string;
  /** Already formatted. Rendered in mono, tabular. */
  value: string;
  hint?: string;
  /** When set the whole tile is a link to the filtered list behind the number. */
  href?: string;
  tone?: "neutral" | "signal" | "verdigris" | "rust";
  className?: string;
}) {
  const toneClass = {
    neutral: "text-enamel",
    signal: "text-signal",
    verdigris: "text-verdigris",
    rust: "text-rust",
  }[tone];

  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className={cn("mt-3 font-mono text-display-sm tabular-nums", toneClass)}>{value}</p>
      {hint ? <p className="mt-1.5 text-sm leading-snug text-steel">{hint}</p> : null}
    </>
  );

  const shell = cn(
    "block rounded-machined border bg-chalk p-5 shadow-bench",
    // A signal tile carries a tinted field and border so it reads as a queue at
    // a glance, before any number is parsed.
    tone === "signal" ? "border-signal/30 bg-signal-wash" : "border-hairline",
    className,
  );

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link href={href} className={cn(shell, "transition-colors hover:border-steel-soft")}>
      {body}
    </Link>
  );
}
