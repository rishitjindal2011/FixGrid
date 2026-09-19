"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditFromPlatform } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";
import type { BookingStatus, DisputeResolution } from "@/lib/types/marketplace";

const ResolveDisputeSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID."),
  resolutionType: z.enum(["shop_upheld", "rework_ordered", "refund_customer"]),
  note: z.string().trim().min(5, "Please provide an adjudication reason."),
});

export async function resolveDisputeAdmin(formData: FormData) {
  const parsed = ResolveDisputeSchema.safeParse({
    disputeId: formData.get("disputeId"),
    resolutionType: formData.get("resolutionType"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid resolution input." };
  }

  const { disputeId, resolutionType, note } = parsed.data;
  const admin = createAdminClient();

  const { data: dispute, error: dError } = await admin
    .from("disputes")
    .select(`
      id, booking_id, status,
      booking:bookings!disputes_booking_fkey (
        id, reference, status, customer_id, fixer_id, final_amount, quoted_amount, currency
      )
    `)
    .eq("id", disputeId)
    .maybeSingle<{
      id: string;
      booking_id: string;
      status: string;
      booking: {
        id: string;
        reference: string;
        status: BookingStatus;
        customer_id: string;
        fixer_id: string;
        final_amount: number | null;
        quoted_amount: number | null;
        currency: string;
      } | null;
    }>();

  if (dError || !dispute || !dispute.booking) {
    return { success: false, error: "Dispute record not found." };
  }

  const booking = dispute.booking;
  const now = new Date().toISOString();

  if (resolutionType === "shop_upheld") {
    // Ruled in favor of workshop: customer must pay
    await admin
      .from("disputes")
      .update({
        status: "resolved",
        resolution: "no_action",
        resolution_note: `FixGrid Admin ruling: ${note}. Customer is required to pay repair bill.`,
        resolved_at: now,
      } as never)
      .eq("id", dispute.id);

    await admin
      .from("bookings")
      .update({ status: "completed", updated_at: now } as never)
      .eq("id", booking.id);

    await admin.from("booking_events").insert({
      booking_id: booking.id,
      actor_role: "admin",
      from_status: booking.status,
      to_status: "completed",
      note: `FixGrid Admin Dispute Resolution: Work upheld. Customer must pay repair fee. Note: ${note}`,
    });
  } else if (resolutionType === "rework_ordered") {
    // Ruled that workshop must perform rework
    await admin
      .from("disputes")
      .update({
        status: "resolved",
        resolution: "redo_service",
        resolution_note: `FixGrid Admin ruling: ${note}. Workshop rework ordered.`,
        resolved_at: now,
      } as never)
      .eq("id", dispute.id);

    await admin
      .from("bookings")
      .update({ status: "in_progress", started_at: now, updated_at: now } as never)
      .eq("id", booking.id);

    await admin.from("booking_events").insert({
      booking_id: booking.id,
      actor_role: "admin",
      from_status: booking.status,
      to_status: "in_progress",
      note: `FixGrid Admin Dispute Resolution: Workshop must fix the issue. Job placed back on bench. Note: ${note}`,
    });
  } else if (resolutionType === "refund_customer") {
    // Ruled refund to customer
    const refundAmount = booking.final_amount ?? booking.quoted_amount ?? 0;
    if (refundAmount > 0) {
      await creditFromPlatform({
        kind: "refund",
        amountMinor: refundAmount,
        to: { kind: "user", ownerId: booking.customer_id },
        bookingId: booking.id,
        memo: `FixGrid Admin Dispute Refund — ${booking.reference}`,
      });
    }

    await admin
      .from("disputes")
      .update({
        status: "resolved",
        resolution: "refund_full",
        resolution_note: `FixGrid Admin ruling: ${note}. Customer refunded ${formatMoney(refundAmount, booking.currency)}.`,
        refund_amount: refundAmount,
        resolved_at: now,
      } as never)
      .eq("id", dispute.id);

    await admin
      .from("bookings")
      .update({ status: "closed", closed_at: now, updated_at: now } as never)
      .eq("id", booking.id);

    await admin.from("booking_events").insert({
      booking_id: booking.id,
      actor_role: "admin",
      from_status: booking.status,
      to_status: "closed",
      note: `FixGrid Admin Dispute Resolution: Refunded customer ${formatMoney(refundAmount, booking.currency)}. Job closed. Note: ${note}`,
    });
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);
  revalidatePath("/dashboard/expert/requests");
  revalidatePath(`/dashboard/expert/requests/${booking.reference}`);
  revalidatePath("/dashboard/expert/disputes");
  revalidatePath(`/dashboard/expert/disputes/${dispute.id}`);
  revalidatePath("/dashboard/warranty");

  return { success: true, error: null, message: "Dispute resolved successfully." };
}
