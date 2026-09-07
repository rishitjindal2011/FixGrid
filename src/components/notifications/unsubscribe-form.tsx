"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MailCheck,
  ShieldCheck,
  AlertCircle,
  BellOff,
  Wrench,
  RotateCcw,
} from "lucide-react";
import {
  processUnsubscribe,
  resubscribeEmail,
  type UnsubscribeState,
} from "@/lib/notifications/unsubscribe-actions";

export function UnsubscribeForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [state, formAction, isPending] = useActionState<UnsubscribeState, FormData>(
    processUnsubscribe,
    { email: initialEmail },
  );

  const [resubState, resubAction, isResubPending] = useActionState<
    UnsubscribeState,
    FormData
  >(resubscribeEmail, {});

  const isUnsubscribed = state.success && !resubState.success;
  const isResubscribed = resubState.success;

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 via-teal-800 to-orange-600 shadow-md shadow-orange-500/10">
          <Wrench className="size-6 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
          Communication Preferences
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Email Subscription Center
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage what communications you receive from FixGrid Verified Repair Network.
        </p>
      </div>

      {/* Main Card Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur sm:p-8">
        {/* State: Successfully Unsubscribed */}
        {isUnsubscribed ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="size-7" />
            </div>

            <h2 className="text-xl font-bold text-white">
              You Have Been Unsubscribed
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              <span className="font-semibold text-emerald-400">{state.email}</span> will no
              longer receive marketing promotions, newsletter editions, or promotional campaigns from FixGrid.
            </p>

            <div className="my-6 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-400" />
                <div className="text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-200">Critical Account Security Preserved:</strong> You will continue to receive essential transactional notifications, such as booking status receipts, warranty confirmations, and password reset links for any active repair orders.
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <form action={resubAction}>
                <input type="hidden" name="email" value={state.email ?? email} />
                <button
                  type="submit"
                  disabled={isResubPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
                >
                  <RotateCcw className="size-4" />
                  {isResubPending ? "Updating..." : "Resubscribe to Updates"}
                </button>
              </form>

              <Link
                href="/search"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 sm:w-auto"
              >
                Return to Repair Network
              </Link>
            </div>
          </div>
        ) : isResubscribed ? (
          /* State: Successfully Resubscribed */
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30">
              <MailCheck className="size-7" />
            </div>

            <h2 className="text-xl font-bold text-white">Welcome Back!</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              <span className="font-semibold text-sky-400">{resubState.email}</span> has been
              successfully resubscribed to FixGrid updates and repair insights.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-orange-600 px-6 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500"
            >
              Explore FixGrid
            </Link>
          </div>
        ) : (
          /* Default Unsubscribe Form */
          <form action={formAction} className="flex flex-col gap-6">
            {state.error ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Email Address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                This address will be opted out of all non-transactional mailings.
              </p>
            </div>

            {/* Granular Scope Summary */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                What will change
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
                  <BellOff className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Marketing, Offers & Announcements
                  </div>
                  <div className="text-xs text-slate-400">
                    You will no longer receive periodic newsletters, discounts, or service updates.
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">
                      Transactional & Booking Security
                    </div>
                    <div className="text-xs text-slate-400">
                      Critical repair milestones, receipts, and 90-day warranty passports remain protected and active.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BellOff className="size-4" />
              {isPending ? "Unsubscribing..." : "Unsubscribe from Marketing Emails"}
            </button>
          </form>
        )}
      </div>

      {/* Account Settings Helper */}
      <div className="mt-8 text-center text-xs text-slate-400">
        Already have a registered account?{" "}
        <Link
          href="/dashboard/settings"
          className="font-medium text-sky-400 underline underline-offset-4 hover:text-sky-300"
        >
          Manage fine-grained notification preferences in your dashboard
        </Link>
      </div>
    </div>
  );
}
