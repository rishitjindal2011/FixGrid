"use client";

import * as React from "react";
import { useState } from "react";
import { X, CheckCircle2, ShieldCheck, MapPin, Truck, Store, Send, Cpu, User, Phone, Mail } from "lucide-react";
import { type ShopInventoryItem } from "@/lib/supabase";

interface PartInquiryModalProps {
  item: ShopInventoryItem | null;
  onClose: () => void;
}

export function PartInquiryModal({ item, onClose }: PartInquiryModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "courier">("pickup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  if (!item) return null;

  const unitPrice = item.unit_price ? item.unit_price / 100 : 752.0;
  const totalPrice = unitPrice * quantity;
  const shopName = item.fixer_profiles?.shop_name || "FixGrid Verified Hardware Lab";
  const skuCode = item.sku || `SKU-${item.id.slice(0, 8).toUpperCase()}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-enamel/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-machined border-2 border-enamel/30 bg-chalk p-6 sm:p-8 shadow-lift max-h-[90vh] overflow-y-auto text-enamel">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded p-1.5 text-steel hover:bg-bench hover:text-enamel transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="border-b border-hairline pb-4 pr-6">
              <span className="font-mono text-eyebrow uppercase tracking-wider text-signal font-bold flex items-center gap-1.5">
                <Cpu className="size-3.5" /> Hardware Part Reservation &amp; Escrow
              </span>
              <h3 className="mt-1 font-display text-2xl font-semibold uppercase tracking-tight text-enamel">
                Reserve {item.name}
              </h3>
              <p className="mt-1 text-xs text-steel">
                Listed by <strong className="text-enamel font-semibold">{shopName}</strong> ({skuCode})
              </p>
            </div>

            {/* Price breakdown pill */}
            <div className="my-4 rounded-machined border border-hairline bg-bench p-3 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-steel-soft uppercase text-[10px] block">Unit Price:</span>
                <span className="font-bold text-enamel">₹{unitPrice.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-steel-soft uppercase text-[10px] block">Total with Escrow:</span>
                <span className="font-display text-lg font-bold text-signal">
                  ₹{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={item.quantity || 10}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-machined bg-bench/40 border border-hairline px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Fulfillment
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "courier")}
                    className="w-full rounded-machined bg-bench/40 border border-hairline px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                  >
                    <option value="pickup">Self-Pickup at Workshop</option>
                    <option value="courier">Insured Express Courier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                  Full Name *
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4 text-steel-soft" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Phone / WhatsApp *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 size-4 text-steel-soft" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-steel-soft" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@example.com"
                      className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {deliveryMethod === "courier" && (
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Courier Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Complete workshop or residence address with pincode..."
                    className="w-full rounded-machined bg-bench/40 border border-hairline p-3 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                  Device Model / Diagnostic Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. For iPhone 14 Pro logic board repair, need 0-cycle cell..."
                  className="w-full rounded-machined bg-bench/40 border border-hairline p-3 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-machined border border-hairline bg-bench p-2.5 text-xs text-steel font-mono">
                <ShieldCheck className="size-4 text-verdigris shrink-0" />
                <span>FixGrid Smart Escrow: payment is held safely until you inspect the hardware.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-machined px-4 py-2 font-mono text-xs text-steel hover:text-enamel transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-machined bg-signal px-6 py-2.5 font-display text-sm font-semibold uppercase tracking-wider text-white hover:bg-signal-lift transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Submit Escrow Reservation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="flex size-14 items-center justify-center rounded-machined bg-verdigris-wash text-verdigris mb-4 border border-verdigris/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="font-display text-2xl font-semibold uppercase text-enamel">
              Reservation Transmitted!
            </h3>
            <p className="mt-2 max-w-sm text-xs text-steel leading-relaxed">
              Your inquiry for <strong>{item.name}</strong> ({quantity} unit{quantity > 1 ? "s" : ""}) has been routed to{" "}
              <strong className="text-enamel">{shopName}</strong>. The workshop lead will contact you via WhatsApp shortly.
            </p>

            <div className="mt-6">
              <button
                onClick={onClose}
                className="rounded-machined bg-enamel text-bench font-display font-semibold uppercase tracking-wider px-6 py-2.5 text-xs hover:bg-enamel-lift transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
