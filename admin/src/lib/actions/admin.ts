"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  requireEditor,
  requireOwner,
  type AdminSession,
} from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditWallet } from "@/lib/wallet";
import { formatMoney } from "@/lib/format";
import type { AdminActionState } from "@/lib/actions/state";

/**
 * Platform-admin mutations.
 *
 * Two things make this file different from the server actions in the other two
 * apps, and both are worth stating plainly:
 *
 *   1. **There is no RLS here.** Every write goes through the service-role
 *      client, which bypasses policies entirely. In the consumer app a missing
 *      authorisation check is caught by the database; here it is not caught by
 *      anything. The role gate at the top of each action IS the security model.
 *
 *   2. **These actions are reachable as bare endpoints.** `src/proxy.ts` guards
 *      navigation, but a server action is a POST that never passes through a
 *      route match. Every action re-checks the session for itself, first, before
 *      it reads a single form field.
 */

/* ── Result helpers ───────────────────────────────────────────────────────── */

function FAILED(error: string): AdminActionState {
  return { error, success: false };
}

function OK(message?: string): AdminActionState {
  return { error: null, success: true, message };
}

/**
 * Postgres error codes worth translating.
 *
 * Anything unrecognised keeps the caller's fallback but *appends the code*, and
 * the full error is logged server-side. An internal tool that says only "could
 * not be approved" is unactionable: the operator cannot tell a permissions
 * problem from a constraint violation from a missing table, and neither can
 * anyone they report it to. The code is short, harmless to show three people
 * with database access, and turns a support conversation into a lookup.
 */
function explain(
  error: { code?: string | null; message?: string | null; details?: string | null } | null,
  fallback: string,
): string {
  const code = error?.code ?? undefined;

  switch (code) {
    case "23503":
      return "Something this record depends on no longer exists. Reload and try again.";
    case "23505":
      return "That has already been recorded.";
    case "23514": {
      // The message names the constraint: `... violates check constraint "x"`.
      // Naming it is the difference between a dead end and a fix, because the
      // offending column is almost never one this action wrote — a CHECK is
      // re-evaluated for the whole row, so pre-existing bad data in an unrelated
      // column blocks every future update to that row.
      const named = /check constraint "([^"]+)"/.exec(error?.message ?? "");
      return named
        ? `The database rejected this row: it breaks the "${named[1]}" constraint. That is usually pre-existing bad data in another column of the same row, not the change you just made.`
        : "The database rejected that value — it breaks a check constraint on the table.";
    }
    case "22P02":
      return "One of the values sent was malformed. Reload the page and try again.";
    case "42501":
      return "The database refused the write. The service-role key looks wrong or is missing.";
    case "42703":
      return "This app wrote to a column that does not exist — the migration is out of step with the code.";
    case "42P01":
      return "The marketplace tables are not present. Apply supabase/migrations/001_marketplace.sql.";
    default:
      return code ? `${fallback} (database said: ${code})` : fallback;
  }
}

/**
 * Log a failed write in full.
 *
 * `console.error(error.message)` alone loses `code`, `details` and `hint`, which
 * are the three fields that actually identify a Postgres failure.
 */
function logWriteFailure(
  scope: string,
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null,
): void {
  if (!error) return;
  console.error(`[admin] ${scope} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * Run a role gate and turn its throw into a sentence.
 *
 * `requireEditor`/`requireOwner` throw `UNAUTHENTICATED`/`FORBIDDEN`, which is
 * right for a page — the error boundary sends them to the login screen. Inside
 * an action it would surface as a generic crash on a form the user is looking
 * at, so it is converted here instead.
 */
async function gate(
  level: "editor" | "owner",
): Promise<{ session: AdminSession } | { error: string }> {
  try {
    const session = level === "owner" ? await requireOwner() : await requireEditor();
    return { session };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "";
    if (reason === "UNAUTHENTICATED") {
      return { error: "Your session has expired. Sign in again." };
    }
    return {
      error:
        level === "owner"
          ? "This action needs owner access."
          : "This action needs editor access.",
    };
  }
}

/** `"49.99"` → `4999`. Rejects more than two decimal places rather than rounding. */
function rupeesToPaise(value: string): number | null {
  const trimmed = value.trim().replace(/^₹/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

/* ── Claims ───────────────────────────────────────────────────────────────── */

/**
 * Approving a claim is what makes a shop ownable, and until one is approved the
 * marketplace cannot function at all: `fixer_profiles.owner_id` stays null, no
 * expert dashboard resolves, and no booking can be accepted by anyone.
 *
 * Note what this action does NOT do. `shop_claims_apply` in the migration is a
 * BEFORE UPDATE trigger that sets `fixer_profiles.owner_id = new.user_id` the
 * moment the status becomes 'approved'. Setting it here as well would be a
 * second writer to the same column with no coordination between them — so the
 * trigger stays the only thing that assigns ownership, and this action only
 * moves the claim's own status.
 */
const ClaimDecisionSchema = z.object({
  claimId: z.string().uuid("That claim could not be found."),
  note: z.string().trim().max(2000, "Keep the note under 2000 characters.").optional(),
});

export async function approveClaim(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = ClaimDecisionSchema.safeParse({
    claimId: formData.get("claimId"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That claim could not be approved.");
  }

  const supabase = createAdminClient();

  // Guarded on the current status rather than blindly written. Two admins with
  // the queue open is the ordinary case, and the second one should be told the
  // decision was already made rather than silently re-approving it.
  const { data, error } = await supabase
    .from("shop_claims")
    .update({
      status: "approved",
      reviewed_by: allowed.session.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note ?? null,
    })
    .eq("id", parsed.data.claimId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    logWriteFailure("approveClaim", error);
    return FAILED(
      explain(error, "That claim could not be approved."));
  }
  if (!data) {
    return FAILED("That claim is no longer pending — someone else has already decided it.");
  }

  revalidateClaims(parsed.data.claimId);
  return OK("Claim approved. The shop now has an owner.");
}

export async function rejectClaim(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  // A rejection reason is required where an approval's is optional: the person
  // on the other end has to know what to fix before claiming again, and "no"
  // with no explanation generates a support conversation every time.
  const parsed = ClaimDecisionSchema.extend({
    note: z
      .string()
      .trim()
      .min(10, "Say why this claim was rejected — the claimant sees this.")
      .max(2000, "Keep the note under 2000 characters."),
  }).safeParse({
    claimId: formData.get("claimId"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That claim could not be rejected.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shop_claims")
    .update({
      status: "rejected",
      reviewed_by: allowed.session.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note,
    })
    .eq("id", parsed.data.claimId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    logWriteFailure("rejectClaim", error);
    return FAILED(
      explain(error, "That claim could not be rejected."));
  }
  if (!data) {
    return FAILED("That claim is no longer pending — someone else has already decided it.");
  }

  revalidateClaims(parsed.data.claimId);
  return OK("Claim rejected.");
}

function revalidateClaims(claimId: string): void {
  revalidatePath("/claims");
  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/experts");
  revalidatePath("/");
}

/* ── Shop verification ────────────────────────────────────────────────────── */

const VerifySchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  verified: z.boolean(),
});

/**
 * The verified tick on a shop's public listing.
 *
 * Only this app's own paths are revalidated. The consumer app runs as a
 * separate Next process on another port, so `revalidatePath` here cannot reach
 * its cache — the public page picks the change up on its own revalidation
 * window. Cross-app invalidation would need a shared cache or a webhook, and
 * neither exists yet.
 */
export async function verifyShop(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = VerifySchema.safeParse({
    fixerId: formData.get("fixerId"),
    verified: formData.get("verified") === "1" || formData.get("verified") === "true",
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That shop could not be updated.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("fixer_profiles")
    .update({ verified: parsed.data.verified })
    .eq("id", parsed.data.fixerId);

  if (error) {
    logWriteFailure("verifyShop", error);
    return FAILED(
      explain(error, "That shop could not be updated."));
  }

  revalidatePath("/experts");
  revalidatePath(`/experts/${parsed.data.fixerId}`);
  revalidatePath("/claims");

  return OK(parsed.data.verified ? "Shop verified." : "Verification removed.");
}

/* ── Disputes ─────────────────────────────────────────────────────────────── */

const RESOLUTIONS = ["refund_full", "refund_partial", "redo_service", "no_action"] as const;

/** The two outcomes that move money, and therefore need an amount. */
const REFUND_RESOLUTIONS: readonly string[] = ["refund_full", "refund_partial"];

const ResolveSchema = z.object({
  disputeId: z.string().uuid("That claim could not be found."),
  resolution: z.enum(RESOLUTIONS),
  note: z
    .string()
    .trim()
    .min(10, "Record why this was decided — both parties see it.")
    .max(4000, "Keep the note under 4000 characters."),
  refundAmount: z.string().trim().optional(),
});

export async function resolveDispute(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = ResolveSchema.safeParse({
    disputeId: formData.get("disputeId"),
    resolution: formData.get("resolution"),
    note: formData.get("note"),
    refundAmount: formData.get("refundAmount") ?? undefined,
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That claim could not be resolved.");
  }

  const { disputeId, resolution, note } = parsed.data;

  let refundPence: number | null = null;
  if (REFUND_RESOLUTIONS.includes(resolution)) {
    const raw = parsed.data.refundAmount ?? "";
    if (!raw) return FAILED("Enter the refund amount.");

    refundPence = rupeesToPaise(raw);
    if (refundPence === null) {
      return FAILED("That refund amount is not a valid figure — use rupees and paise, e.g. 49.99.");
    }
    if (refundPence <= 0) return FAILED("A refund has to be more than zero.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_note: note,
      refund_amount: refundPence,
      resolved_by: allowed.session.adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId)
    .neq("status", "resolved")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    logWriteFailure("resolveDispute", error);
    return FAILED(
      explain(error, "That claim could not be resolved."));
  }
  if (!data) {
    return FAILED("That claim has already been resolved.");
  }

  // The decision is part of the record the parties read, not just a status
  // change. A resolution with no entry in the transcript reads, from their side,
  // as the conversation simply stopping.
  const { error: noteError } = await supabase.from("dispute_messages").insert({
    dispute_id: disputeId,
    author_id: null,
    author_role: "admin",
    body: note,
  });

  if (noteError) {
    // The resolution itself landed. Reporting failure now would invite a second
    // attempt against a dispute that is already resolved.
    console.error("[admin] resolution note failed", noteError.message);
  }

  revalidatePath("/disputes");
  revalidatePath(`/disputes/${disputeId}`);
  revalidatePath("/");

  return OK("Claim resolved.");
}

const DisputeNoteSchema = z.object({
  disputeId: z.string().uuid("That claim could not be found."),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(4000, "Keep it under 4000 characters."),
});

export async function addDisputeNote(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = DisputeNoteSchema.safeParse({
    disputeId: formData.get("disputeId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That reply could not be sent.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("dispute_messages").insert({
    dispute_id: parsed.data.disputeId,
    author_id: null,
    author_role: "admin",
    body: parsed.data.body,
  });

  if (error) {
    logWriteFailure("addDisputeNote", error);
    return FAILED(
      explain(error, "That reply could not be sent."));
  }

  revalidatePath(`/disputes/${parsed.data.disputeId}`);
  return OK("Reply sent.");
}

const DisputeStatusSchema = z.object({
  disputeId: z.string().uuid("That claim could not be found."),
  status: z.enum(["open", "awaiting_customer", "awaiting_shop", "under_review"]),
});

export async function setDisputeStatus(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = DisputeStatusSchema.safeParse({
    disputeId: formData.get("disputeId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That claim could not be updated.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("disputes")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.disputeId)
    .neq("status", "resolved");

  if (error) {
    logWriteFailure("setDisputeStatus", error);
    return FAILED(
      explain(error, "That claim could not be updated."));
  }

  revalidatePath("/disputes");
  revalidatePath(`/disputes/${parsed.data.disputeId}`);
  return OK("Claim updated.");
}

/* ── Payouts ──────────────────────────────────────────────────────────────── */

const PayoutPaidSchema = z.object({
  payoutId: z.string().uuid("That payout could not be found."),
  providerPayoutId: z
    .string()
    .trim()
    .min(3, "Enter the provider's payout reference — without it this cannot be reconciled later.")
    .max(200, "That reference is too long."),
});

/**
 * Owner-only, both of these: this is the only screen in the platform where a
 * mis-click moves real money out.
 *
 * The provider reference is required rather than optional. A payout marked paid
 * with nothing tying it to the bank's record cannot be reconciled when someone
 * asks three months later where their money went, and by then the person who
 * clicked it will not remember either.
 */
export async function markPayoutPaid(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = PayoutPaidSchema.safeParse({
    payoutId: formData.get("payoutId"),
    providerPayoutId: formData.get("providerPayoutId"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That payout could not be updated.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("payouts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_payout_id: parsed.data.providerPayoutId,
    })
    .eq("id", parsed.data.payoutId)
    .neq("status", "paid")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    logWriteFailure("markPayoutPaid", error);
    return FAILED(
      explain(error, "That payout could not be updated."));
  }
  if (!data) {
    return FAILED("That payout is already marked paid.");
  }

  revalidatePath("/payouts");
  revalidatePath("/");
  return OK("Payout marked paid.");
}

const PayoutFailedSchema = z.object({
  payoutId: z.string().uuid("That payout could not be found."),
  reason: z
    .string()
    .trim()
    .min(3, "Record why it failed.")
    .max(500, "Keep the reason under 500 characters."),
});

export async function markPayoutFailed(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = PayoutFailedSchema.safeParse({
    payoutId: formData.get("payoutId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That payout could not be updated.");
  }

  const supabase = createAdminClient();

  // `payouts` has no failure_reason column, so the reason rides in the provider
  // reference field prefixed to mark it as a note rather than a real id. Better
  // than dropping it; worth a column of its own if this becomes routine.
  const { error } = await supabase
    .from("payouts")
    .update({
      status: "failed",
      provider_payout_id: `FAILED: ${parsed.data.reason}`.slice(0, 200),
    })
    .eq("id", parsed.data.payoutId);

  if (error) {
    logWriteFailure("markPayoutFailed", error);
    return FAILED(
      explain(error, "That payout could not be updated."));
  }

  revalidatePath("/payouts");
  return OK("Payout marked failed.");
}

/* ── Shop suspension ──────────────────────────────────────────────────────── */

const SuspendSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason — the shop owner is shown this word for word.")
    .max(2000, "Keep the reason under 2000 characters."),
});

/**
 * Take a shop out of the directory.
 *
 * Owner-only. Suspension stops a real business trading: it disappears from
 * search, cannot take bookings, and its owner sees the reason on their
 * dashboard until it is lifted. That is a heavier action than approving a claim,
 * so it sits with payouts on the owner side of the gate rather than with the
 * editor-level moderation calls.
 *
 * `suspended_at` is the flag; `is_hidden` is deliberately untouched. They mean
 * different things — "never reviewed" versus "reviewed and stopped" — and
 * conflating them would make lifting a suspension silently publish a shop that
 * had never been approved in the first place.
 */
export async function suspendShop(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = SuspendSchema.safeParse({
    fixerId: formData.get("fixerId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That shop could not be suspended.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspended_reason: parsed.data.reason,
      suspended_by: allowed.session.adminId,
      // A suspended shop must not keep collecting requests it cannot service.
      accepts_bookings: false,
    })
    .eq("id", parsed.data.fixerId)
    .is("suspended_at", null)
    .select("id, shop_name")
    .maybeSingle<{ id: string; shop_name: string }>();

  if (error) {
    logWriteFailure("suspendShop", error);
    return FAILED(explain(error, "That shop could not be suspended."));
  }
  if (!data) {
    return FAILED("That shop is already suspended, or no longer exists.");
  }

  revalidatePath("/experts");
  revalidatePath(`/experts/${parsed.data.fixerId}`);
  revalidatePath("/");

  return OK(`${data.shop_name} is suspended.`);
}

/**
 * Lift a suspension.
 *
 * `accepts_bookings` is NOT restored. It was switched off by the suspension, but
 * whether a shop wants to take bookings again — and whether it is ready to — is
 * the owner's call, not something to guess at from an admin console.
 */
export async function unsuspendShop(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const fixerId = z.string().uuid().safeParse(formData.get("fixerId"));
  if (!fixerId.success) return FAILED("That shop could not be found.");

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .update({ suspended_at: null, suspended_reason: null, suspended_by: null })
    .eq("id", fixerId.data)
    .select("id, shop_name")
    .maybeSingle<{ id: string; shop_name: string }>();

  if (error) {
    logWriteFailure("unsuspendShop", error);
    return FAILED(explain(error, "That suspension could not be lifted."));
  }
  if (!data) return FAILED("That shop no longer exists.");

  revalidatePath("/experts");
  revalidatePath(`/experts/${fixerId.data}`);
  revalidatePath("/");

  return OK(
    `${data.shop_name} is no longer suspended. They still need to switch bookings back on themselves.`,
  );
}

/* ── Notices ──────────────────────────────────────────────────────────────── */

const NoticeSchema = z.object({
  fixerId: z.string().uuid("That shop could not be found."),
  subject: z
    .string()
    .trim()
    .min(2, "Give the notice a subject.")
    .max(200, "Keep the subject under 200 characters."),
  body: z
    .string()
    .trim()
    .min(2, "Write the notice.")
    .max(4000, "Keep the notice under 4000 characters."),
  severity: z.enum(["info", "warning", "urgent"]),
});

/**
 * Send a shop owner a message they have to acknowledge.
 *
 * Editor-level: this is how moderation talks to a shop before it escalates to a
 * suspension, and making it owner-only would push people towards the heavier
 * action because it was the one they could reach.
 *
 * Insert-only by design. `shop_notices` has no admin-facing edit or delete
 * because a notice is a record of what was said and when — being able to revise
 * one after the owner has read it would make the acknowledgement meaningless.
 */
export async function sendShopNotice(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("editor");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = NoticeSchema.safeParse({
    fixerId: formData.get("fixerId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    severity: formData.get("severity") ?? "info",
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That notice could not be sent.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("shop_notices").insert({
    fixer_id: parsed.data.fixerId,
    sent_by: allowed.session.adminId,
    subject: parsed.data.subject,
    body: parsed.data.body,
    severity: parsed.data.severity,
  });

  if (error) {
    logWriteFailure("sendShopNotice", error);
    return FAILED(explain(error, "That notice could not be sent."));
  }

  revalidatePath(`/experts/${parsed.data.fixerId}`);

  return OK("Notice sent. The owner sees it next time they open their dashboard.");
}

/* ── User roles ───────────────────────────────────────────────────────────── */

const RoleSchema = z.object({
  userId: z.string().uuid("That account could not be found."),
  role: z.enum(["customer", "fixer", "admin"]),
});

/**
 * Change what a `public.users` row claims to be.
 *
 * Owner-only, and narrower than it looks. `users.role` is descriptive — the
 * things that actually grant power are `fixer_profiles.owner_id` for the expert
 * dashboard and the separate `seo_admins` table for this console. Setting
 * someone to `admin` here does NOT let them sign in to the admin panel, and it
 * is worth knowing that before using this to grant access that never arrives.
 */
export async function setUserRole(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = RoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That role could not be set.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId)
    .select("id, display_name")
    .maybeSingle<{ id: string; display_name: string | null }>();

  if (error) {
    logWriteFailure("setUserRole", error);
    return FAILED(explain(error, "That role could not be set."));
  }
  if (!data) return FAILED("That account no longer exists.");

  revalidatePath("/users");
  revalidatePath(`/customers/${parsed.data.userId}`);

  return OK(`${data.display_name ?? "That account"} is now ${parsed.data.role}.`);
}

/* ── Wallets ──────────────────────────────────────────────────────────────── */

const TopUpSchema = z.object({
  ownerKind: z.enum(["user", "shop"]),
  ownerId: z.string().uuid("That account could not be found."),
  amount: z.string().trim().min(1, "Enter an amount."),
  memo: z.string().trim().max(200, "Keep the note under 200 characters.").optional(),
});

/**
 * Put money into a customer's or a shop's balance.
 *
 * This action is the payment gateway. There is no card rail yet, so every rupee
 * in the system entered through here, and the platform wallet's balance is the
 * running total of what we have paid in minus what we have taken back in fees.
 *
 * **Owner-only, and that is not arbitrary.** An editor can approve claims and
 * resolve disputes; neither of those conjures money. This does. It sits with
 * `markPayoutPaid` and `setUserRole` on the owner side of the line for the same
 * reason: the blast radius is the platform's own funds.
 *
 * Deliberately has no matching "debit" action. Taking money out of someone's
 * balance from a console, with no booking behind it, is not an operation this
 * product should make easy — a correction goes through `adjustment` with a memo
 * naming why, which is a conversation rather than a button.
 */
export async function topUpWallet(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const allowed = await gate("owner");
  if ("error" in allowed) return FAILED(allowed.error);

  const parsed = TopUpSchema.safeParse({
    ownerKind: formData.get("ownerKind"),
    ownerId: formData.get("ownerId"),
    amount: formData.get("amount"),
    memo: formData.get("memo") ?? undefined,
  });
  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "That top-up could not be posted.");
  }

  const minor = rupeesToPaise(parsed.data.amount);
  if (minor === null) {
    return FAILED("Enter the amount in rupees, like 500 or 500.50.");
  }
  if (minor <= 0) return FAILED("Enter an amount above zero.");
  // A cap, because this is a free-text field that mints money and a slipped
  // decimal is the likeliest mistake anyone will make on this screen.
  if (minor > 100_000_00) return FAILED("Top-ups are capped at ₹100,000 per entry.");

  const result = await creditWallet({
    kind: "topup",
    amountMinor: minor,
    to: { kind: parsed.data.ownerKind, ownerId: parsed.data.ownerId },
    memo: parsed.data.memo || `Top-up by ${allowed.session.email}`,
  });

  if (!result.ok) return FAILED(result.error);

  revalidatePath("/customers");
  revalidatePath(`/customers/${parsed.data.ownerId}`);
  revalidatePath("/experts");
  revalidatePath(`/experts/${parsed.data.ownerId}`);

  return OK(`${formatMoney(minor)} added.`);
}
