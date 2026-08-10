"use client";

import { useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Export a page's rendered HTML.
 *
 * A plain `<a download>` would be simpler, but the route answers failures with
 * a JSON body and a 4xx/5xx status. A browser navigating to that shows the raw
 * JSON — or worse, silently downloads a file called `page.html` containing an
 * error object. Fetching lets the failure be read and shown in place.
 *
 * The blob URL is revoked on the next tick rather than immediately: Safari has
 * not started the download by the time `click()` returns.
 */
export function ExportHtmlButton({ pageId, status }: { pageId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/export-html?id=${encodeURIComponent(pageId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        // The route always sends `{ error }` on failure. A non-JSON body here
        // means something upstream of the route answered instead — a proxy, or
        // an expired session redirected to the login page.
        const detail = await response
          .json()
          .then((body: unknown) =>
            body && typeof body === "object" && "error" in body ? String(body.error) : null,
          )
          .catch(() => null);

        setError(detail ?? `Export failed (${response.status}).`);
        return;
      }

      const blob = await response.blob();
      const filename = filenameFrom(response.headers.get("content-disposition"));
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        disabled={busy}
        title={
          status === "published"
            ? "Download the live HTML"
            : "Downloads the draft render via preview mode"
        }
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        {busy ? "Exporting…" : "Export HTML"}
      </Button>

      {error ? (
        <span
          role="alert"
          className="flex max-w-xs items-start gap-1.5 text-right text-xs leading-snug text-rust"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** Prefer the server's filename; fall back rather than trusting a parse. */
function filenameFrom(header: string | null): string {
  const match = header?.match(/filename="([^"]+)"/);
  const name = match?.[1]?.trim();
  // Defensive: a filename with a path separator in it would be a path traversal
  // attempt against the user's own download directory.
  if (!name || name.includes("/") || name.includes("\\")) return "page.html";
  return name;
}
