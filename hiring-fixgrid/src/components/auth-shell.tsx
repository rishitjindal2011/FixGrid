import React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

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
    <div className="min-h-screen bg-bench flex flex-col justify-between">
      {/* Top Bar Brand Header */}
      <header className="border-b border-hairline bg-chalk/90 backdrop-blur py-4 px-6 sm:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench group-hover:bg-enamel-lift transition-colors">
              <Wrench className="size-4 text-signal" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl font-bold tracking-tight text-enamel uppercase">
                  FIX<span className="text-signal">GRID</span>
                </span>
                <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                  CAREERS
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                hiring.vytron.me
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider"
          >
            &larr; Back to Openings
          </Link>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          {/* Schematic Eyebrow */}
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-signal font-bold">
              BENCH ACCESS CREDENTIALS
            </span>
            <span className="size-1.5 rounded-full bg-signal animate-pulse" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-enamel">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-steel">{intro}</p>

          <div className="mt-8 rounded-machined border border-hairline bg-chalk p-6 shadow-bench sm:p-8">
            {children}
          </div>

          {footer ? <div className="mt-6 text-center text-xs text-steel">{footer}</div> : null}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-hairline py-4 text-center font-mono text-[11px] text-steel-soft">
        FixGrid Escrow-Protected Bench Career Exchange &middot; hiring.vytron.me
      </footer>
    </div>
  );
}

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
      <label
        htmlFor={htmlFor}
        className="font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel"
      >
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

export function AuthMessage({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs leading-relaxed text-rust"
      >
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (notice) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-machined border border-verdigris/30 bg-verdigris-wash p-3 text-xs leading-relaxed text-verdigris"
      >
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{notice}</span>
      </div>
    );
  }

  return null;
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-signal hover:underline transition-colors">
      {children}
    </Link>
  );
}
