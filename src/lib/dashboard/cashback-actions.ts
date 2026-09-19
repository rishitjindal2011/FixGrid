"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditFromPlatform } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";
import { rupeesToPaise } from "@/lib/bookings/core";
import type { BookingActionState } from "@/lib/bookings/state";

const OK = (message: string): BookingActionState => ({
  success: true,
  error: null,
  message,
});

const FAILED = (error: string): BookingActionState => ({
  success: false,
  error,
});

/**
 * Mark a completed repair as settled in cash at the workshop.
 * Transitions to `closed`, records a cash payment in `payments`,
 * and prompts shopkeeper to upload invoice in the Cashback tab.
 */
export async function markBookingPaidInCash(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const amountRupees = String(formData.get("finalAmount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!bookingId) return FAILED("Booking ID is required.");

  const user = await getCurrentUser();
  if (!user) return FAILED("Sign in to record payment.");

  const adminClient = createAdminClient();

  const { data: booking, error: readError } = await adminClient
    .from("bookings")
    .select(`
      id, reference, status, fixer_id, customer_id, quoted_amount, final_amount,
      platform_fee, tax_amount, currency,
      shop:fixer_profiles!bookings_fixer_fkey ( id, owner_id, shop_name )
    `)
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: string;
      fixer_id: string;
      customer_id: string;
      quoted_amount: number | null;
      final_amount: number | null;
      platform_fee: number;
      tax_amount: number;
      currency: string;
      shop: { id: string; owner_id: string | null; shop_name: string } | null;
    }>();

  if (readError || !booking) return FAILED("That booking could not be found.");
  if (booking.shop?.owner_id !== user.id) {
    return FAILED("You do not own the workshop assigned to this booking.");
  }

  let finalAmountPaise = booking.final_amount ?? booking.quoted_amount;
  if (amountRupees) {
    const parsedPaise = rupeesToPaise(amountRupees);
    if (parsedPaise !== null && parsedPaise > 0) {
      finalAmountPaise = parsedPaise;
    }
  }

  if (!finalAmountPaise || finalAmountPaise <= 0) {
    return FAILED("Please specify a valid repair amount.");
  }

  const now = new Date().toISOString();

  // 1. Insert Cash payment entry
  await adminClient.from("payments").insert({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    status: "captured",
    amount: finalAmountPaise,
    platform_fee: booking.platform_fee || 0,
    tax_amount: booking.tax_amount || 0,
    currency: booking.currency || "INR",
    provider: "cash",
    captured_at: now,
  });

  // 2. Mark booking as closed
  await adminClient
    .from("bookings")
    .update({
      status: "closed",
      final_amount: finalAmountPaise,
      closed_at: now,
      updated_at: now,
    } as never)
    .eq("id", booking.id);

  // 3. Log event
  await adminClient.from("booking_events").insert({
    booking_id: booking.id,
    actor_id: user.id,
    actor_role: "shop",
    from_status: booking.status as any,
    to_status: "closed",
    note: notes
      ? `Settled in cash: ${notes} (${formatMoney(finalAmountPaise, booking.currency)})`
      : `Customer settled ${formatMoney(finalAmountPaise, booking.currency)} in cash at the workshop.`,
  });

  revalidatePath("/dashboard/expert/requests");
  revalidatePath(`/dashboard/expert/requests/${booking.reference}`);
  revalidatePath("/dashboard/expert/cashback");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);

  const cashbackPotential = Math.floor(finalAmountPaise * 0.05);

  return OK(
    `Marked settled in cash for ${formatMoney(finalAmountPaise, booking.currency)}! Go to the Cashback tab and upload the bill receipt to claim your ${formatMoney(cashbackPotential, booking.currency)} 5% rebate.`,
  );
}

/**
 * Upload a bill file and submit 5% cashback claim into `shop_bills`.
 */
export async function fileCashbackClaimWithFile(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const amountRupees = String(formData.get("amount") ?? "").trim();
  const file = formData.get("billFile") as File | null;
  const note = String(formData.get("note") ?? "").trim();

  if (!bookingId) return FAILED("Booking is required.");
  const amountMinor = rupeesToPaise(amountRupees);
  if (amountMinor === null || amountMinor <= 0) {
    return FAILED("Enter a valid bill amount in rupees.");
  }

  const user = await getCurrentUser();
  if (!user) return FAILED("Sign in to file cashback.");

  const adminClient = createAdminClient();

  // Verify booking and shop ownership
  const { data: booking, error: readError } = await adminClient
    .from("bookings")
    .select(`
      id, reference, status, fixer_id, currency,
      shop:fixer_profiles!bookings_fixer_fkey ( id, owner_id, shop_name )
    `)
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: string;
      fixer_id: string;
      currency: string;
      shop: { id: string; owner_id: string | null; shop_name: string } | null;
    }>();

  if (readError || !booking) return FAILED("Booking not found.");
  if (booking.shop?.owner_id !== user.id) {
    return FAILED("You do not own the workshop for this booking.");
  }

  // Check if a bill already exists
  const { data: existingBill } = await adminClient
    .from("shop_bills")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle<{ id: string; status: string }>();

  if (existingBill) {
    return FAILED(`A bill has already been filed for ${booking.reference} (Status: ${existingBill.status}).`);
  }

  let storagePath: string | null = null;

  // If a file was provided, upload to Supabase Storage
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop() || "jpg";
    const path = `bills/${booking.reference}/${Date.now()}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("booking-attachments")
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      storagePath = path;
    } else {
      storagePath = `booking-attachments/${path}`;
    }
  }

  // Update final_amount on booking if needed
  await adminClient
    .from("bookings")
    .update({ final_amount: amountMinor })
    .eq("id", booking.id);

  // Insert shop_bills record
  const { error: billError } = await adminClient.from("shop_bills").insert({
    booking_id: booking.id,
    fixer_id: booking.fixer_id,
    amount_minor: amountMinor,
    currency: booking.currency || "INR",
    storage_path: storagePath,
    status: "pending",
    review_note: note || null,
  } as never);

  if (billError) {
    return FAILED(`Failed to file bill: ${billError.message}`);
  }

  revalidatePath("/dashboard/expert/cashback");
  revalidatePath("/dashboard/expert/earnings");
  revalidatePath(`/dashboard/expert/requests/${booking.reference}`);

  const rebatePaise = Math.floor(amountMinor * 0.05);

  return OK(
    `Bill of ${formatMoney(amountMinor, booking.currency)} filed successfully! Your 5% cashback rebate (${formatMoney(rebatePaise, booking.currency)}) has been sent to FixGrid Admin for review.`,
  );
}

/**
 * Check if the currently logged-in user is an administrator.
 */
export async function isUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.email) return false;

  const adminEmail = user.email.toLowerCase();
  if (adminEmail === "rishitjindal2@gmail.com") return true;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("seo_admins")
    .select("id, role, status")
    .eq("email", adminEmail)
    .maybeSingle<{ id: string; role: string; status: string }>();

  return Boolean(data && data.status !== "revoked");
}

/**
 * Approve a shop bill and credit 5% cashback directly into the shop's wallet.
 */
export async function approveCashbackClaimAdmin(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const billId = String(formData.get("billId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  if (!billId) return FAILED("Bill ID is required.");

  const isAdmin = await isUserAdmin();
  if (!isAdmin) return FAILED("Only FixGrid Administrators can approve cashback claims.");

  const adminClient = createAdminClient();

  const { data: bill, error: readError } = await adminClient
    .from("shop_bills")
    .select(`
      id, fixer_id, amount_minor, status, booking_id,
      bookings:bookings!inner ( id, reference, final_amount, currency ),
      shop:fixer_profiles!shop_bills_fixer_id_fkey ( id, owner_id, shop_name )
    `)
    .eq("id", billId)
    .maybeSingle<{
      id: string;
      fixer_id: string;
      amount_minor: number;
      status: string;
      booking_id: string;
      bookings: { id: string; reference: string; final_amount: number | null; currency: string };
      shop: { id: string; owner_id: string | null; shop_name: string } | null;
    }>();

  if (readError || !bill) return FAILED("Bill could not be found.");
  if (bill.status !== "pending") return FAILED(`This bill has already been ${bill.status}.`);

  const basisAmount = Math.min(bill.amount_minor, bill.bookings.final_amount ?? bill.amount_minor);
  const rebateMinor = Math.floor(basisAmount * 0.05);

  if (rebateMinor <= 0) return FAILED("Rebate amount is zero.");

  const shopOwnerId = bill.shop?.owner_id;
  if (!shopOwnerId) return FAILED("Workshop owner account not found for wallet deposit.");

  const user = await getCurrentUser();

  // 1. Mark bill approved
  const { error: updateError } = await adminClient
    .from("shop_bills")
    .update({
      status: "approved",
      rebate_minor: rebateMinor,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      review_note: adminNote || "Approved by FixGrid Admin. 5% cashback credited to shop wallet.",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", bill.id);

  if (updateError) return FAILED("Could not update bill status.");

  // 2. Deposit 5% Cashback into Workshop Wallet
  const credit = await creditFromPlatform({
    kind: "rebate",
    amountMinor: rebateMinor,
    to: { kind: "user", ownerId: shopOwnerId },
    bookingId: bill.booking_id,
    memo: `5% Shop Pro Cashback for bill ${bill.bookings.reference}`,
  });

  if (!credit.ok) {
    // Revert bill to pending if wallet credit failed
    await adminClient
      .from("shop_bills")
      .update({ status: "pending", rebate_minor: null, reviewed_at: null } as never)
      .eq("id", bill.id);
    return FAILED(`Credit failed: ${credit.error}`);
  }

  revalidatePath("/dashboard/expert/cashback");
  revalidatePath("/dashboard/expert/earnings");
  revalidatePath(`/dashboard/expert/requests/${bill.bookings.reference}`);

  return OK(
    `Approved! ${formatMoney(rebateMinor, bill.bookings.currency)} (5% cashback) has been credited directly to ${bill.shop?.shop_name}'s wallet.`,
  );
}

/**
 * Reject a cashback claim.
 */
export async function rejectCashbackClaimAdmin(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const billId = String(formData.get("billId") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

  if (!billId) return FAILED("Bill ID is required.");
  if (!rejectionReason) return FAILED("Please provide a reason for rejecting this bill.");

  const isAdmin = await isUserAdmin();
  if (!isAdmin) return FAILED("Only FixGrid Administrators can reject cashback claims.");

  const adminClient = createAdminClient();
  const user = await getCurrentUser();

  const { error } = await adminClient
    .from("shop_bills")
    .update({
      status: "rejected",
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      review_note: rejectionReason,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", billId);

  if (error) return FAILED("Could not reject bill.");

  revalidatePath("/dashboard/expert/cashback");
  return OK("Bill rejected with the specified reason.");
}
