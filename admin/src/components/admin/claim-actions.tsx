"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveClaim, rejectClaim } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";

/**
 * Approve / reject, with the note each decision requires.
 *
 * Client-side because both need `useActionState` — a decision that appears to do
 * nothing is the worst outcome on this screen, since the reviewer's instinct is
 * to click again and a second approval on a shop that now has an owner is
 * exactly the mistake worth preventing.
 *
 * The two actions share one state slot deliberately: they are mutually exclusive
 * outcomes of the same decision, and separate states would let a stale "Claim
 * approved." linger under a rejection error.
 */
export function ClaimActions({
  claimId,
  shopName,
  shopAlreadyOwned,
}: {
  claimId: string;
  shopName: string;
  /** True when `fixer_profiles.owner_id` is already set for this shop. */
  shopAlreadyOwned: boolean;
}) {
  const [approveState, approve, approving] = useActionState(approveClaim, ADMIN_INITIAL_STATE);
  const [rejectState, reject, rejecting] = useActionState(rejectClaim, ADMIN_INITIAL_STATE);
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");

  const busy = approving || rejecting;
  const state = approveState.error || approveState.success ? approveState : rejectState;

  if (state.success) {
    return (
      <div
        role="status"
        className="rounded-machined border border-hairline bg-verdigris-wash px-4 py-3 text-sm text-enamel"
      >
        {state.message ?? "Decision recorded."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
      <h2 className="font-display text-sm uppercase tracking-wide text-enamel">Decision</h2>

      {shopAlreadyOwned ? (
        <p className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-sm text-enamel">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-rust" />
          <span>
            <strong>{shopName}</strong> already has an owner. Approving this claim hands control of a
            live listing to a different account, and the current owner is not told. Confirm the
            evidence before continuing.
          </span>
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-rust">
          {state.error}
        </p>
      ) : null}

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setMode("approve")} disabled={busy}>
            <Check aria-hidden className="size-4" />
            Approve claim
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("reject")}
            disabled={busy}
          >
            <X aria-hidden className="size-4" />
            Reject
          </Button>
        </div>
      ) : null}

      {mode === "approve" ? (
        <form action={approve} className="flex flex-col gap-3">
          <input type="hidden" name="claimId" value={claimId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="approve-note" className="eyebrow text-steel">
              Note (optional)
            </label>
            <Textarea id="approve-note" name="note" rows={3} maxLength={2000} />
          </div>
          <p className="text-xs text-steel">
            Approving sets {shopName} to this claimant and gives them the expert dashboard
            immediately.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={approving}>
              {approving ? "Approving…" : "Confirm approval"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "reject" ? (
        <form action={reject} className="flex flex-col gap-3">
          <input type="hidden" name="claimId" value={claimId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="reject-note" className="eyebrow text-steel">
              Reason — required
            </label>
            <Textarea
              id="reject-note"
              name="note"
              rows={3}
              required
              minLength={10}
              maxLength={2000}
              placeholder="What was missing or wrong, and what would make a fresh claim succeed."
            />
          </div>
          <p className="text-xs text-steel">The claimant sees this. Write it for them.</p>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={rejecting}>
              {rejecting ? "Rejecting…" : "Confirm rejection"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
