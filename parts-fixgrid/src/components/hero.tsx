"use client";

import { useState } from "react";
import {
  Search,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  Zap,
  Sparkles,
  Package,
  Layers,
  Activity,
  BadgeCheck,
} from "lucide-react";

type JigGate = "inspection" | "thermal" | "escrow";

interface HeroProps {
  onSearch: (part: string, model: string) => void;
  partInput: string;
  setPartInput: (v: string) => void;
  modelInput: string;
  setModelInput: (v: string) => void;
  totalParts: number;
}

export function Hero({
  onSearch,
  partInput,
  setPartInput,
  modelInput,
  setModelInput,
  totalParts,
}: HeroProps) {
  const [activeGate, setActiveGate] = useState<JigGate>("inspection");
  const [isSimulatedPass, setIsSimulatedPass] = useState(false);

  return (
    <section className="relative overflow-hidden border-b border-hairline bg-gradient-to-b from-bench/80 via-chalk/90 to-bench/40">
      {/* Schematic graph paper background */}
      <div
        aria-hidden
        className="schematic schematic-fade pointer-events-none absolute inset-0 opacity-70"
      />

      {/* Atmospheric ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-signal/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-verdigris/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column (7 cols): Heading, Search, Stats */}
          <div className="flex flex-col lg:col-span-7">
            {/* Live Telemetry Pill */}
            <div className="self-start inline-flex items-center gap-2 rounded-machined border border-hairline bg-chalk/95 px-3 py-1.5 shadow-bench backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
              </span>
              <span className="font-mono text-eyebrow font-semibold uppercase tracking-[0.16em] text-enamel">
                FixGrid Component Protocol · 100% Bench-Tested · Zero Counterfeit
              </span>
            </div>

            {/* Main Display Heading */}
            <h1 className="mt-5 font-display text-4xl font-semibold uppercase tracking-tight text-enamel sm:text-5xl lg:text-6xl">
              Tested Replacement Hardware{" "}
              <span className="bg-gradient-to-r from-signal via-signal-lift to-amber-600 bg-clip-text text-transparent">
                Direct From Workshop Benches.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel sm:text-lg">
              Source bench-tested OLED assemblies, genuine OEM battery pulls, PMIC power chips, and
              surplus workshop stock. 100% multimeter and jig verified with FixGrid Smart Escrow
              Protection.
            </p>

            {/* Dual Search Console */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(partInput, modelInput);
              }}
              className="mt-6 flex flex-col gap-2.5 sm:flex-row rounded-machined border border-hairline bg-chalk p-2 shadow-bench"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 size-4 text-steel-soft" />
                <input
                  type="text"
                  placeholder="Part name, SKU, or chip (e.g. OLED, Battery, PMIC)..."
                  value={partInput}
                  onChange={(e) => setPartInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                />
              </div>

              <div className="hidden sm:block w-px bg-hairline self-stretch my-1" />

              <div className="relative flex-1 flex items-center">
                <Package className="absolute left-3 size-4 text-steel-soft" />
                <input
                  type="text"
                  placeholder="Brand or Model (e.g. iPhone 14 Pro, MacBook M2)..."
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-machined bg-signal px-6 py-2.5 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-colors cursor-pointer"
              >
                <Cpu className="size-4" />
                <span>Search Parts</span>
              </button>
            </form>

            {/* Quick Filter Bracket Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-steel font-medium flex items-center gap-1">
                <Sparkles className="size-3 text-signal" /> Popular:
              </span>
              {[
                { label: "iPhone OLED", tag: "ORIGINAL PULL" },
                { label: "MacBook Battery", tag: "OEM 0-CYCLE" },
                { label: "PMIC Power IC", tag: "NEW CHIP" },
                { label: "HDMI 2.1 Port", tag: "PS5 CONSOLE" },
                { label: "Type-C FPC", tag: "LAB JIG" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setPartInput(pill.label);
                    onSearch(pill.label, modelInput);
                  }}
                  className="inline-flex items-center gap-1 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-xs text-steel hover:border-signal hover:text-signal transition-colors font-mono cursor-pointer"
                >
                  <span>{pill.label}</span>
                  <span className="text-[10px] text-steel-soft">[{pill.tag}]</span>
                </button>
              ))}
            </div>

            {/* 4 Telemetry Metrics */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-hairline pt-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Catalog Items
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  {totalParts} Listed SKU{totalParts !== 1 ? "s" : ""}
                </p>
                <span className="font-mono text-[11px] text-verdigris flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-verdigris inline-block" /> Live Bench Shelves
                </span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Bench Testing
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-signal">
                  100% Tested
                </p>
                <span className="font-mono text-[11px] text-steel">Multimeter &amp; Jig Verified</span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Escrow Protection
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  0% Risk
                </p>
                <span className="font-mono text-[11px] text-steel">Funds Held During Test</span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Local Handover
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  Same-Day
                </p>
                <span className="font-mono text-[11px] text-steel">Walk-In Bench Pickup</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Jig & Escrow Console */}
          <div className="relative w-full max-w-lg mx-auto lg:max-w-none lg:col-span-5">
            {/* Ambient Outer Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 rounded-machined bg-gradient-to-r from-signal/20 via-enamel/30 to-verdigris/20 opacity-70 blur-xl transition-all"
            />

            {/* Floating Trust Badge */}
            <div className="hidden sm:flex absolute -top-4 -right-3 z-10 items-center gap-1.5 rounded-machined border border-hairline bg-chalk/95 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-enamel shadow-lift backdrop-blur">
              <ShieldCheck className="size-4 text-verdigris" />
              <span>100% Smart Escrow Protection</span>
            </div>

            {/* Machined Console Housing */}
            <div className="relative overflow-hidden rounded-machined border-2 border-enamel/30 bg-chalk shadow-lift">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-hairline bg-enamel px-4 py-2.5 text-bench">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
                  </span>
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-bench">
                    FixGrid Hardware Jig &amp; Escrow Console
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-signal bg-enamel-lift px-2 py-0.5 rounded font-bold">
                  Interactive Simulator
                </span>
              </div>

              {/* 3-Gate Navigation Tabs */}
              <div className="grid grid-cols-3 border-b border-hairline bg-bench-sunk/50 text-xs font-display uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveGate("inspection")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "inspection"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <Cpu className="size-3.5 shrink-0" />
                  <span>1. Jig Pinout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGate("thermal")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "thermal"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <Flame className="size-3.5 shrink-0" />
                  <span>2. Thermal Check</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGate("escrow")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "escrow"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <BadgeCheck className="size-3.5 shrink-0" />
                  <span>3. Escrow Vault</span>
                </button>
              </div>

              {/* Console Body */}
              <div className="p-5">
                {/* Gate 1: Jig Inspection */}
                {activeGate === "inspection" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Real-Time Telemetry Jigs:
                      </span>
                      <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash px-2 py-0.5 rounded font-semibold">
                        Zero Short Circuit
                      </span>
                    </div>

                    <div className="rounded-machined border border-hairline bg-bench-sunk/40 p-3 font-mono text-xs space-y-1.5">
                      <div className="flex justify-between text-steel">
                        <span>VBUS Rail Voltage:</span>
                        <span className="text-enamel font-bold">5.12 V (Nominal)</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Data Lines D+ / D-:</span>
                        <span className="text-enamel font-bold">0.68 V / 0.68 V (Balanced)</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Ground Resistance:</span>
                        <span className="text-verdigris font-bold">0.02 Ω (Zero Leakage)</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>IC Die Serial Match:</span>
                        <span className="text-signal font-bold">GENUINE OEM SEC-89F</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft">
                        Grading:
                      </span>
                      <span className="rounded border border-verdigris/30 bg-verdigris-wash px-2 py-0.5 font-mono text-[10px] text-verdigris font-semibold">
                        Brand New OEM
                      </span>
                      <span className="rounded border border-hairline bg-chalk px-2 py-0.5 font-mono text-[10px] text-enamel font-semibold">
                        Original Service Center Pull (Grade A+)
                      </span>
                    </div>
                  </div>
                )}

                {/* Gate 2: Thermal Check */}
                {activeGate === "thermal" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Thermal Imager Diagnostics:
                      </span>
                      <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash px-2 py-0.5 rounded font-semibold">
                        FLIR Audited
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { title: "Idle Surface Heat", detail: "31.2°C (Cold-die operating threshold verified)" },
                        { title: "Power Rail Load Step", detail: "Uniform dissipation across all MLCC caps" },
                        { title: "Micro-Solder Joints", detail: "No cold solder, cracks, or fractured solder balls" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-machined border border-hairline bg-chalk p-2.5 shadow-sm"
                        >
                          <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                          <div>
                            <div className="font-display text-xs font-semibold uppercase text-enamel">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-steel">{item.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gate 3: Escrow Vault */}
                {activeGate === "escrow" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Smart Escrow Protection Guarantee:
                      </span>
                      <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash px-2 py-0.5 rounded font-semibold">
                        0% Advance Risk
                      </span>
                    </div>

                    <div className="rounded-machined border border-dashed border-verdigris/50 bg-verdigris-wash/30 p-3.5 space-y-2 font-mono text-xs">
                      <div className="flex justify-between text-steel">
                        <span>Advance Paid to Workshop:</span>
                        <span className="font-semibold text-verdigris">₹0 (Zero Risk)</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Escrow Vault State:</span>
                        <span className="font-semibold text-enamel">Locked until Physical Inspection</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Return &amp; Refund Window:</span>
                        <span className="font-semibold text-signal">48h Testing Window</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Action Simulation Button */}
                <div className="mt-5 pt-4 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => setIsSimulatedPass(!isSimulatedPass)}
                    className="w-full flex items-center justify-center gap-2 rounded-machined bg-enamel px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-colors cursor-pointer"
                  >
                    {isSimulatedPass ? (
                      <>
                        <CheckCircle2 className="size-4 text-verdigris" />
                        <span>Hardware Bench Quality Certified · Escrow Pass</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-4 text-signal" />
                        <span>Simulate Bench Hardware Pass</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </>
                    )}
                  </button>

                  <p className="mt-2 text-center font-mono text-[10px] text-steel-soft">
                    Simulate how FixGrid tests hardware on genuine jigs before releasing escrow to workshops.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
