"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, AuthMessage, AuthLink } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/list";

  const { signUp } = useAuth();
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signUp(email, password, shopName);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setNotice("Workshop inventory terminal created! Redirecting to reclamation portal...");
      setTimeout(() => {
        router.push(nextTarget);
      }, 900);
    }
  };

  return (
    <AuthShell
      title="Register Workshop"
      intro="Create an authorized workshop profile to list OEM pulls, tested IC chips, and surplus replacement hardware."
      footer={
        <>
          Already managing an authorized workshop?{" "}
          <AuthLink href={`/login${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}>
            Sign In Here &rarr;
          </AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4.5" noValidate>
        <Field
          label="Workshop / Laboratory Name"
          htmlFor="shopName"
          hint="The trade name displayed on all component listings."
        >
          <input
            id="shopName"
            type="text"
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g., Precision Logic Repair Labs"
            className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
          />
        </Field>

        <Field label="Technician Lead Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parts@precisionlogic.in"
            className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
          />
        </Field>

        <Field label="Workshop Password" htmlFor="password" hint="Minimum 6 characters">
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
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-machined bg-signal px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-98"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Registering Workshop Inventory...</span>
            </>
          ) : (
            <>
              <span>Create Workshop &amp; Continue</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <span className="font-mono text-[11px] text-steel-soft flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 text-verdigris" />
            100% Bench Jig / Multimeter Quality Assurance Standard
          </span>
        </div>
      </form>
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
