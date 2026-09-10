"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, AuthMessage, AuthLink } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Loader2, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/post";

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
      setNotice("Bench credentials verified. Redirecting to recruitment desk...");
      setTimeout(() => {
        router.push(nextTarget);
      }, 700);
    }
  };

  return (
    <AuthShell
      title="Workshop Sign In"
      intro="Access your workshop bench profile to broadcast technician vacancies and manage applicants."
      footer={
        <>
          Need a workshop bench profile?{" "}
          <AuthLink href={`/signup${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}>
            Register Workshop &rarr;
          </AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4.5" noValidate>
        <Field label="Technician / Workshop Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tech@workshop.fixgrid"
            className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
          />
        </Field>

        <Field label="Bench Access Password" htmlFor="password">
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
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-machined bg-signal px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-98"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Verifying Bench Session...</span>
            </>
          ) : (
            <>
              <span>Sign In to Recruitment Desk</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <span className="font-mono text-[11px] text-steel-soft flex items-center justify-center gap-1.5">
            <Lock className="size-3 text-signal" />
            FixGrid Encrypted Supabase Auth &middot; hiring.vytron.me
          </span>
        </div>
      </form>
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
