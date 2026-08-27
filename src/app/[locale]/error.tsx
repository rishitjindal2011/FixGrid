"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Must be a Client Component — React needs to
 * attach it during hydration.
 *
 * `error.digest` is the only safe thing to surface: in production Next replaces
 * the real message with a generic one and logs the original server-side under
 * that digest, so printing it lets a support conversation find the actual
 * stack trace without leaking it to the visitor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow text-rust">Something broke</p>
      <h1 className="mt-3 text-display">That didn&apos;t load</h1>
      <p className="mt-4 leading-relaxed text-steel">
        An unexpected error stopped this page from rendering. Trying again usually works —
        if it doesn&apos;t, the problem is on our side.
      </p>

      {error.digest ? (
        <p className="mt-6 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
          Reference {error.digest}
        </p>
      ) : null}

      <Button size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
