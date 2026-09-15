"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, AuthMessage, AuthLink } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Loader2, Store } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/";

  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setNotice("Account verified! Redirecting...");
      setTimeout(() => {
        router.push(nextTarget);
      }, 600);
    }
  };

  return (
    <AuthShell
      title="FixGrid Parts Sign In"
      intro="Access your customer account to purchase tested parts, track orders, or manage your workshop stock desk."
      footer={
        <>
          New to FixGrid?{" "}
          <AuthLink href={`/signup${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}>
            Create Client Account &rarr;
          </AuthLink>
        </>
      }
    >
      <div className="flex flex-col gap-4.5">
        {/* Google OAuth Provider */}
        <GoogleSignInButton next={nextTarget} label="Continue with Google" />

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-hairline"></div>
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-chalk px-3 font-mono text-steel-soft uppercase tracking-wider">
              or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Email Address" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. buyer@example.com or lead@workshop.fixgrid"
              className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
            />
          </Field>

          <AuthMessage error={error} notice={notice} />

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full flex items-center justify-center gap-2 rounded-machined bg-signal px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to FixGrid Parts</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Workshop Registration Banner (matches main FixGrid app pattern) */}
        <div className="mt-2 flex items-start gap-3 rounded-machined border border-hairline bg-bench p-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
            <Store aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xs uppercase tracking-wide text-enamel font-bold">
              Are you a repair workshop or parts supplier?
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-steel">
              List your workshop bench to sell surplus donor lots and manage orders.{" "}
              <Link
                href={`/signup?role=workshop${nextTarget ? `&next=${encodeURIComponent(nextTarget)}` : ""}`}
                className="font-semibold text-signal hover:underline"
              >
                Register Workshop &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bench" />}>
      <LoginForm />
    </Suspense>
  );
}
