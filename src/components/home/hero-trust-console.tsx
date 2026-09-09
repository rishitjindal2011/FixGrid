"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Lock,
  ArrowRight,
  Zap,
  RotateCcw,
  Check,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ProtocolGate = "diagnostic" | "escrow" | "release";

export function HeroTrustConsole() {
  const [activeGate, setActiveGate] = useState<ProtocolGate>("escrow");
  const [isSimulatedRelease, setIsSimulatedRelease] = useState(false);

  function handleSelectGate(gate: ProtocolGate) {
    setActiveGate(gate);
    setIsSimulatedRelease(false);
  }

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Outer ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-machined bg-gradient-to-r from-signal/20 via-enamel/30 to-verdigris/20 opacity-70 blur-xl transition-all"
      />

      {/* Floating Trust Badge - Top Right */}
      <div className="hidden sm:flex absolute -top-4 -right-3 z-10 items-center gap-1.5 rounded-machined border border-hairline bg-chalk/95 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-enamel shadow-lift backdrop-blur">
        <ShieldCheck className="size-4 text-verdigris" />
        <span>100% Smart Escrow Protection</span>
      </div>

      {/* Machined Console Housing */}
      <div className="relative overflow-hidden rounded-machined border-2 border-enamel/30 bg-chalk shadow-lift">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-hairline bg-enamel px-4 py-2.5 text-bench">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-bench">
              FixGrid Escrow &amp; Diagnostic Protocol
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-signal bg-enamel-lift px-2 py-0.5 rounded font-bold">
            Interactive Protocol
          </span>
        </div>

        {/* 3-Gate Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-hairline bg-bench-sunk/50 text-xs font-display uppercase tracking-wider">
          <button
            type="button"
            onClick={() => handleSelectGate("diagnostic")}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
              activeGate === "diagnostic"
                ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                : "text-steel hover:bg-chalk/60 hover:text-enamel"
            }`}
          >
            <Cpu className="size-3.5 shrink-0" />
            <span>1. Diagnostic</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectGate("escrow")}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
              activeGate === "escrow"
                ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                : "text-steel hover:bg-chalk/60 hover:text-enamel"
            }`}
          >
            <Lock className="size-3.5 shrink-0" />
            <span>2. Escrow Vault</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectGate("release")}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
              activeGate === "release"
                ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                : "text-steel hover:bg-chalk/60 hover:text-enamel"
            }`}
          >
            <BadgeCheck className="size-3.5 shrink-0" />
            <span>3. Payout Release</span>
          </button>
        </div>

        {/* Active Gate Content Body */}
        <div className="p-5 sm:p-6 bg-chalk space-y-4">
          {/* Gate 1: Itemized Diagnostic */}
          {activeGate === "diagnostic" && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                <div>
                  <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                    Gate 1 · Upfront Verification
                  </span>
                  <h3 className="font-display text-sm font-bold uppercase text-enamel">
                    Bench Diagnostic &amp; Fixed Quotation
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                  Zero Surprise Fees
                </span>
              </div>

              <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">Hardware In-Circuit Isolation:</strong> Multimeter impedance and circuit diagnosis isolate defective chips before any soldering starts.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">Itemized Work Order:</strong> Parts and bench labor are locked upfront. Workshops cannot add unauthorized fees later.
                  </p>
                </div>
              </div>

              <div className="rounded-machined border border-hairline bg-chalk p-3 text-xs font-mono text-steel">
                <div className="flex items-center justify-between">
                  <span>Work Order Status:</span>
                  <span className="font-semibold text-enamel">Quote Locked Before Work</span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-hairline/60">
                  <span>Customer Approval:</span>
                  <span className="text-verdigris font-semibold">Required to Proceed</span>
                </div>
              </div>
            </div>
          )}

          {/* Gate 2: Smart Escrow Vault */}
          {activeGate === "escrow" && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                <div>
                  <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                    Gate 2 · Fund Protection
                  </span>
                  <h3 className="font-display text-sm font-bold uppercase text-enamel">
                    Smart Escrow Vault Security
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase flex items-center gap-1">
                  <Lock className="size-3" /> 0% Advance Risk
                </span>
              </div>

              <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">Armored Escrow Deposit:</strong> Customer funds are held in secure platform escrow. 0% is released to the workshop upfront.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">Full Refund Protection:</strong> If a fault cannot be resolved, 100% of escrow funds remain protected.
                  </p>
                </div>
              </div>

              <div className="rounded-machined border-2 border-dashed border-verdigris/40 bg-verdigris-wash/40 p-3 text-xs font-mono">
                <div className="flex items-center justify-between text-steel">
                  <span>Advance Paid to Shop:</span>
                  <span className="font-bold text-verdigris">₹0 (Zero Upfront Risk)</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-steel">
                  <span>Vault Security State:</span>
                  <span className="font-bold text-enamel">Locked until Customer Approval</span>
                </div>
              </div>
            </div>
          )}

          {/* Gate 3: Customer Inspection & Release */}
          {activeGate === "release" && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                <div>
                  <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                    Gate 3 · Handover &amp; Warranty
                  </span>
                  <h3 className="font-display text-sm font-bold uppercase text-enamel">
                    Customer Inspection &amp; Seal
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                  You Only Pay When Satisfied
                </span>
              </div>

              <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">Physical Counter Inspection:</strong> Test your device functionality before releasing payout to the repair shop.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <p className="text-steel leading-relaxed">
                    <strong className="text-enamel">5-Day Warranty Seal:</strong> Authorizing payout activates a tamper-evident physical and digital warranty passport.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Protocol Simulation Action */}
          <div className="pt-1">
            {!isSimulatedRelease ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => setIsSimulatedRelease(true)}
                  className="w-full bg-enamel hover:bg-enamel-lift text-bench font-display uppercase tracking-wider text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-bench"
                >
                  <Lock className="size-3.5 text-signal" />
                  <span>Simulate: Customer Approves &amp; Authorizes Release</span>
                  <ArrowRight className="size-3.5" />
                </Button>
                <p className="text-center font-mono text-[10px] text-steel-soft">
                  Click to test how smart escrow releases payment only after your verification.
                </p>
              </div>
            ) : (
              <div className="rounded-machined border border-verdigris/40 bg-verdigris-wash p-3.5 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-verdigris text-xs">
                    <CheckCircle2 className="size-4" />
                    <span>Customer Verification Confirmed · Payout Released!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSimulatedRelease(false)}
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-steel hover:text-enamel uppercase cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </button>
                </div>
                <p className="text-[11px] text-steel leading-relaxed">
                  Funds transferred to technician only after customer inspected the device. 5-day platform warranty passport sealed.
                </p>
              </div>
            )}
          </div>

          {/* Verified Repair Categories Quick Links */}
          <div className="border-t border-hairline pt-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-steel block mb-2 font-medium">
              Explore Verified Categories:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/repair/macbook-screen-repair"
                className="rounded-machined border border-hairline bg-bench/30 px-2 py-0.5 font-mono text-[10px] text-steel hover:border-signal hover:text-signal transition-colors"
              >
                MacBook Screen
              </Link>
              <Link
                href="/repair/iphone-battery-replacement"
                className="rounded-machined border border-hairline bg-bench/30 px-2 py-0.5 font-mono text-[10px] text-steel hover:border-signal hover:text-signal transition-colors"
              >
                iPhone Battery
              </Link>
              <Link
                href="/repair/playstation-hdmi-repair"
                className="rounded-machined border border-hairline bg-bench/30 px-2 py-0.5 font-mono text-[10px] text-steel hover:border-signal hover:text-signal transition-colors"
              >
                PS5 HDMI
              </Link>
              <Link
                href="/repair/laptop-liquid-damage"
                className="rounded-machined border border-hairline bg-bench/30 px-2 py-0.5 font-mono text-[10px] text-steel hover:border-signal hover:text-signal transition-colors"
              >
                Water Damage
              </Link>
              <Link
                href="/repair/inverter-pcb-repair"
                className="rounded-machined border border-hairline bg-bench/30 px-2 py-0.5 font-mono text-[10px] text-steel hover:border-signal hover:text-signal transition-colors"
              >
                Inverter AC PCB
              </Link>
            </div>
          </div>
        </div>

        {/* Terminal Footer Bar */}
        <div className="flex items-center justify-between border-t border-hairline bg-bench-sunk/40 px-4 py-2 font-mono text-[11px] text-steel">
          <span className="flex items-center gap-1 text-enamel font-semibold">
            <ShieldCheck className="size-3.5 text-verdigris" />
            100% Escrow Protection
          </span>
          <Link
            href="/search"
            className="flex items-center gap-1 font-semibold text-signal hover:underline"
          >
            <span>Browse Directory</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
