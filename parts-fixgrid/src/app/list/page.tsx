"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Building2,
  ShieldCheck,
  ArrowRight,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Hash,
  Boxes,
  Zap,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const PRESET_CATEGORIES = [
  "OEM OLED / AMOLED Screen Pulls",
  "PMIC & Power Management ICs",
  "Baseband & RF Transceivers",
  "Cold-Pressed Glass & Digitizers",
  "OEM High-Capacity Battery Pulls",
  "Logic Board Donor Shells",
  "Type-C & Lightning Flex Ports",
  "Stereo Micro-Speakers & Taptic",
];

export default function ListPartPage() {
  const router = useRouter();
  const { user, workshop, createWorkshop } = useAuth();

  const [name, setName] = useState("OEM Super Retina XDR OLED Assembly with Frame — iPhone 14 Pro");
  const [sku, setSku] = useState("DISP-14P-OEMPULL-A");
  const [brand, setBrand] = useState("Apple OEM Pull");
  const [condition, setCondition] = useState<"new" | "refurbished" | "used">("used");
  const [priceInRupees, setPriceInRupees] = useState("8900");
  const [quantity, setQuantity] = useState("4");
  const [lowStockThreshold, setLowStockThreshold] = useState("1");
  const [description, setDescription] = useState(
    "100% genuine pull from donor device. Verified with iTestBox jig: 120Hz ProMotion fluid, 0 dead pixels, TrueTone eeprom serial writable, frame is unbent Grade A condition."
  );

  // Bench Testing Verification checklist
  const [jigTested, setJigTested] = useState(true);
  const [esdSealed, setEsdSealed] = useState(true);
  const [sameDayShip, setSameDayShip] = useState(true);

  // Workshop fallback creation if user is signed in without shop
  const [tempShopName, setTempShopName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push("/login?next=/list");
      return;
    }

    let activeFixerId = workshop?.id;

    if (!activeFixerId) {
      if (!tempShopName.trim()) {
        setError("Please provide your workshop or laboratory name to register this listing.");
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
        sku: sku ? sku.trim() : null,
        brand: brand ? brand.trim() : null,
        condition,
        priceInRupees: priceInRupees ? priceInRupees.trim() : null,
        quantity: parseInt(quantity, 10) || 1,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 1,
        description: description.trim(),
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
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error listing hardware component";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedPrice = Number(priceInRupees || 0).toLocaleString("en-IN");

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Portal Top Bar */}
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
                  PARTS &amp; SUPPLY
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                parts.vytron.me
              </span>
            </div>
          </Link>

          {/* Breadcrumbs Navigation */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-steel">
            <Link href="/" className="hover:text-enamel transition-colors">
              Parts Catalog
            </Link>
            <ChevronRight className="size-3.5 text-steel-soft" />
            <span className="text-enamel font-medium">Reclamation Terminal</span>
            <ChevronRight className="size-3.5 text-steel-soft" />
            <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 text-signal font-semibold">
              New Listing
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider hidden sm:block"
            >
              &larr; Exit to Catalog
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-hairline pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-eyebrow uppercase tracking-wider text-signal font-bold">
                  SURPLUS RECLAMATION TERMINAL
                </span>
                <span className="size-1.5 rounded-full bg-signal animate-pulse" />
                <span className="rounded bg-chalk border border-hairline px-2 py-0.5 font-mono text-[10px] text-steel">
                  100% Bench-Tested Guarantee
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-enamel">
                List Hardware &amp; Component Stock
              </h1>
              <p className="mt-2 text-sm text-steel max-w-2xl">
                Broadcast verified OEM pulls, micro-soldering IC reels, and surplus inventory directly to 2,400+ partner workshops across the FixGrid ecosystem.
              </p>
            </div>

            {/* Subdomain Isolation Indicator */}
            <div className="flex items-center gap-3 rounded-machined border border-hairline bg-chalk px-4 py-2.5 shadow-sm text-xs font-mono text-steel">
              <div className="size-2 rounded-full bg-verdigris" />
              <span>Dedicated Domain: <strong className="text-enamel">parts.vytron.me</strong></span>
            </div>
          </div>

          {/* Authentication Gate Notice if not logged in */}
          {!user && (
            <div className="mb-8 rounded-machined border border-signal/30 bg-signal-wash p-6 shadow-bench flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-machined bg-signal text-white">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold uppercase text-enamel">
                    Workshop Authentication Required
                  </h2>
                  <p className="text-xs text-steel mt-0.5">
                    To list hardware components on parts.vytron.me, you must be signed in with a registered workshop or repair bench profile.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/login?next=/list"
                  className="rounded-machined bg-enamel px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-bench shadow-sm hover:bg-enamel-lift transition-all"
                >
                  Workshop Sign In
                </Link>
                <Link
                  href="/signup?next=/list"
                  className="rounded-machined border border-enamel bg-transparent px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-enamel shadow-sm hover:bg-chalk transition-all"
                >
                  Register Workshop
                </Link>
              </div>
            </div>
          )}

          {/* Active Workshop Badge if signed in */}
          {user && workshop && (
            <div className="mb-8 rounded-machined border border-hairline bg-chalk p-4 shadow-bench flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-machined bg-signal text-white font-mono font-bold text-sm">
                  {workshop.shop_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold uppercase text-enamel">
                      {workshop.shop_name}
                    </span>
                    <span className="rounded bg-verdigris-wash border border-verdigris/30 px-1.5 py-0.2 font-mono text-[9px] text-verdigris font-semibold">
                      VERIFIED BENCH
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-steel-soft">
                    {workshop.address || "Hardware Surplus Bench"} &middot; {user.email}
                  </span>
                </div>
              </div>

              <span className="hidden sm:inline-block font-mono text-[11px] text-steel">
                FixGrid Supplier ID: <span className="text-enamel font-bold">#{workshop.id.slice(0, 8)}</span>
              </span>
            </div>
          )}

          {/* Two-Column Studio Layout: Form on Left, Live Spec Card on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error & Success Banners */}
                {error && (
                  <div className="flex items-start gap-3 rounded-machined border border-rust/30 bg-rust-wash p-4 text-xs text-rust">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-machined border border-verdigris/30 bg-verdigris-wash p-4 text-xs text-verdigris">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Hardware Component Listed Successfully!</p>
                      <p className="text-[11px] mt-0.5 text-steel">
                        Broadcasting to partner repair shops. Returning to catalog...
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Component Identity & SKU */}
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
                  <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-5">
                    <Tag className="size-4 text-signal" />
                    <h2 className="font-display text-base font-semibold uppercase tracking-wide text-enamel">
                      1. Component Identity &amp; Classification
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Component Trade Name / Description <span className="text-rust">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. OLED Assembly with Frame — Galaxy S23 Ultra"
                        className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Internal SKU / Bin Tag
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 size-4 text-steel-soft" />
                          <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="e.g. DISP-S23U-OEM"
                            className="w-full pl-9 rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Brand / OEM Provenance
                        </label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          placeholder="e.g. Apple OEM, Samsung, Qualcomm"
                          className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-2">
                        Hardware Condition Grade <span className="text-rust">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            val: "used",
                            label: "OEM Pull",
                            sub: "Bench Grade A",
                            color: "text-verdigris",
                          },
                          {
                            val: "refurbished",
                            label: "Refurbished",
                            sub: "OCA / Cold Press",
                            color: "text-signal",
                          },
                          {
                            val: "new",
                            label: "Brand New",
                            sub: "Factory Sealed",
                            color: "text-sky-600",
                          },
                        ].map((c) => (
                          <button
                            key={c.val}
                            type="button"
                            onClick={() => setCondition(c.val as any)}
                            className={`p-3 rounded-machined border text-left transition-all cursor-pointer ${
                              condition === c.val
                                ? "border-signal bg-signal-wash shadow-sm"
                                : "border-hairline bg-bench hover:bg-chalk"
                            }`}
                          >
                            <div className="font-display text-xs font-bold uppercase text-enamel">
                              {c.label}
                            </div>
                            <div className="font-mono text-[10px] text-steel-soft mt-0.5">
                              {c.sub}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Pricing & Stock Allocation */}
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
                  <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-5">
                    <Boxes className="size-4 text-signal" />
                    <h2 className="font-display text-base font-semibold uppercase tracking-wide text-enamel">
                      2. Pricing &amp; Bench Inventory Lot
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Unit Price (INR ₹) <span className="text-rust">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-mono text-sm font-bold text-steel">
                          ₹
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={priceInRupees}
                          onChange={(e) => setPriceInRupees(e.target.value)}
                          placeholder="8900"
                          className="w-full pl-8 rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel font-mono font-bold placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Available Stock Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel font-mono placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Low Stock Alert At
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        placeholder="1"
                        className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel font-mono placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Diagnostic Specs & Testing Checklist */}
                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
                  <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-5">
                    <ShieldCheck className="size-4 text-signal" />
                    <h2 className="font-display text-base font-semibold uppercase tracking-wide text-enamel">
                      3. Bench Diagnostics &amp; Testing Notes
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Technical Description &amp; Verification Details
                      </label>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detail the multimeter values, testing jig serial, flex cable integrity, and compatibility matrix..."
                        className="w-full rounded-machined border border-hairline bg-bench/50 p-3 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                      />
                    </div>

                    {/* Quality Verification Checkboxes */}
                    <div className="space-y-2 pt-2 border-t border-hairline">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-steel block mb-1">
                        Bench Protocol Compliance:
                      </span>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-enamel select-none">
                        <input
                          type="checkbox"
                          checked={jigTested}
                          onChange={(e) => setJigTested(e.target.checked)}
                          className="size-4 rounded text-signal focus:ring-signal border-hairline"
                        />
                        <span><strong>100% Jig / Multimeter Tested:</strong> Display touch, digitizer or IC voltages verified before boxing.</span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-enamel select-none">
                        <input
                          type="checkbox"
                          checked={esdSealed}
                          onChange={(e) => setEsdSealed(e.target.checked)}
                          className="size-4 rounded text-signal focus:ring-signal border-hairline"
                        />
                        <span><strong>ESD-Shielded Packaging:</strong> Enclosed in static-shielding sleeve with bubble reinforcement.</span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-enamel select-none">
                        <input
                          type="checkbox"
                          checked={sameDayShip}
                          onChange={(e) => setSameDayShip(e.target.checked)}
                          className="size-4 rounded text-signal focus:ring-signal border-hairline"
                        />
                        <span><strong>Same-Day Dispatch Capability:</strong> Ready for instant courier pickup on bench order placement.</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Inline Workshop Registration if user has no shop */}
                {user && !workshop && (
                  <div className="rounded-machined border border-signal/40 bg-signal-wash p-6 shadow-bench">
                    <h3 className="font-display text-sm font-bold uppercase text-enamel mb-2">
                      Bench Workshop Registration Required
                    </h3>
                    <p className="text-xs text-steel mb-3">
                      Your Supabase user has no registered fixer profile. Enter your workshop trade name below to link this inventory item:
                    </p>
                    <input
                      type="text"
                      required
                      value={tempShopName}
                      onChange={(e) => setTempShopName(e.target.value)}
                      placeholder="e.g. Metro Screen Refurbishers"
                      className="w-full rounded-machined border border-hairline bg-chalk px-3.5 py-2 text-sm text-enamel"
                    />
                  </div>
                )}

                {/* Submit Action */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="font-mono text-xs text-steel-soft">
                    FixGrid Escrow Protection &middot; Zero Listing Surcharges
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-machined bg-signal px-8 py-3.5 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-lift hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Broadcasting to Network...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-4 stroke-[3]" />
                        <span>Publish Component Listing</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Real-time Hardware Spec Card Live Preview */}
            <div className="lg:col-span-5 sticky top-24">
              <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
                <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-signal" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-enamel">
                      Live Catalog Spec Card Preview
                    </span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-verdigris bg-verdigris-wash border border-verdigris/20 px-2 py-0.5 rounded font-bold">
                    REAL-TIME SYNC
                  </span>
                </div>

                {/* Simulated Spec Card */}
                <div className="rounded-machined border border-hairline bg-bench p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-signal-wash border border-signal/20 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-signal uppercase">
                        {condition === "used" ? "OEM PULL" : condition === "refurbished" ? "REFURBISHED" : "FACTORY NEW"}
                      </span>
                      {sku && (
                        <span className="font-mono text-[10px] text-steel-soft bg-chalk border border-hairline px-1.5 py-0.5 rounded">
                          {sku}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-steel">
                      <span className="size-1.5 rounded-full bg-verdigris" />
                      <span>{quantity} units</span>
                    </div>
                  </div>

                  <h3 className="font-display text-base font-bold uppercase text-enamel leading-snug line-clamp-2">
                    {name || "Hardware Component Title"}
                  </h3>

                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-steel">
                    <span>{brand || "Generic OEM"}</span>
                    <span>&middot;</span>
                    <span>{workshop ? workshop.shop_name : "Your Workshop"}</span>
                  </div>

                  <p className="mt-3 text-xs text-steel line-clamp-3 leading-relaxed border-t border-hairline pt-2.5">
                    {description || "No description provided yet."}
                  </p>

                  {/* Quality Checklist Badges */}
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-hairline">
                    {jigTested && (
                      <span className="inline-flex items-center gap-1 rounded bg-chalk border border-hairline px-1.5 py-0.5 font-mono text-[9px] text-steel">
                        <Check className="size-2.5 text-verdigris stroke-[3]" />
                        Jig Tested
                      </span>
                    )}
                    {esdSealed && (
                      <span className="inline-flex items-center gap-1 rounded bg-chalk border border-hairline px-1.5 py-0.5 font-mono text-[9px] text-steel">
                        <Check className="size-2.5 text-verdigris stroke-[3]" />
                        ESD Sealed
                      </span>
                    )}
                    {sameDayShip && (
                      <span className="inline-flex items-center gap-1 rounded bg-chalk border border-hairline px-1.5 py-0.5 font-mono text-[9px] text-steel">
                        <Zap className="size-2.5 text-signal" />
                        Same-Day Ship
                      </span>
                    )}
                  </div>

                  {/* Pricing and Action Bar */}
                  <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
                    <div>
                      <div className="font-mono text-[9px] text-steel-soft uppercase">Fixed Trade Price</div>
                      <div className="font-mono text-lg font-bold text-enamel leading-tight">
                        ₹{formattedPrice}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="rounded-machined bg-enamel px-3 py-1.5 font-display text-[11px] font-semibold uppercase text-bench opacity-90 cursor-not-allowed"
                    >
                      Inquire / Claim Lot
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="font-mono text-[10px] text-steel-soft">
                    This card matches the real-time visual appearance seen by repair buyers on parts.vytron.me
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline py-4 text-center font-mono text-[11px] text-steel-soft bg-chalk">
        FixGrid Escrow Hardware Supply Portal &middot; parts.vytron.me &middot; No unauthorized third-party broker fees
      </footer>
    </div>
  );
}
