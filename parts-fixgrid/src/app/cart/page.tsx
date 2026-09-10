"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  Truck,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Receipt,
  CreditCard,
  Zap,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart, clearCart, subtotalInRupees, totalItems } = useCart();

  // Buyer details
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Delivery simulation (default to true if shop offers or toggleable)
  // Check if first item shop supports home delivery (can be determined by workshop profile)
  const [homeDeliverySupported, setHomeDeliverySupported] = useState(true);
  const [selectedFulfillment, setSelectedFulfillment] = useState<"delivery" | "pickup">("delivery");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Fee calculation:
  // Courier fee = ₹150 if home delivery
  const courierFee = homeDeliverySupported && selectedFulfillment === "delivery" ? 150 : 0;
  const grandTotal = subtotalInRupees + courierFee;

  // If counter pickup only (not supported or chosen pickup), 20% advance token fee
  const advanceFee = Math.round(grandTotal * 0.2);
  const balanceDue = grandTotal - advanceFee;

  const isAdvancePayment = !homeDeliverySupported || selectedFulfillment === "pickup";
  const amountToPayNow = isAdvancePayment ? advanceFee : grandTotal;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push("/login?next=/cart");
      return;
    }

    if (items.length === 0) {
      setError("Your bench cart is empty.");
      return;
    }

    if (!buyerName.trim() || !buyerPhone.trim()) {
      setError("Please provide your name and contact phone number.");
      return;
    }

    const sellerFixerId = items[0]?.item.fixer_id;
    if (!sellerFixerId) {
      setError("Missing seller workshop information.");
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = items.map((i) => ({
        id: i.item.id,
        name: i.item.name,
        sku: i.item.sku,
        brand: i.item.brand,
        unitPrice: i.item.unit_price ? Math.round(i.item.unit_price / 100) : 0,
        quantity: i.quantity,
      }));

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: user.id,
          buyerName: buyerName.trim(),
          buyerEmail: user.email,
          buyerPhone: buyerPhone.trim(),
          deliveryAddress: isAdvancePayment ? "Workshop Counter Pickup" : deliveryAddress.trim(),
          fixerId: sellerFixerId,
          items: orderItems,
          deliveryMode: isAdvancePayment ? "in_shop" : "home_delivery",
          homeDeliverySupported,
          totalAmount: grandTotal,
          advancePaid: isAdvancePayment ? advanceFee : grandTotal,
          balanceDue: isAdvancePayment ? balanceDue : 0,
          paymentStatus: isAdvancePayment ? "Advance Reservation Token Paid" : "Full Escrow Paid",
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to process order.");
      }

      setCompletedOrder(resData.order);
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error processing checkout";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="min-h-screen bg-bench text-enamel flex flex-col items-center justify-center p-4">
        <div className="rounded-machined border border-verdigris/30 bg-chalk p-8 max-w-lg w-full shadow-bench text-center">
          <div className="size-14 rounded-full bg-verdigris-wash border border-verdigris/30 text-verdigris flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8" />
          </div>

          <span className="font-mono text-[10px] text-verdigris font-bold uppercase tracking-wider">
            {completedOrder.paymentStatus}
          </span>
          <h1 className="font-display text-2xl font-bold uppercase text-enamel mt-1">
            Hardware Order Confirmed!
          </h1>
          <p className="mt-2 text-xs text-steel">
            Reference: <strong className="font-mono text-enamel">{completedOrder.orderReference}</strong>
          </p>

          <div className="mt-6 rounded-machined border border-hairline bg-bench p-4 text-left font-mono text-xs space-y-2">
            <div className="flex justify-between border-b border-hairline pb-2">
              <span className="text-steel-soft">Fulfillment Method</span>
              <span className="font-bold text-enamel">
                {completedOrder.deliveryMode === "home_delivery" ? "🚚 Home Doorstep Courier" : "📍 Counter Pickup"}
              </span>
            </div>

            <div className="flex justify-between border-b border-hairline pb-2">
              <span className="text-steel-soft">Total Lot Value</span>
              <span className="font-bold text-enamel">₹{completedOrder.totalAmount?.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between border-b border-hairline pb-2">
              <span className="text-verdigris font-semibold">Amount Paid Online</span>
              <span className="font-bold text-verdigris">₹{completedOrder.advancePaid?.toLocaleString("en-IN")}</span>
            </div>

            {completedOrder.balanceDue > 0 && (
              <div className="flex justify-between text-signal font-semibold pt-1">
                <span>Balance Due at Workshop Counter</span>
                <span>₹{completedOrder.balanceDue?.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-machined bg-enamel px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-all"
            >
              Return to Parts Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench group-hover:bg-enamel-lift transition-colors">
              <Cpu className="size-4 text-signal" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl font-bold tracking-tight text-enamel uppercase">
                  FIX<span className="text-signal">GRID</span>
                </span>
                <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                  BENCH CART
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                parts.vytron.me
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-steel">
            <Link href="/" className="hover:text-enamel transition-colors">
              Parts Catalog
            </Link>
            <ChevronRight className="size-3.5 text-steel-soft" />
            <span className="text-enamel font-semibold">Cart &amp; Escrow Checkout</span>
          </div>

          <Link
            href="/"
            className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider"
          >
            &larr; Return to Catalog
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 border-b border-hairline pb-4">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-enamel">
              Bench Parts Cart &amp; Order Fulfillment
            </h1>
            <p className="text-xs text-steel mt-1">
              Source verified replacement assemblies with FixGrid Escrow Protection.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-machined border border-hairline bg-chalk p-16 text-center shadow-bench flex flex-col items-center max-w-md mx-auto">
              <Cpu className="size-12 text-steel-soft mb-3" />
              <h2 className="font-display text-xl font-bold uppercase text-enamel">
                Your Bench Cart is Empty
              </h2>
              <p className="text-xs text-steel mt-1.5 leading-relaxed">
                Browse our live inventory of OEM screen pulls, batteries, and micro-soldering IC chips.
              </p>
              <Link
                href="/"
                className="mt-5 rounded-machined bg-signal px-6 py-2.5 font-display text-xs font-semibold uppercase text-white hover:bg-signal-lift transition-colors"
              >
                Browse Hardware Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Cart Items List */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <span className="font-display text-base font-bold uppercase text-enamel">
                      Hardware Items in Lot ({totalItems})
                    </span>
                    <button
                      type="button"
                      onClick={clearCart}
                      className="font-mono text-[11px] text-rust hover:underline"
                    >
                      Clear Cart
                    </button>
                  </div>

                  <div className="divide-y divide-hairline">
                    {items.map(({ item, quantity }) => {
                      const itemUnitPrice = item.unit_price ? Math.round(item.unit_price / 100) : 0;
                      const lineTotal = itemUnitPrice * quantity;

                      return (
                        <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-signal uppercase">
                                {item.condition}
                              </span>
                              {item.sku && (
                                <span className="font-mono text-[10px] text-steel-soft">
                                  {item.sku}
                                </span>
                              )}
                            </div>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              {item.name}
                            </h3>
                            <div className="font-mono text-xs text-steel">
                              ₹{itemUnitPrice.toLocaleString("en-IN")} each
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-hairline rounded-machined bg-bench">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                className="p-1 text-steel hover:text-enamel cursor-pointer"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="px-2 font-mono text-xs font-bold text-enamel">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                className="p-1 text-steel hover:text-enamel cursor-pointer"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <div className="w-20 text-right font-mono text-sm font-bold text-enamel">
                              ₹{lineTotal.toLocaleString("en-IN")}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="text-steel-soft hover:text-rust transition-colors cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shop Fulfillment Options & Policy */}
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-signal" />
                      <h2 className="font-display text-base font-bold uppercase text-enamel">
                        Fulfillment &amp; Delivery Method
                      </h2>
                    </div>

                    {/* Workshop delivery support simulator toggle */}
                    <label className="flex items-center gap-2 text-xs font-mono text-steel cursor-pointer">
                      <span>Shop Home Delivery:</span>
                      <input
                        type="checkbox"
                        checked={homeDeliverySupported}
                        onChange={(e) => {
                          setHomeDeliverySupported(e.target.checked);
                          if (!e.target.checked) setSelectedFulfillment("pickup");
                        }}
                        className="rounded text-signal focus:ring-signal"
                      />
                      <span className="font-bold text-enamel">
                        {homeDeliverySupported ? "Supported" : "Pickup Only"}
                      </span>
                    </label>
                  </div>

                  {homeDeliverySupported ? (
                    <div className="space-y-3">
                      <div className="rounded-machined border border-verdigris/30 bg-verdigris-wash p-3.5 flex items-start gap-3">
                        <Truck className="size-5 text-verdigris shrink-0 mt-0.5" />
                        <div>
                          <p className="font-display text-xs font-bold uppercase text-enamel">
                            Doorstep Courier Dispatch Supported by Workshop
                          </p>
                          <p className="text-xs text-steel mt-0.5 leading-relaxed">
                            This workshop supports direct courier delivery. Full escrow payment is collected and protected until dispatch is verified.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedFulfillment("delivery")}
                          className={`p-3 rounded-machined border text-left transition-all cursor-pointer ${
                            selectedFulfillment === "delivery"
                              ? "border-signal bg-signal-wash shadow-xs"
                              : "border-hairline bg-bench text-steel hover:bg-chalk"
                          }`}
                        >
                          <div className="font-display text-xs font-bold uppercase text-enamel">
                            🚚 Home Delivery (+₹150)
                          </div>
                          <div className="font-mono text-[10px] text-steel mt-0.5">
                            Full Escrow Online Payment
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedFulfillment("pickup")}
                          className={`p-3 rounded-machined border text-left transition-all cursor-pointer ${
                            selectedFulfillment === "pickup"
                              ? "border-signal bg-signal-wash shadow-xs"
                              : "border-hairline bg-bench text-steel hover:bg-chalk"
                          }`}
                        >
                          <div className="font-display text-xs font-bold uppercase text-enamel">
                            📍 Workshop Counter Pickup
                          </div>
                          <div className="font-mono text-[10px] text-steel mt-0.5">
                            20% Advance Holding Token
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-machined border border-signal/30 bg-signal-wash p-4 space-y-2">
                      <div className="flex items-center gap-2 text-signal font-bold font-display text-sm uppercase">
                        <Store className="size-4" />
                        <span>In-Shop Counter Pickup Only</span>
                      </div>
                      <p className="text-xs text-steel leading-relaxed">
                        Home delivery is not offered for this specific workshop lot. To secure the tested hardware and prevent unauthorized reservation flaking, an <strong>Advance Reservation Fee (20%)</strong> is collected online.
                      </p>
                      <div className="text-[11px] font-mono text-enamel pt-1">
                        Remaining 80% balance is payable directly at the workshop counter upon physical multimeter test.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary & Payment Column */}
              <div className="lg:col-span-5 sticky top-24 space-y-6">
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4">
                  <div className="flex items-center gap-2 border-b border-hairline pb-3">
                    <Receipt className="size-4 text-signal" />
                    <h2 className="font-display text-base font-bold uppercase text-enamel">
                      Payment &amp; Escrow Architecture
                    </h2>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-steel">
                      <span>Parts Subtotal</span>
                      <span className="font-bold text-enamel">₹{subtotalInRupees.toLocaleString("en-IN")}</span>
                    </div>

                    {courierFee > 0 && (
                      <div className="flex justify-between text-steel">
                        <span>Courier Dispatch &amp; Insurance</span>
                        <span className="font-bold text-enamel">₹{courierFee}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-enamel border-t border-hairline pt-2">
                      <span>Total Lot Value</span>
                      <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>

                    {isAdvancePayment ? (
                      <div className="mt-3 rounded-machined border border-signal/20 bg-signal-wash p-3 space-y-1.5">
                        <div className="flex justify-between text-signal font-bold text-sm">
                          <span>Advance Reservation Due Now</span>
                          <span>₹{advanceFee.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-steel text-[11px]">
                          <span>Balance Due at Workshop Counter</span>
                          <span>₹{balanceDue.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-machined border border-verdigris/20 bg-verdigris-wash p-3 flex justify-between text-verdigris font-bold text-sm">
                        <span>Full Escrow Payment Due</span>
                        <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>

                  {/* Auth Gate Check */}
                  {!user ? (
                    <div className="rounded-machined border border-signal/40 bg-signal-wash p-4 text-center space-y-3">
                      <Lock className="size-6 text-signal mx-auto" />
                      <div className="font-display text-sm font-bold uppercase text-enamel">
                        Account Required to Place Order
                      </div>
                      <p className="text-xs text-steel">
                        Sign in or register an authorized technician account to checkout and reserve components.
                      </p>
                      <div className="flex flex-col gap-2 pt-1">
                        <Link
                          href="/login?next=/cart"
                          className="w-full rounded-machined bg-signal py-2 text-xs font-display font-semibold uppercase text-white shadow-sm hover:bg-signal-lift transition-all"
                        >
                          Sign In &rarr;
                        </Link>
                        <Link
                          href="/signup?next=/cart"
                          className="w-full rounded-machined border border-enamel py-2 text-xs font-display font-semibold uppercase text-enamel hover:bg-chalk transition-all"
                        >
                          Register Profile
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckout} className="space-y-4 pt-2 border-t border-hairline">
                      {error && (
                        <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                          <AlertCircle className="size-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div>
                        <label className="block font-mono text-[11px] font-semibold uppercase text-steel mb-1">
                          Buyer Full Name <span className="text-rust">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder="e.g. Amit Patel"
                          className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[11px] font-semibold uppercase text-steel mb-1">
                          Buyer Phone / WhatsApp <span className="text-rust">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel font-mono"
                        />
                      </div>

                      {!isAdvancePayment && (
                        <div>
                          <label className="block font-mono text-[11px] font-semibold uppercase text-steel mb-1">
                            Doorstep Courier Address <span className="text-rust">*</span>
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Plot number, bench lab, street address, pin code..."
                            className="w-full rounded-machined border border-hairline bg-bench/50 p-2 text-xs text-enamel font-mono"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 rounded-machined bg-signal py-3.5 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-lift hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Processing Escrow Transaction...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-4 fill-current" />
                            <span>
                              {isAdvancePayment
                                ? `Pay ₹${amountToPayNow.toLocaleString("en-IN")} Advance Fee`
                                : `Pay ₹${amountToPayNow.toLocaleString("en-IN")} Full Escrow`}
                            </span>
                          </>
                        )}
                      </button>

                      <div className="pt-2 text-center font-mono text-[10px] text-steel-soft flex items-center justify-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-verdigris" />
                        <span>FixGrid Escrow Protection Assured &middot; 14-Day Defect Refund Guarantee</span>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
