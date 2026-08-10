"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUSES = ["all", "draft", "published", "archived"] as const;

/**
 * Filter bar for the pages list.
 *
 * State lives in the URL, not in this component. That means a filtered view is
 * a shareable link, the back button behaves, and a refresh after publishing
 * something lands you where you were. The cost is a server round trip per
 * change, which `useTransition` covers by keeping the old rows visible and
 * dimmed instead of flashing a skeleton.
 *
 * The text box is debounced; the status select is not. Typing produces a
 * request per keystroke, picking from a list produces one.
 */
export function PagesFilterBar({
  status,
  query,
  total,
}: {
  status: string;
  query: string;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  const searchId = useId();
  const statusId = useId();

  // Re-sync when the URL changes from outside this component — a sidebar link
  // to /pages?status=draft must not leave a stale value in the input.
  //
  // Adjusted during render rather than in an effect. An effect would paint the
  // stale value first and then immediately repaint, and the debounce below
  // watches `draft`, so that intermediate value is a real round trip rather
  // than just a flicker.
  if (query !== lastQuery) {
    setLastQuery(query);
    setDraft(query);
  }

  function commit(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Any filter change invalidates the page number — page 4 of the old result
    // set is very unlikely to exist in the new one.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/pages?${qs}` : "/pages"));
  }

  useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(() => commit({ q: draft || null }), 350);
    return () => clearTimeout(timer);
    // `commit` closes over searchParams, which changes on every navigation;
    // depending on it here would restart the timer mid-type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, query]);

  const filtered = status !== "all" || query !== "";

  return (
    <div
      className="mb-4 flex flex-wrap items-end gap-3"
      data-pending={pending ? "" : undefined}
    >
      <div className="flex min-w-52 flex-1 flex-col gap-1.5">
        <label htmlFor={searchId} className="eyebrow">
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
            aria-hidden
          />
          <Input
            id={searchId}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Title or slug"
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex w-40 flex-col gap-1.5">
        <label htmlFor={statusId} className="eyebrow">
          Status
        </label>
        <Select
          id={statusId}
          value={status}
          onChange={(event) => commit({ status: event.target.value })}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? "All statuses" : value}
            </option>
          ))}
        </Select>
      </div>

      {filtered ? (
        <Button variant="ghost" size="md" onClick={() => commit({ status: null, q: null })}>
          <X aria-hidden />
          Clear
        </Button>
      ) : null}

      {/* aria-live so the result count is announced after a filter change. */}
      <p aria-live="polite" className="ml-auto pb-2.5 font-mono text-xs text-steel-soft">
        {pending ? "Filtering…" : `${total} ${total === 1 ? "page" : "pages"}`}
      </p>
    </div>
  );
}
