"use client";

import React, { useState } from "react";
import {
  X,
  PackagePlus,
  Store,
  ShieldCheck,
  ArrowRight,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Sparkles,
  Tag,
  Boxes,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ListPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartListed?: () => void;
  onOpenAuth?: () => void;
}

const COMMON_BRANDS = [
  "Apple",
  "Samsung",
  "Lenovo",
  "Dell",
  "HP",
  "Sony PlayStation",
  "Nintendo",
  "Texas Instruments",
  "Qualcomm",
];

export function ListPartModal({
  isOpen,
  onClose,
  onPartListed,
  onOpenAuth,
}: ListPartModalProps) {
  const { user, workshop, createWorkshop } = useAuth();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("Apple");
  const [condition, setCondition] = useState<"new" | "refurbished" | "used">("refurbished");
  const [priceInRupees, setPriceInRupees] = useState("4500");
  const [quantity, setQuantity] = useState("3");
  const [lowStockThreshold, setLowStockThreshold] = useState("1");
  const [description, setDescription] = useState("");

  const [tempShopName, setTempShopName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please sign in as a workshop owner or bench technician to list inventory.");
      return;
    }

    let activeFixerId = workshop?.id;

    if (!activeFixerId) {
      if (!tempShopName.trim()) {
        setError("Please provide your workshop or parts depot name to publish this item.");
        return;
      }
      setSubmitting(true);
      const wsRes = await createWorkshop(tempShopName.trim());
      if (wsRes.error || !wsRes.workshop) {
        setError(wsRes.error || "Failed to initialize workshop profile.");
        setSubmitting(false);
        return;
      }
      activeFixerId = wsRes.workshop.id;
    }

    setSubmitting(true);

    try {
      const payload = {
        fixerId: activeFixerId,
        name: name.trim(),
        sku: sku.trim() || undefined,
        brand: brand.trim() || undefined,
        condition,
        priceInRupees,
        quantity: parseInt(quantity, 10) || 1,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 1,
        description: description.trim() || undefined,
      };

      const res = await fetch("/api/parts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to publish hardware item.");
      }

      setSuccess(true);
      if (onPartListed) {
        onPartListed();
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setName("");
        setSku("");
        setDescription("");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error listing part";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl z-10 font-sans text-zinc-100">
        {/* Header Schematic Strip */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Cpu className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                  BENCH INVENTORY DESK
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[9px] text-zinc-300">
                  parts.vytron.me
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                List Surplus Hardware &amp; Components
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="size-4.5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-200">Hardware Item Listed Live!</p>
                <p className="text-emerald-300/80 mt-0.5">
                  Your component is now live in the FixGrid Parts database and accessible across parts.vytron.me.
                </p>
              </div>
            </div>
          )}

          {/* Authentication Gate Prompt if not logged in */}
          {!user && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 mb-6">
              <div className="flex items-start gap-3.5">
                <Store className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Authentication Required to List Hardware
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1">
                    To prevent counterfeit components, all parts must be listed under a verified workshop or distributor account.
                  </p>
                  <div className="mt-3.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenAuth) onOpenAuth();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 shadow transition-colors cursor-pointer"
                    >
                      <span>Workshop Sign In / Register</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workshop Details if user is signed in */}
          {user && (
            <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    Listing Workshop:
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {workshop ? workshop.shop_name : "Unregistered Bench"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">
                  User: {user.email}
                </span>
              </div>

              {!workshop && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <label className="block font-mono text-[11px] text-zinc-400 uppercase mb-1">
                    Set Workshop / Distributor Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={tempShopName}
                    onChange={(e) => setTempShopName(e.target.value)}
                    placeholder="e.g. MicroTech Spares & Reclamation"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* HARDWARE LISTING FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Part Name */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Component / Part Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!user || submitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., iPhone 15 Pro OLED Display Assembly - Grade A Pull"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
              />
            </div>

            {/* SKU & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  SKU / Serial Reference
                </label>
                <input
                  type="text"
                  disabled={!user || submitting}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. OEM-IPH15P-DISP-01"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Brand / Ecosystem
                </label>
                <input
                  type="text"
                  disabled={!user || submitting}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Apple, Lenovo, Texas Instruments"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Condition & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Hardware Condition
                </label>
                <select
                  disabled={!user || submitting}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                >
                  <option value="new">Brand New (Factory Sealed)</option>
                  <option value="refurbished">Bench Refurbished &amp; Tested</option>
                  <option value="used">Original Clean Pull (OEM)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Unit Price (₹ INR) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={!user || submitting}
                  value={priceInRupees}
                  onChange={(e) => setPriceInRupees(e.target.value)}
                  placeholder="4500"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Stock Units Available
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={!user || submitting}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Description & Diagnostic Specs */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Technical Condition &amp; Bench Test Notes
              </label>
              <textarea
                rows={3}
                disabled={!user || submitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention multimeter test results, screen test jig confirmation, zero dead pixels, TrueTone reprogrammable flex status, packaging in ESD bubble pouch..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!user || submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400 to-amber-500 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-950 shadow hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Listing Component...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Publish Hardware to Parts Grid</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
