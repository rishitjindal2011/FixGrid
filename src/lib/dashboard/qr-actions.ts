"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWarrantyPassport, type WarrantyPassport } from "@/lib/warranty/passport";
import type { BookingActionState } from "@/lib/bookings/state";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";

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
 * Clean and normalize a scanned QR string or typed reference.
 * Supports:
 * - Direct references: "FIX-WU9JU4"
 * - Full URLs: "https://fixgrid.vytron.me/passport/FIX-WU9JU4"
 * - Full URLs with locale: "https://fixgrid.vytron.me/en/passport/FIX-WU9JU4"
 */
function extractReferenceFromQr(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Match /passport/(FIX-[A-Z0-9]+) or similar
  const urlMatch = trimmed.match(/\/passport\/([A-Za-z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toUpperCase();
  }

  // Match standard FIX-XXXXXX pattern anywhere in the string
  const refMatch = trimmed.match(/FIX-[A-Z0-9]+/i);
  if (refMatch && refMatch[0]) {
    return refMatch[0].toUpperCase();
  }

  return trimmed.toUpperCase();
}

const StartWorkQrSchema = z.object({
  bookingId: z.string().uuid(),
  reference: z.string().min(3),
  scannedCode: z.string().min(3),
  context: z.enum(["in_shop", "pickup_drop", "home_service", "warranty_claim"]).default("in_shop"),
});

/**
 * Shopkeeper / technician scans customer QR code to start work or confirm device pickup.
 * Validates reference matches the customer's pass, moves booking to `in_progress`,
 * and logs timestamped handover event.
 */
export async function verifyAndStartWorkWithQr(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = StartWorkQrSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reference: formData.get("reference"),
    scannedCode: formData.get("scannedCode"),
    context: formData.get("context") ?? "in_shop",
  });

  if (!parsed.success) {
    return FAILED(parsed.error.issues[0]?.message ?? "Invalid scan details.");
  }

  const user = await getCurrentUser();
  if (!user) return FAILED("Please sign in to proceed.");

  const extractedRef = extractReferenceFromQr(parsed.data.scannedCode);
  const targetRef = parsed.data.reference.trim().toUpperCase();

  if (extractedRef !== targetRef && !parsed.data.scannedCode.toUpperCase().includes(targetRef)) {
    return FAILED(
      `QR code mismatch! Scanned "${extractedRef || parsed.data.scannedCode}" does not match booking "${targetRef}". Please ensure you are scanning this customer's booking pass.`,
    );
  }

  const adminClient = createAdminClient();

  // Load booking and verify shop ownership
  const { data: booking, error: readError } = await adminClient
    .from("bookings")
    .select(`
      id, reference, status, delivery_mode, fixer_id, customer_id,
      shop:fixer_profiles!bookings_fixer_fkey (
        id, owner_id, shop_name
      )
    `)
    .eq("id", parsed.data.bookingId)
    .maybeSingle<{
      id: string;
      reference: string;
      status: string;
      delivery_mode: string;
      fixer_id: string;
      customer_id: string;
      shop: { id: string; owner_id: string | null; shop_name: string } | null;
    }>();

  if (readError || !booking) {
    return FAILED("Booking could not be found.");
  }

  if (booking.shop?.owner_id !== user.id) {
    return FAILED("Permission denied: You do not own the workshop assigned to this repair.");
  }

  const now = new Date().toISOString();
  const fromStatus = booking.status;

  // Verify transition is valid
  if (fromStatus !== "confirmed" && fromStatus !== "disputed" && fromStatus !== "completed") {
    return FAILED(`Cannot start work on a booking currently in "${fromStatus}" status.`);
  }

  // Update booking to in_progress
  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      status: "in_progress",
      started_at: now,
    })
    .eq("id", booking.id);

  if (updateError) {
    return FAILED("Could not update booking status. Please try again.");
  }

  let auditNote = "Customer Booking QR verified. Device handed over and work started on bench.";
  let userMessage = `QR Verified! Device placed on bench and repair started for ${booking.reference}.`;

  if (parsed.data.context === "pickup_drop") {
    auditNote = "Device collected from customer address via QR scan. Pickup verified and unit in transit to bench.";
    userMessage = `Pickup Confirmed! Device received from customer and marked underway.`;
  } else if (parsed.data.context === "home_service") {
    auditNote = "Technician arrived on-site. Customer QR scanned and home service repair started.";
    userMessage = `On-site Service Started! Customer QR verified successfully.`;
  } else if (fromStatus === "disputed" || parsed.data.context === "warranty_claim") {
    auditNote = "Device returned under Warranty Claim. QR Passport verified and rework commenced on bench.";
    userMessage = `Warranty Rework Started! Customer QR verified and job is back on the bench.`;
  }

  // Record audit log
  await adminClient.from("booking_events").insert({
    booking_id: booking.id,
    actor_id: user.id,
    actor_role: "shop",
    from_status: fromStatus as any,
    to_status: "in_progress",
    note: auditNote,
  });

  revalidatePath("/dashboard/expert/requests");
  revalidatePath(`/dashboard/expert/requests/${booking.reference}`);
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.reference}`);
  revalidatePath("/dashboard");

  return OK(userMessage);
}

export interface QrLookupResult {
  success: boolean;
  error?: string;
  reference?: string;
  passport?: WarrantyPassport;
  bookingStatus?: string;
  deliveryMode?: string;
  customerName?: string;
}

/**
 * Public or Shopkeeper QR scan lookup:
 * Scans a physical device sticker or digital passport and fetches live proof.
 */
export async function lookupWarrantyQrCode(scannedRaw: string): Promise<QrLookupResult> {
  const ref = extractReferenceFromQr(scannedRaw);
  if (!ref) {
    return { success: false, error: "No booking reference detected in scanned code." };
  }

  const passport = await getWarrantyPassport(ref);
  if (!passport) {
    return {
      success: false,
      error: `No FixGrid warranty passport found for reference "${ref}". Please check the QR code or enter a valid reference.`,
    };
  }

  // Also fetch live booking info
  const adminClient = createAdminClient();
  const { data: booking } = await adminClient
    .from("bookings")
    .select(`
      id, reference, status, delivery_mode,
      customer:users!bookings_customer_fkey ( display_name, full_name )
    `)
    .eq("reference", ref)
    .maybeSingle<{
      id: string;
      reference: string;
      status: string;
      delivery_mode: string;
      customer: { display_name: string | null; full_name: string | null } | null;
    }>();

  return {
    success: true,
    reference: ref,
    passport,
    bookingStatus: booking?.status || passport.status,
    deliveryMode: booking?.delivery_mode || "in_shop",
    customerName: booking?.customer?.display_name || booking?.customer?.full_name || "Customer",
  };
}
