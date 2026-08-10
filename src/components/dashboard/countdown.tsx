"use client";

import * as React from "react";

/**
 * Countdown to a booking slot.
 *
 * Both moving parts are read through `useSyncExternalStore` rather than
 * `useState` + `useEffect`. The clock and the media query *are* external stores,
 * and this is the hook built for them: no synchronous `setState` in an effect
 * (which `react-hooks/set-state-in-effect` rejects, and rightly — it costs a
 * second render pass on every mount), and hydration is handled by the third
 * argument instead of a `mounted` flag.
 *
 * Three things this has to get right:
 *
 *   • **No hydration mismatch.** `getServerSnapshot` returns `null`, so the
 *     first client render matches the server's and shows `initial` — the string
 *     the server rendered. React then re-reads the store and swaps in live
 *     digits.
 *
 *   • **Reduced motion.** A digit changing every second is motion. Under
 *     `prefers-reduced-motion: reduce` the tick drops to once a minute and the
 *     seconds cell is dropped, so the readout still updates but nothing flickers.
 *
 *   • **Precision matches the tick.** Parts are computed from the tick value,
 *     not from a fresh `Date.now()` during render, so the render stays pure and
 *     the compiler can't cache a frozen timestamp.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/**
 * The wall clock, quantised to `periodMs`.
 *
 * Quantising is what makes the snapshot stable: `useSyncExternalStore` requires
 * two reads between changes to be equal, which a raw `Date.now()` never is.
 * `null` on the server doubles as the not-yet-hydrated signal.
 */
function useQuantisedNow(periodMs: number): number | null {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const id = window.setInterval(onChange, periodMs);
      return () => window.clearInterval(id);
    },
    [periodMs],
  );

  const getSnapshot = React.useCallback(
    () => Math.floor(Date.now() / periodMs) * periodMs,
    [periodMs],
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function partsUntil(targetMs: number, nowMs: number): Parts | null {
  const ms = targetMs - nowMs;
  if (ms <= 0) return null;

  const total = Math.floor(ms / 1000);

  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function Cell({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="rounded-machined border border-hairline bg-bench px-2.5 py-1.5 text-center">
      <span className="block font-mono text-xl leading-none tabular-nums text-enamel">
        {String(value).padStart(2, "0")}
      </span>
      <span className="eyebrow block pt-1 text-[0.5625rem]">{unit}</span>
    </div>
  );
}

export function BookingCountdown({
  target,
  initial,
  startedLabel = "Happening now",
}: {
  /** ISO timestamp of the slot's start. */
  target: string;
  /** Server-rendered fallback, shown until this component hydrates. */
  initial: string;
  startedLabel?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const nowMs = useQuantisedNow(reduced ? 60_000 : 1_000);

  const targetMs = React.useMemo(() => new Date(target).getTime(), [target]);

  // Server render, and any client before hydration: the server's own words.
  if (nowMs === null) {
    return (
      <p className="font-mono text-sm tabular-nums text-enamel">{initial}</p>
    );
  }

  const parts = partsUntil(targetMs, nowMs);

  if (!parts) {
    return (
      <p className="inline-flex items-center gap-2 font-display text-sm uppercase tracking-wide text-signal">
        <span aria-hidden className="status-dot status-dot--live size-1.5" />
        {startedLabel}
      </p>
    );
  }

  return (
    <div className="flex items-start gap-1.5" role="timer">
      {parts.days > 0 ? <Cell value={parts.days} unit="days" /> : null}
      <Cell value={parts.hours} unit="hrs" />
      <Cell value={parts.minutes} unit="min" />
      {reduced ? null : <Cell value={parts.seconds} unit="sec" />}
    </div>
  );
}
