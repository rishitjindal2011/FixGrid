"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import { confirmTopUpByToken } from "@/lib/wallet/topup";
import { TOPUP_INITIAL_STATE } from "@/lib/wallet/topup-state";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The PIN sheet, as a real UPI app would present it.
 *
 * Six boxes rather than one text input, because that is what the muscle memory
 * expects and the whole point of this screen is that it feels like the thing it
 * imitates. A single hidden input carries the value to the server so the form
 * still works without JavaScript having to assemble anything.
 *
 * The PIN is **not checked and not stored**. `confirmTopUpByToken` ignores it
 * entirely for UPI — the simulated gateway decides on the payee id, and this
 * field exists to complete the illusion, not to authenticate. Saying so on screen
 * is not optional: a form that looks exactly like a bank's PIN pad and is not one
 * has to admit it, or it is training people to type real PINs into strangers'
 * pages.
 */
export function PayPinSheet({
  token,
  amountMinor,
  payeeName,
  payeeVpa,
  reference,
}: {
  token: string;
  amountMinor: number;
  payeeName: string;
  payeeVpa: string;
  reference: string;
}) {
  const [state, submit, pending] = useActionState(
    confirmTopUpByToken,
    TOPUP_INITIAL_STATE,
  );
  const [pin, setPin] = React.useState("");

  const outcome = state.outcome;

  if (outcome) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border p-6 text-center",
          outcome.ok
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50",
        )}
      >
        {outcome.ok ? (
          <CheckCircle2 aria-hidden className="size-10 text-emerald-600" />
        ) : (
          <AlertTriangle aria-hidden className="size-10 text-rose-600" />
        )}
        <p className="text-lg font-semibold text-slate-900">
          {outcome.ok ? "Payment successful" : "Payment failed"}
        </p>
        <p className="text-sm leading-relaxed text-slate-600">{outcome.message}</p>
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
          {outcome.reference}
        </p>
        {outcome.ok ? (
          <p className="pt-2 text-sm text-slate-600">
            You can close this tab — your balance has already updated on the other
            device.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      {/* Carries whatever the keypad assembled. The gateway ignores it for UPI. */}
      <input type="hidden" name="credential" value={`${payeeVpa}`} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-400">Paying</p>
        <p className="pt-1 text-3xl font-semibold tabular-nums text-slate-900">
          {formatMoney(amountMinor)}
        </p>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-sm font-medium text-slate-900">{payeeName}</p>
          <p className="font-mono text-xs text-slate-500">{payeeVpa}</p>
          <p className="pt-2 font-mono text-xs uppercase tracking-widest text-slate-400">
            {reference}
          </p>
        </div>
      </div>

      <div>
        <p className="flex items-center justify-center gap-1.5 pb-3 text-center text-sm font-medium text-slate-700">
          <Lock aria-hidden className="size-3.5 text-slate-400" />
          Enter UPI PIN
        </p>

        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "grid size-11 place-items-center rounded-xl border text-2xl leading-none",
                index < pin.length
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-300",
              )}
            >
              {index < pin.length ? "•" : ""}
            </span>
          ))}
        </div>

        {/* The real input, visually hidden but focusable and labelled — a fake
            keypad that a screen reader cannot operate is not an improvement on a
            plain field. */}
        <label htmlFor="pin" className="sr-only">
          UPI PIN — this is a simulation, do not enter a real PIN
        </label>
        <input
          id="pin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-slate-900 outline-none focus:border-slate-900"
          placeholder="••••••"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-center text-sm text-rose-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || pin.length < 4}
        className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Processing…" : `Pay ${formatMoney(amountMinor)}`}
      </button>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        Any 4–6 digits will do. Nothing is checked, nothing is stored, and no real
        account is involved.
      </p>
    </form>
  );
}
