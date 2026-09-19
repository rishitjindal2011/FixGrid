import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Banknote,
  Smartphone,
  Lock,
  UserCheck,
} from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileCashbackModal } from "@/components/dashboard/expert/file-cashback-modal";
import { AdminBillActionDialog } from "@/components/dashboard/expert/admin-bill-action-dialog";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUserAdmin } from "@/lib/dashboard/cashback-actions";
import { formatDateLong, formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shop Pro 5% Cashback & Bill Filing",
  description: "Claim and track your 5% FixGrid Shop Pro cashback rebates for online and cash repair settlements.",
};

interface CashbackBooking {
  id: string;
  reference: string;
  status: string;
  completed_at: string | null;
  closed_at: string | null;
  quoted_amount: number | null;
  final_amount: number | null;
  currency: string;
  customer_id: string;
  service_id: string | null;
}

export default async function ExpertCashbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/cashback");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const isAdmin = await isUserAdmin();
  const adminClient = createAdminClient();

  // 1. Fetch completed & closed bookings for this workshop
  const { data: rawBookings } = await adminClient
    .from("bookings")
    .select("id, reference, status, completed_at, closed_at, quoted_amount, final_amount, currency, customer_id, service_id")
    .eq("fixer_id", shop.id)
    .in("status", ["completed", "closed"])
    .order("completed_at", { ascending: false });

  const bookings: CashbackBooking[] = (rawBookings || []) as CashbackBooking[];
  const bookingIds = bookings.map((b) => b.id);
  const customerIds = [...new Set(bookings.map((b) => b.customer_id).filter(Boolean))];
  const serviceIds = [...new Set(bookings.map((b) => b.service_id).filter(Boolean))] as string[];

  // 2. Fetch payments for these bookings
  const paymentsByBookingId = new Map<string, any[]>();
  if (bookingIds.length > 0) {
    const { data: rawPayments } = await adminClient
      .from("payments")
      .select("id, booking_id, provider, status, amount, captured_at")
      .in("booking_id", bookingIds);

    (rawPayments || []).forEach((p) => {
      if (p.booking_id) {
        const list = paymentsByBookingId.get(p.booking_id) || [];
        list.push(p);
        paymentsByBookingId.set(p.booking_id, list);
      }
    });
  }

  // 3. Fetch customers
  const customersById = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: rawUsers } = await adminClient
      .from("users")
      .select("id, display_name, full_name")
      .in("id", customerIds);

    (rawUsers || []).forEach((u) => {
      customersById.set(u.id, u.display_name || u.full_name || "Customer");
    });
  }

  // 4. Fetch services
  const servicesById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: rawServices } = await adminClient
      .from("shop_services")
      .select("id, name")
      .in("id", serviceIds);

    (rawServices || []).forEach((s) => {
      servicesById.set(s.id, s.name);
    });
  }

  // 5. Fetch bills filed by this workshop
  const { data: rawBills } = await adminClient
    .from("shop_bills")
    .select("*")
    .eq("fixer_id", shop.id);

  const billsByBookingId = new Map<string, any>();
  (rawBills || []).forEach((bill) => {
    billsByBookingId.set(bill.booking_id, bill);
  });

  // 6. If Admin, fetch all pending bills across the platform for approval
  let pendingAdminBills: any[] = [];
  if (isAdmin) {
    const { data: adminQueue } = await adminClient
      .from("shop_bills")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (adminQueue && adminQueue.length > 0) {
      const qBookingIds = adminQueue.map((q) => q.booking_id);
      const qFixerIds = adminQueue.map((q) => q.fixer_id);

      const { data: qBookings } = await adminClient
        .from("bookings")
        .select("id, reference, final_amount")
        .in("id", qBookingIds);
      const qBookingsMap = new Map((qBookings || []).map((b) => [b.id, b]));

      const { data: qShops } = await adminClient
        .from("fixer_profiles")
        .select("id, shop_name")
        .in("id", qFixerIds);
      const qShopsMap = new Map((qShops || []).map((s) => [s.id, s.shop_name]));

      pendingAdminBills = adminQueue.map((item) => {
        let imageUrl: string | null = null;
        if (item.storage_path) {
          const cleanPath = item.storage_path.replace(/^booking-attachments\//, "");
          const { data } = adminClient.storage
            .from("booking-attachments")
            .getPublicUrl(cleanPath);
          imageUrl = data?.publicUrl || null;
        }
        const b = qBookingsMap.get(item.booking_id);
        return {
          id: item.id,
          bookingReference: b?.reference || "REF",
          shopName: qShopsMap.get(item.fixer_id) || "Workshop",
          amountMinor: item.amount_minor,
          currency: item.currency || "INR",
          storagePath: item.storage_path,
          imageUrl,
          note: item.review_note,
          createdAt: item.created_at,
        };
      });
    }
  }

  // 7. Calculate Cashback Analytics
  let totalCashbackEarnedMinor = 0;
  let pendingCashbackMinor = 0;
  let onlineRepairsCount = 0;
  let cashRepairsCount = 0;

  bookings.forEach((booking) => {
    const amount = booking.final_amount ?? booking.quoted_amount ?? 0;
    const payments = paymentsByBookingId.get(booking.id) || [];
    const isCash = payments.some((p) => p.provider === "cash");
    const isOnline = payments.some((p) => p.provider !== "cash" && p.status === "captured");

    if (isOnline) {
      onlineRepairsCount += 1;
      // Online UPI automatically gave 5% rebate upon settlement
      totalCashbackEarnedMinor += Math.floor(amount * 0.05);
    } else {
      cashRepairsCount += 1;
      const bill = billsByBookingId.get(booking.id);
      if (bill) {
        if (bill.status === "approved") {
          totalCashbackEarnedMinor += bill.rebate_minor || Math.floor(bill.amount_minor * 0.05);
        } else if (bill.status === "pending") {
          pendingCashbackMinor += Math.floor(bill.amount_minor * 0.05);
        }
      }
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Shop Pro SaaS"
        title="5% Cashback & Bill Filing"
        description="FixGrid charges 0% commission on your walk-in and direct customer repairs, and rewards your workshop with a 5% monthly cashback rebate on all settled jobs."
      />

      {/* Analytics Tiles */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label="Total Cashback Earned"
          value={formatMoney(totalCashbackEarnedMinor, "INR")}
          hint="Deposited into shop wallet"
          emphasis
        />
        <StatTile
          label="Pending Admin Review"
          value={formatMoney(pendingCashbackMinor, "INR")}
          hint={pendingCashbackMinor > 0 ? "Awaiting admin verification" : "Zero pending bills"}
        />
        <StatTile
          label="UPI Auto-Credited"
          value={onlineRepairsCount}
          hint="5% instantly deposited on settlement"
        />
        <StatTile
          label="Cash Settlements"
          value={cashRepairsCount}
          hint="Eligible for bill rebate upload"
        />
      </div>

      {/* Admin Review Console & Backend Login Info (Visible to Admins / Rishit) */}
      {isAdmin ? (
        <section className="overflow-hidden rounded-2xl border-2 border-[#ea580c]/30 bg-chalk p-5 shadow-bench">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#ea580c] text-white">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-tight text-enamel">
                  FixGrid Admin Cashback Verification Console
                </h2>
                <p className="text-xs text-steel">
                  Active Admin Account: <strong className="text-enamel">{user.email}</strong> (Role: Owner / Admin)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="signal" className="bg-[#ea580c] text-white font-mono">
                {pendingAdminBills.length} PENDING BILLS
              </Badge>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 text-xs border-hairline hover:border-signal"
              >
                <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5 text-signal" />
                  <span>Open Standalone Admin Portal</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Pending Bills Queue */}
          <div className="pt-4">
            <h3 className="eyebrow mb-3 block text-steel-soft">
              Pending Bills Awaiting Your Review & Cashback Payout
            </h3>
            {pendingAdminBills.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline bg-bench p-4 text-center text-xs text-steel">
                All shop bills are reviewed and settled! No pending cashback claims right now.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {pendingAdminBills.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-bench p-3.5 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-enamel">
                          {item.bookingReference}
                        </span>
                        <span className="font-semibold text-xs text-steel truncate">
                          · {item.shopName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-steel">
                        Bill Amount: <strong className="font-mono text-enamel">{formatMoney(item.amountMinor, item.currency)}</strong>
                        {" · "}
                        5% Rebate to Credit:{" "}
                        <strong className="font-mono text-emerald-600">
                          +{formatMoney(Math.floor(item.amountMinor * 0.05), item.currency)}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <AdminBillActionDialog bill={item} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* Completed Repairs & Cashback Status List */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="All Completed Repairs & Cashback Ledger"
          action={
            <Badge variant="verified">
              <span className="font-mono tabular-nums">{bookings.length}</span>
              completed jobs
            </Badge>
          }
        />

        {bookings.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No completed repairs yet"
            description="When you finish repairs and mark them complete, they will appear here with their 5% cashback rebate status and invoice upload options."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-hairline bg-chalk shadow-bench">
            <div className="divide-y divide-hairline">
              {bookings.map((booking) => {
                const amountMinor = booking.final_amount ?? booking.quoted_amount ?? 0;
                const payments = paymentsByBookingId.get(booking.id) || [];
                const isCash = payments.some((p) => p.provider === "cash");
                const isOnline = payments.some(
                  (p) => p.provider !== "cash" && p.status === "captured",
                );

                const bill = billsByBookingId.get(booking.id);
                const customerName = customersById.get(booking.customer_id) || "Customer";
                const serviceName = booking.service_id ? servicesById.get(booking.service_id) : "Hardware Repair";
                const potentialRebateMinor = Math.floor(amountMinor * 0.05);

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-bench/40"
                  >
                    {/* Left: Job Details */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/expert/requests/${booking.reference}`}
                          className="font-mono text-sm font-bold text-enamel hover:text-signal"
                        >
                          {booking.reference}
                        </Link>
                        <span className="text-xs text-steel-soft">·</span>
                        <span className="text-xs font-semibold text-steel">
                          {customerName}
                        </span>
                        <span className="text-xs text-steel-soft">·</span>
                        <span className="text-xs text-steel truncate">
                          {serviceName}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-steel">
                        <span>
                          Amount:{" "}
                          <strong className="font-mono font-bold text-enamel">
                            {formatMoney(amountMinor, booking.currency || "INR")}
                          </strong>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          {isCash ? (
                            <>
                              <Banknote className="size-3.5 text-emerald-600" />
                              <span>Paid in Cash</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="size-3.5 text-[#ea580c]" />
                              <span>Online (UPI / Wallet)</span>
                            </>
                          )}
                        </span>
                        {booking.completed_at ? (
                          <>
                            <span>·</span>
                            <span>{formatDateLong(booking.completed_at)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: Cashback Status & Action */}
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      {isOnline ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          <span>Auto-Credited (+{formatMoney(potentialRebateMinor, booking.currency)})</span>
                        </div>
                      ) : bill ? (
                        bill.status === "approved" ? (
                          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                            <span>Rebate Approved (+{formatMoney(bill.rebate_minor || potentialRebateMinor, booking.currency)})</span>
                          </div>
                        ) : bill.status === "pending" ? (
                          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                            <Clock className="size-3.5 text-amber-500 animate-pulse" />
                            <span>Pending Admin Review ({formatMoney(potentialRebateMinor, booking.currency)})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600" title={bill.review_note || "Rejected"}>
                            <AlertTriangle className="size-3.5" />
                            <span>Bill Rejected</span>
                          </div>
                        )
                      ) : (
                        <FileCashbackModal
                          bookingId={booking.id}
                          reference={booking.reference}
                          amountMinor={amountMinor}
                          currency={booking.currency || "INR"}
                          customerName={customerName}
                          serviceName={serviceName || undefined}
                        />
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs text-steel hover:text-signal"
                      >
                        <Link href={`/dashboard/expert/requests/${booking.reference}`}>
                          <span>View Job</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Educational Card: How Shop Pro 5% Cashback Works */}
      <div className="rounded-2xl border border-hairline bg-bench/70 p-5 shadow-sm">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-tight text-enamel">
          <Sparkles className="size-4 text-[#ea580c]" />
          <span>How FixGrid Shop Pro 5% Cashback Works</span>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3 text-xs text-steel leading-relaxed">
          <div className="rounded-xl border border-hairline bg-white/60 p-3.5 dark:bg-black/20">
            <p className="font-bold text-enamel mb-1 flex items-center gap-1.5">
              <Smartphone className="size-3.5 text-[#ea580c]" />
              1. UPI & Online Payments
            </p>
            When customers pay online through their dashboard, your payout is deposited instantly and your 5% platform cashback rebate is credited automatically to your wallet.
          </div>
          <div className="rounded-xl border border-hairline bg-white/60 p-3.5 dark:bg-black/20">
            <p className="font-bold text-enamel mb-1 flex items-center gap-1.5">
              <Banknote className="size-3.5 text-emerald-600" />
              2. Cash & Offline Walk-ins
            </p>
            When a customer pays in cash at your counter, record it as Paid in Cash. Simply upload a photo of your service invoice or paper receipt right here in the Cashback tab.
          </div>
          <div className="rounded-xl border border-hairline bg-white/60 p-3.5 dark:bg-black/20">
            <p className="font-bold text-enamel mb-1 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-signal" />
              3. Admin Verification & Payout
            </p>
            Our Admin team verifies the invoice to ensure genuine repairs, and the 5% cashback is deposited directly to your FixGrid wallet, available for bank withdrawal anytime.
          </div>
        </div>
      </div>
    </div>
  );
}
