"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("errorPage");

  React.useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow text-rust">{t("eyebrow")}</p>
      <h1 className="mt-3 text-display">{t("heading")}</h1>
      <p className="mt-4 leading-relaxed text-steel">
        {t("body")}
      </p>

      {error.digest ? (
        <p className="mt-6 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
          {t("reference", { digest: error.digest })}
        </p>
      ) : null}

      <Button size="lg" className="mt-8" onClick={reset}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
