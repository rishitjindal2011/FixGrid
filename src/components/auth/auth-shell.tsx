import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { AuthState } from "@/lib/auth/state";

/** Card-and-heading frame shared by all four auth screens. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-14 sm:py-20">
      <h1 className="text-display">{title}</h1>
      <p className="mt-2 leading-relaxed text-steel">{intro}</p>

      <div className="mt-8 rounded-machined border border-hairline bg-chalk p-6 shadow-bench sm:p-7">
        {children}
      </div>

      {footer ? <div className="mt-6 text-sm text-steel">{footer}</div> : null}
    </div>
  );
}

/**
 * Labelled field. Every auth input is a label + control pair, and hand-wiring
 * `htmlFor` five times is how one of them ends up unlabelled.
 */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="eyebrow">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-steel-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Result banner.
 *
 * `role="alert"` with `aria-live` so the outcome is announced rather than only
 * appearing — a sighted user sees the colour change, a screen reader user
 * otherwise gets nothing at all after pressing submit.
 */
export function AuthMessage({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        aria-live="polite"
        className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
      >
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        {state.error}
      </p>
    );
  }

  if (state.notice) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm leading-relaxed text-verdigris"
      >
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
        {state.notice}
      </p>
    );
  }

  return null;
}

/** Inline text link at the density the auth footers use. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-enamel underline decoration-hairline underline-offset-2 transition-colors hover:text-signal hover:decoration-signal"
    >
      {children}
    </Link>
  );
}
