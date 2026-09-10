"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  ShieldCheck,
  Cpu,
  Layers,
  BadgeCheck,
  Wrench,
  Flame,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";

type ProtocolGate = "tier" | "modality" | "payout";

interface HeroProps {
  onSearch: (role: string, location: string) => void;
  roleInput: string;
  setRoleInput: (v: string) => void;
  locationInput: string;
  setLocationInput: (v: string) => void;
  totalJobs: number;
}

export function Hero({
  onSearch,
  roleInput,
  setRoleInput,
  locationInput,
  setLocationInput,
  totalJobs,
}: HeroProps) {
  const [activeGate, setActiveGate] = useState<ProtocolGate>("tier");
  const [selectedTier, setSelectedTier] = useState<"L1" | "L2" | "L3">("L3");
  const [isSimulatedConnected, setIsSimulatedConnected] = useState(false);

  const TIER_DATA = {
    L1: {
      title: "L1 Hardware Assembly & Screen Swaps",
      salary: "₹25,000 – ₹38,000 / mo",
      bounty: "₹8,000 rework incentive",
      gear: ["Curved Screen Heat Separator", "Torx & Pentalobe Precision Bits", "Antistatic ESD Wristbands"],
      description: "Modular screen, battery, flex, and housing replacements with zero casing distortion.",
    },
    L2: {
      title: "L2 Board Component & Port Rework",
      salary: "₹38,000 – ₹55,000 / mo",
      bounty: "₹15,000 rework incentive",
      gear: ["Digital Multimeter & Jigs", "Hakko FX-888D Solder Station", "Sub-board Preheaters"],
      description: "Port replacements, FPC connector rejuvenation, and simple circuit diode testing.",
    },
    L3: {
      title: "L3 Chip-Level & Micro-Soldering BGA",
      salary: "₹55,000 – ₹85,000+ / mo",
      bounty: "₹25,000 rework incentive",
      gear: ["Quick 861DW Hot Air", "7X-45X Stereo Microscope", "QianLi Thermal Imager", "ZXW / XinZhiZao Schematics"],
      description: "BGA reballing, power IC diagnosis, trace jumpering, and White Light of Death restoration.",
    },
  };

  return (
    <section className="relative overflow-hidden border-b border-hairline bg-gradient-to-b from-bench/80 via-chalk/90 to-bench/40">
      {/* Schematic graph paper background */}
      <div
        aria-hidden
        className="schematic schematic-fade pointer-events-none absolute inset-0 opacity-70"
      />

      {/* Atmospheric highlights */}
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
                FixGrid Artisan Bench Protocol · Zero Recruiter Cut
              </span>
            </div>

            {/* Main Display Heading */}
            <h1 className="mt-5 font-display text-4xl font-semibold uppercase tracking-tight text-enamel sm:text-5xl lg:text-6xl">
              Where Precision Hardware Artisans{" "}
              <span className="bg-gradient-to-r from-signal via-signal-lift to-amber-600 bg-clip-text text-transparent">
                Find Their Bench.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel sm:text-lg">
              Direct bench seats with certified micro-soldering labs, diagnostics workshops, and
              electronics repair facilities. Zero recruiter spam, direct WhatsApp/phone connect, and
              escrow-backed compensation terms.
            </p>

            {/* Dual Search Console */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(roleInput, locationInput);
              }}
              className="mt-6 flex flex-col gap-2.5 sm:flex-row rounded-machined border border-hairline bg-chalk p-2 shadow-bench"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 size-4 text-steel-soft" />
                <input
                  type="text"
                  placeholder="Job title, skill (BGA, Screen, Soldering)..."
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                />
              </div>

              <div className="hidden sm:block w-px bg-hairline self-stretch my-1" />

              <div className="relative flex-1 flex items-center">
                <MapPin className="absolute left-3 size-4 text-steel-soft" />
                <input
                  type="text"
                  placeholder="City or Sector (e.g. Noida 23)..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-machined bg-signal px-6 py-2.5 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-colors cursor-pointer"
              >
                <Wrench className="size-4" />
                <span>Search Benches</span>
              </button>
            </form>

            {/* Quick Filter Bracket Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-steel font-medium flex items-center gap-1">
                <Sparkles className="size-3 text-signal" /> Quick Filter:
              </span>
              {[
                { label: "Micro-Soldering", tag: "L3 CHIP" },
                { label: "Logic Board", tag: "IPHONE/MAC" },
                { label: "Screen Refurbishing", tag: "OCA" },
                { label: "Console HDMI", tag: "WLOD" },
                { label: "Inverter PCB", tag: "AC/HVAC" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setRoleInput(pill.label);
                    onSearch(pill.label, locationInput);
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
                  Verified Openings
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  {totalJobs} Active Seat{totalJobs !== 1 ? "s" : ""}
                </p>
                <span className="font-mono text-[11px] text-verdigris flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-verdigris inline-block" /> 100% Genuine Workshops
                </span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Compensation
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-signal">
                  ₹25k – ₹85k+
                </p>
                <span className="font-mono text-[11px] text-steel">Monthly + Overtime</span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Technical Tier
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  L1 to L3 Chip
                </p>
                <span className="font-mono text-[11px] text-steel">Schematics &amp; Microscope</span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-steel-soft">
                  Recruiter Markup
                </span>
                <p className="font-display text-2xl font-semibold uppercase text-enamel">
                  ₹0 Zero Fees
                </p>
                <span className="font-mono text-[11px] text-steel">Direct Shop Payout</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Protocol Console (Identical to HeroTrustConsole) */}
          <div className="relative w-full max-w-lg mx-auto lg:max-w-none lg:col-span-5">
            {/* Ambient Outer Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 rounded-machined bg-gradient-to-r from-signal/20 via-enamel/30 to-verdigris/20 opacity-70 blur-xl transition-all"
            />

            {/* Floating Trust Badge */}
            <div className="hidden sm:flex absolute -top-4 -right-3 z-10 items-center gap-1.5 rounded-machined border border-hairline bg-chalk/95 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-enamel shadow-lift backdrop-blur">
              <ShieldCheck className="size-4 text-verdigris" />
              <span>100% Escrow Protected Bench</span>
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
                    FixGrid Bench Protocol &amp; Rig Console
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
                  onClick={() => setActiveGate("tier")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "tier"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <Cpu className="size-3.5 shrink-0" />
                  <span>1. Bench Tier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGate("modality")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "modality"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <Layers className="size-3.5 shrink-0" />
                  <span>2. Lab Rig</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGate("payout")}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                    activeGate === "payout"
                      ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                      : "text-steel hover:bg-chalk/60 hover:text-enamel"
                  }`}
                >
                  <BadgeCheck className="size-3.5 shrink-0" />
                  <span>3. Net Payout</span>
                </button>
              </div>

              {/* Console Body Area */}
              <div className="p-5">
                {/* Gate 1: Bench Tier */}
                {activeGate === "tier" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Select Technician Specialization:
                      </span>
                      <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash px-2 py-0.5 rounded font-semibold">
                        Grounded ESD Rig
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(["L1", "L2", "L3"] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setSelectedTier(tier)}
                          className={`rounded-machined border p-2 text-center transition-all cursor-pointer ${
                            selectedTier === tier
                              ? "border-signal bg-signal-wash text-signal font-semibold shadow-sm"
                              : "border-hairline bg-bench/40 text-steel hover:bg-chalk"
                          }`}
                        >
                          <div className="font-display text-base font-bold">{tier} Specialist</div>
                          <div className="font-mono text-[10px]">{tier === "L3" ? "BGA Chip" : tier === "L2" ? "Component" : "Assembly"}</div>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-machined border border-hairline bg-bench-sunk/30 p-3.5 space-y-2">
                      <div className="font-display text-sm font-semibold uppercase text-enamel">
                        {TIER_DATA[selectedTier].title}
                      </div>
                      <p className="text-xs text-steel leading-relaxed">
                        {TIER_DATA[selectedTier].description}
                      </p>
                      <div className="pt-2 border-t border-hairline/60">
                        <span className="font-mono text-[10px] text-steel-soft uppercase tracking-wider block mb-1">
                          Verified Station Gear Provided:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {TIER_DATA[selectedTier].gear.map((g) => (
                            <span
                              key={g}
                              className="rounded border border-hairline bg-chalk px-1.5 py-0.5 font-mono text-[10px] text-enamel"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gate 2: Lab Rig */}
                {activeGate === "modality" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Station Standards Verified:
                      </span>
                      <span className="font-mono text-[10px] text-signal bg-signal-wash px-2 py-0.5 rounded font-semibold">
                        Audited Lab
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { title: "Optical Stereo Microscope", detail: "7X to 45X zoom with ring LED illumination" },
                        { title: "Grounded Soldering & Hot Air", detail: "Quick 861DW or JBC station with ESD ground pin" },
                        { title: "Schematic Rail Diagnostics", detail: "XinZhiZao / ZXW boardview licenses active" },
                        { title: "Safety & Direct Payment", detail: "No commission deductions or security deposits" },
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

                {/* Gate 3: Net Payout */}
                {activeGate === "payout" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-steel">
                        Projected Monthly Compensation:
                      </span>
                      <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash px-2 py-0.5 rounded font-semibold">
                        Escrow Guaranteed
                      </span>
                    </div>

                    <div className="rounded-machined border border-dashed border-verdigris/50 bg-verdigris-wash/30 p-3.5 space-y-2 font-mono text-xs">
                      <div className="flex justify-between text-steel">
                        <span>Base Monthly Retainer:</span>
                        <span className="font-semibold text-enamel">₹50,000</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Repair Completion Bounty:</span>
                        <span className="font-semibold text-signal">+₹25,000</span>
                      </div>
                      <div className="flex justify-between text-steel">
                        <span>Recruiter Agency Commission:</span>
                        <span className="font-semibold text-verdigris">₹0 (Zero Markup)</span>
                      </div>
                      <div className="border-t border-hairline pt-2 flex justify-between font-bold text-sm text-enamel">
                        <span>Net Take-Home Benchmark:</span>
                        <span className="text-signal font-display text-lg">₹75,000 / mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Action Simulation Button */}
                <div className="mt-5 pt-4 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => setIsSimulatedConnected(!isSimulatedConnected)}
                    className="w-full flex items-center justify-center gap-2 rounded-machined bg-enamel px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-colors cursor-pointer"
                  >
                    {isSimulatedConnected ? (
                      <>
                        <CheckCircle2 className="size-4 text-verdigris" />
                        <span>Bench Protocol Authorized · Direct WhatsApp Ready</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-4 text-signal" />
                        <span>Simulate Direct Workshop Connection</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </>
                    )}
                  </button>

                  <p className="mt-2 text-center font-mono text-[10px] text-steel-soft">
                    Simulate how FixGrid connects artisans directly with workshop owners with zero recruiter cuts.
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
