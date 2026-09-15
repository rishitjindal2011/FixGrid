"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function GoogleSignInButton({
  next,
  label = "Continue with Google",
}: {
  next?: string;
  label?: string;
}) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    const res = await signInWithGoogle(
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || "/")}`
        : undefined
    );
    if (res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-machined border border-hairline bg-chalk px-4 py-2.5 text-sm font-semibold text-enamel shadow-xs hover:bg-bench hover:border-steel-soft focus:outline-none focus:ring-1 focus:ring-signal transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin text-steel" />
            <span className="text-steel">Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>
      {error && <p className="mt-1.5 text-xs text-signal font-mono">{error}</p>}
    </div>
  );
}
