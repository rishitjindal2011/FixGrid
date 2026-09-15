"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, AuthMessage, AuthLink } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Loader2, Store } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/";

  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signUp(email, password, {
      displayName: displayName.trim(),
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setNotice("Account initialized successfully! Redirecting...");
      setTimeout(() => {
        router.push(nextTarget);
      }, 700);
    }
  };

  return (
    <AuthShell
      title="Create FixGrid Account"
      intro="Create your account to apply for bench technician openings, track inquiries, and interact with verified workshops."
      footer={
        <>
          Already registered?{" "}
          <AuthLink href={`/login${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}>
            Sign In Here &rarr;
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
              or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Full Legal / Display Name" htmlFor="displayName">
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
            />
          </Field>

          <Field label="Email Address" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
              className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
            />
          </Field>

          <Field label="Password" htmlFor="password" hint="Minimum 6 characters">
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Dedicated Workshop Verification Callout (matches main FixGrid app pattern) */}
        <div className="mt-3 flex items-start gap-3 rounded-machined border border-hairline bg-bench p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
            <Store aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xs uppercase tracking-wide text-enamel font-bold">
              Are you an electronics workshop or repair lab?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-steel">
              List your workshop to broadcast vacancies and manage applicant pipelines through our official verification onboarding.{" "}
              <Link
                href={`/join${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}
                className="font-semibold text-signal hover:underline inline-flex items-center gap-1"
              >
                Register on Verification Desk &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bench" />}>
      <SignupForm />
    </Suspense>
  );
}
