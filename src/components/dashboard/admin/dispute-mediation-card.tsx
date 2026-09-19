"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolveDisputeAdmin } from "@/lib/admin/dispute-actions";

interface DisputeMediationCardProps {
  disputeId: string;
  reference: string;
  open: boolean;
}

export function DisputeMediationCard({
  disputeId,
  reference,
  open,
}: DisputeMediationCardProps) {
  const router = useRouter();

  const [resolutionType, setResolutionType] = React.useState<
    "shop_upheld" | "rework_ordered" | "refund_customer"
  >("shop_upheld");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError("Please provide an adjudication reason / note.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("disputeId", disputeId);
    formData.set("resolutionType", resolutionType);
    formData.set("note", note.trim());

    try {
      const res = await resolveDisputeAdmin(formData);
      if (!res.success) {
        setError(res.error ?? "Failed to resolve dispute.");
        setSubmitting(false);
        return;
      }

      setSuccess("Dispute resolved successfully!");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-machined border-2 border-signal/40 bg-gradient-to-br from-signal/5 via-chalk to-bench p-5 shadow-bench ring-2 ring-signal/10">
      <div className="flex items-center gap-2">
        <Gavel className="size-5 text-signal" />
        <h3 className="font-display text-base uppercase tracking-wide text-enamel">
          FixGrid Admin Mediation Desk
        </h3>
      </div>
      <p className="mt-1 text-xs text-steel">
        As the adjudicator on booking <span className="font-mono text-enamel">{reference}</span>,
        review the customer claims, workshop defense notes, and evidence photos above.
      </p>

      {error ? (
        <div className="mt-3 rounded-machined border border-rust/30 bg-rust/10 p-3 text-xs text-rust">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-3 flex items-center gap-2 rounded-machined border border-verdigris/30 bg-verdigris/10 p-3 text-xs text-verdigris">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <form onSubmit={handleResolve} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-enamel">
            Mediation Decision
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setResolutionType("shop_upheld")}
              className={`flex flex-col items-start rounded-machined border p-3 text-left transition-all ${
                resolutionType === "shop_upheld"
                  ? "border-signal bg-signal/10 text-enamel shadow-sm"
                  : "border-hairline bg-chalk text-steel hover:border-steel-soft"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs text-signal">
                <ThumbsUp className="size-3.5" />
                Rule for Workshop
              </div>
              <span className="mt-1 text-[11px] text-steel">
                Customer required to pay repair bill
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResolutionType("rework_ordered")}
              className={`flex flex-col items-start rounded-machined border p-3 text-left transition-all ${
                resolutionType === "rework_ordered"
                  ? "border-signal bg-signal/10 text-enamel shadow-sm"
                  : "border-hairline bg-chalk text-steel hover:border-steel-soft"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs text-signal">
                <RotateCcw className="size-3.5" />
                Order Rework
              </div>
              <span className="mt-1 text-[11px] text-steel">
                Job placed back on bench for rework
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResolutionType("refund_customer")}
              className={`flex flex-col items-start rounded-machined border p-3 text-left transition-all ${
                resolutionType === "refund_customer"
                  ? "border-signal bg-signal/10 text-enamel shadow-sm"
                  : "border-hairline bg-chalk text-steel hover:border-steel-soft"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs text-rust">
                <ShieldAlert className="size-3.5" />
                Refund / Waive
              </div>
              <span className="mt-1 text-[11px] text-steel">
                Customer refunded, job closed
              </span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="adjudication-note" className="block text-xs font-semibold uppercase tracking-wider text-enamel">
            Adjudication Note & Findings
          </label>
          <textarea
            id="adjudication-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Workshop inspected and confirmed display meets OEM specs, customer to settle bill..."
            className="mt-1.5 w-full rounded-machined border border-hairline bg-chalk p-3 text-sm text-enamel placeholder:text-steel focus:border-signal focus:outline-none"
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !note.trim()}
            className="bg-signal text-charcoal hover:bg-signal/90"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Applying Ruling...
              </>
            ) : (
              "Issue Official Ruling"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
