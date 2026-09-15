"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  Flame,
  Zap,
  MapPin,
  Building2,
  Lock,
  Search,
  Layers,
  ChevronRight,
  Package,
  RotateCcw,
  Check,
  HelpCircle,
  Clock,
  BatteryCharging,
  Sliders,
  Scale,
  DollarSign,
  ShoppingCart,
  Truck,
  BadgeCheck,
  Microscope,
  FileCheck2,
  Laptop,
  Gamepad2,
  Tv,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { type ShopInventoryItem } from "@/lib/supabase";

type ProtocolGate = "testing" | "escrow" | "handover";

const CATEGORIES = [
  { name: "OLED & Screens", tag: "ORIGINAL PULL", path: "/catalog?category=OLED" },
  { name: "PMIC & Power ICs", tag: "BGA CHIP", path: "/catalog?category=PMIC" },
  { name: "OEM Battery Cells", tag: "0-CYCLE", path: "/catalog?category=Battery" },
  { name: "HDMI & Ports", tag: "FPC MODULE", path: "/catalog?category=Port" },
  { name: "Donor Motherboards", tag: "DONOR PCB", path: "/catalog?category=Donor" },
  { name: "Amtech Flux & Solder", tag: "BENCH GRADE", path: "/catalog?category=Flux" },
];

const PARTS_DIAGNOSTIC_SOLVERS = [
  {
    title: "MacBook Logic Board Power Rail PMIC Triage",
    component: "CD3217 / ISL9240 / T2 PMIC",
    diagnosticRail: "PPBUS_G3H & 20V USB-C Negotiator",
    category: "Apple Mac Silicon",
    badge: "BGA Power IC",
    priceRange: "₹450 – ₹1,850",
    summary: "Solves 5V stuck boot-looping on M1/M2/M3 & Intel MacBooks. Diode checked against XinZhiZao schematics with pre-tinned BGA ball matrix.",
    filter: "CD3217",
  },
  {
    title: "iPhone TriStar / Hydra / Tigris Charging Logic",
    component: "1612A1 / CBTL1610A3 / SN2600B1",
    diagnosticRail: "VBUS Diode Rail & USB Differential Line",
    category: "iPhone Logic",
    badge: "Diode Tested",
    priceRange: "₹280 – ₹950",
    summary: "Resolves slow charging, fake battery percentage, and 0.00A current draw under USB ammeter. Factory reel cut with zero leakage.",
    filter: "TriStar",
  },
  {
    title: "PlayStation 5 HDMI 2.1 Display Retimer Chip",
    component: "Panasonic MN864739 / MN864729",
    diagnosticRail: "TMDS / FRL 48Gbps Video Transmission",
    category: "Gaming Consoles",
    badge: "QFN Module",
    priceRange: "₹1,200 – ₹2,400",
    summary: "Cures White Light of Death (WLOD) and blank display output on PS5 & Xbox Series X. 100% genuine pull from audited console labs.",
    filter: "MN864739",
  },
  {
    title: "Inverter AC Multi-Phase IPM Motor Driver IGBT",
    component: "Mitsubishi PS21964-4S / Fuji IPM",
    diagnosticRail: "3-Phase UVW Compressor Inverter Rail",
    category: "HVAC & Appliances",
    badge: "High Voltage",
    priceRange: "₹850 – ₹2,100",
    summary: "Resolves compressor motor stalling, overcurrent fault codes (E6/F3), and blown gate driver circuits in Daikin, LG & Voltas boards.",
    filter: "IPM Module",
  },
  {
    title: "Original Factory OLED Screen Assembly",
    component: "Samsung Dynamic AMOLED 2X / Super Retina",
    diagnosticRail: "40-Pin MIPI DSI & Touch Digitizer FPC",
    category: "Display Assemblies",
    badge: "Grade A+ Donor",
    priceRange: "₹3,500 – ₹16,500",
    summary: "Genuine factory donor display with intact TrueTone/ProMotion EEPROM. Zero aftermarket touch lag, green line artifacts, or ghost touch.",
    filter: "OLED",
  },
  {
    title: "Dual-Port USB-C Delivery Controller",
    component: "TI TPS65988 / Parade PS8802",
    diagnosticRail: "CC1/CC2 Logic & 20V VBUS Gate Drivers",
    category: "Laptop Motherboards",
    badge: "QFN Silicon",
    priceRange: "₹380 – ₹1,150",
    summary: "Restores liquid-damaged Thunderbolt / Type-C ports on Dell XPS, Lenovo ThinkPad, and HP Spectre. Pre-programmed firmware compatible.",
    filter: "TPS65988",
  },
  {
    title: "Nintendo Switch Power & Video Management IC",
    component: "M92T36 / BQ24193 / PI3USB",
    diagnosticRail: "Auto-Docking 15V Fast Charge & DisplayPort",
    category: "Handheld Consoles",
    badge: "OEM Tested",
    priceRange: "₹320 – ₹780",
    summary: "Eliminates orange screen freeze, battery charging stoppage, and dead dock video output. 100% diode impedance matched.",
    filter: "M92T36",
  },
  {
    title: "Commercial Drone Brushless Motor 40V MOSFETs",
    component: "Vishay TrenchFET / Infineon OptiMOS",
    diagnosticRail: "ESC Phase Switch High-Current Gate",
    category: "Aviation Robotics",
    badge: "Surface Mount",
    priceRange: "₹180 – ₹620",
    summary: "Replaces blown brushless motor driver stages on DJI enterprise & custom FPV drones. Zero thermal drift under 6S/8S battery packs.",
    filter: "MOSFET",
  },
];

const METRO_WHOLESALE_HUBS = [
  {
    city: "Delhi NCR",
    subHubs: [
      { name: "Nehru Place Electronics Market", count: "52 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Motherboards & BGA ICs" },
      { name: "Gaffar Market Karol Bagh", count: "38 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "OLED Displays & Phone Flex" },
      { name: "Lajpat Nagar Central", count: "14 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Laptop Batteries & Cells" },
      { name: "Noida Sector 18 Tech Row", count: "16 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Apple Donor Scrap & PMICs" },
    ],
  },
  {
    city: "Mumbai & Thane",
    subHubs: [
      { name: "Lamington Road Hardware Corridor", count: "42 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "MacBook Silicon & PS5 Chips" },
      { name: "Grant Road Station District", count: "22 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Display Panels & Consumables" },
      { name: "Kurla West Industrial Market", count: "15 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Appliance IPM Inverters" },
      { name: "Andheri MIDC Technology Zone", count: "18 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Enterprise Server Pulls" },
    ],
  },
  {
    city: "Bengaluru",
    subHubs: [
      { name: "SP Road Micro-Electronics Hub", count: "36 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "BGA ICs & Test Equipment" },
      { name: "Koramangala Tech Strip", count: "18 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Smartphone Batteries & Cameras" },
      { name: "Jayanagar Component Row", count: "12 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Laptop Motherboard Pulls" },
      { name: "Whitefield Tech Cluster", count: "14 Certified Labs", fulfillment: "Same-Day Courier", stock: "Industrial Electronics" },
    ],
  },
  {
    city: "Hyderabad & Secunderabad",
    subHubs: [
      { name: "CTC Parklane Electronics Complex", count: "22 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Gaming Console Silicon" },
      { name: "Gujarati Galli Koti Market", count: "18 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Mobile Phone ICs & Stencils" },
      { name: "Ameerpet Electronics Cluster", count: "12 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Inverter AC Boards" },
    ],
  },
  {
    city: "Chennai",
    subHubs: [
      { name: "Ritchie Street Wholesale District", count: "26 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Display COF & Logic ICs" },
      { name: "Mount Road Service Corridor", count: "14 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Apple MacBook Silicon" },
      { name: "T Nagar Commercial Row", count: "10 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Smartphone Connectors" },
    ],
  },
  {
    city: "Kolkata",
    subHubs: [
      { name: "Chandni Chowk Electronics Hub", count: "20 Certified Labs", fulfillment: "Same-Day Pickup/Courier", stock: "Power Electronics & Scrap" },
      { name: "Princep Street Hardware Row", count: "14 Certified Labs", fulfillment: "Same-Day Pickup", stock: "Inverter IPMs & TV Panels" },
      { name: "Salt Lake Sector V Tech Row", count: "12 Certified Labs", fulfillment: "Same-Day Courier", stock: "Robotics Components" },
    ],
  },
];

const AEO_FAQS = [
  {
    question: "What is the difference between an OEM donor pull and an aftermarket clone?",
    shortAnswer: "OEM donor pulls are genuine factory components harvested from authentic devices by certified technicians.",
    detailed: "Donor pulls preserve original color calibration, cryptographic controller pairing, low thermal dissipation, and authentic silicon die architecture. In contrast, aftermarket clones use reverse-engineered third-party dies that frequently trigger iOS/Android health warnings, battery drain, or sudden failure under thermal load.",
  },
  {
    question: "How does Advance Fee Local Workshop Pickup work?",
    shortAnswer: "You pay a minor reservation advance online, inspect the component at the seller's laboratory, and pay the balance in person.",
    detailed: "To eliminate travel to an out-of-stock shop or buying broken parts, FixGrid lets you lock the component with a nominal escrow deposit (₹150). You visit the verified workshop bench, test the component under your own multimeter or test jig, and finalize the balance only after confirming functionality.",
  },
  {
    question: "What escrow guarantees protect pan-India courier shipments?",
    shortAnswer: "100% of your payment is held securely in FixGrid Escrow until you receive and bench-test the component.",
    detailed: "For all courier deliveries, funds are never released to the seller upon dispatch. Once the parcel arrives, you receive a full 5-day bench testing window. If the part displays diode short circuits, broken solder pads, or fails triage, you are protected by 100% escrow refund coverage.",
  },
  {
    question: "How are lab component sellers and repair workshops audited on FixGrid?",
    shortAnswer: "Suppliers undergo on-site physical inspection, GSTIN validation, and bench tooling audits.",
    detailed: "FixGrid field inspectors examine seller premises to verify genuine salvage operations, stereomicroscope inspection stations, anti-static ESD packaging, and authentic part storage. Roadside stalls selling unchecked gray-market batches without diagnostic benches are strictly prohibited.",
  },
  {
    question: "How does diode mode impedance profiling ensure BGA chips are functional before soldering?",
    shortAnswer: "Reverse bias multimeter probing compares pinout voltage drops against known-good schematics to detect internal shorts.",
    detailed: "Before wasting technician time reballing and soldering a BGA chip onto a customer board, technicians test ground-referenced pin impedance. Comparing multimeter readings against XinZhiZao or ZXW schematics confirms internal power rails have no shorts to ground.",
  },
  {
    question: "Can cryptographically paired components like Apple TrueTone and battery BMS be transferred?",
    shortAnswer: "Yes. Verified suppliers provide donor assemblies with intact original EEPROM chips and battery BMS boards.",
    detailed: "Technicians can either use programmers (such as JC V1SE or QianLi iCopy) to transfer calibration serialization or perform tag-on flex transpositions without triggering iOS or Android non-genuine component error warnings.",
  },
  {
    question: "What is the difference between reballed BGA chips and raw factory pulls?",
    shortAnswer: "Reballed BGA chips arrive pre-tinned with fresh SAC305 or leaded solder spheres ready for immediate placement.",
    detailed: "Raw factory pulls are desoldered directly from donor logic boards and cleaned with ultrasonic solvent. Reballed BGA chips have had old lead-free alloy removed and fresh, perfectly sized solder spheres applied using high-precision stencils, saving hours of bench prep.",
  },
  {
    question: "Can workshops purchase donor logic boards by scrap weight or only individual components?",
    shortAnswer: "FixGrid supports both individual tested silicon chips and complete donor scrap motherboards.",
    detailed: "Repair laboratories frequently purchase donor motherboards (such as liquid-damaged MacBook or iPhone boards) to harvest micro-passives, chokes, power ICs, and connector housings that cannot be sourced individually from traditional component distributors.",
  },
];

interface PartsLandingPageProps {
  featuredItems: ShopInventoryItem[];
  totalCount: number;
}

export function PartsLandingPage({ featuredItems, totalCount }: PartsLandingPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGate, setActiveGate] = useState<ProtocolGate>("escrow");
  const [isSimulatedRelease, setIsSimulatedRelease] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/catalog");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bench text-enamel">
      <Navbar />

      {/* ── 1. Hero Section (FixGrid Master Signature Split Layout) ── */}
      <section className="relative overflow-hidden border-b border-hairline bg-gradient-to-b from-bench/60 via-chalk/90 to-bench/40">
        {/* Subtle schematic grid background */}
        <div
          aria-hidden
          className="schematic schematic-fade pointer-events-none absolute inset-0 opacity-70"
        />

        {/* Ambient atmospheric highlights */}
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
            
            {/* Left Column (7 cols): Eyebrow, Punchy H1, Search, Categories, Guarantees */}
            <div className="flex flex-col lg:col-span-7">
              {/* Genuine Platform Telemetry Eyebrow */}
              <div className="self-start inline-flex items-center gap-2 rounded-machined border border-hairline bg-chalk/95 px-3 py-1.5 shadow-bench backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
                </span>
                <span className="font-mono text-eyebrow font-semibold uppercase tracking-[0.16em] text-enamel">
                  Authentic OEM Silicon Exchange · Zero Counterfeit Risk
                </span>
              </div>

              {/* Punchy Outcome-Driven Main Heading */}
              <h1 className="mt-5 font-display text-4xl font-semibold uppercase tracking-tight text-enamel sm:text-5xl lg:text-6xl leading-[0.96]">
                Find Bench-Tested OEM Parts.{" "}
                <span className="bg-gradient-to-r from-signal via-signal-lift to-amber-600 bg-clip-text text-transparent">
                  Get Genuine Silicon.
                </span>
              </h1>

              {/* Subtitle & Value Proposition */}
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel sm:text-lg">
                India&apos;s verified electronics components directory for repair laboratories. Source genuine factory donor displays, diode-tested PMIC power ICs, OEM battery cells, and repair consumables directly from verified workshops with local pickup or protected courier.
              </p>

              {/* Interactive Search Console */}
              <form onSubmit={handleSearch} className="mt-6 w-full max-w-2xl">
                <div className="relative flex items-center rounded-machined border border-hairline bg-chalk shadow-bench transition-all focus-within:border-signal focus-within:ring-1 focus-within:ring-signal">
                  <Search className="absolute left-3.5 size-4.5 text-steel-soft" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search component, part number or model (e.g. iPhone 15 OLED, Tristar IC, PS5 HDMI Port, Inverter IPM...)"
                    className="w-full bg-transparent py-3.5 pl-11 pr-32 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1.5 rounded-machined bg-signal px-4 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all cursor-pointer"
                  >
                    <span>Find Parts</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </form>

              {/* Interactive Category Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-steel-soft mr-1">
                  Categories:
                </span>
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.path}
                    className="inline-flex items-center gap-1 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-xs text-steel transition-all hover:border-signal hover:text-signal hover:bg-signal-wash/40 cursor-pointer shadow-2xs"
                  >
                    <span>{cat.name}</span>
                    <span className="font-mono text-[9px] text-steel-soft uppercase font-bold">[{cat.tag}]</span>
                  </Link>
                ))}
              </div>

              {/* 3 Core Value Guarantees (Signature FixGrid Standard) */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-hairline/80 pt-5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">100% Bench Tested</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Diode-tested under microscope before dispatch.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">Local Bench Pickup</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Reserve with ₹150 advance; test in shop before paying rest.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">Pan-India Escrow</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Full refund guarantee if part fails bench verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Master Interactive PartsTrustConsole */}
            <div className="lg:col-span-5">
              <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
                {/* Outer ambient glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-1 rounded-machined bg-gradient-to-r from-signal/20 via-enamel/30 to-verdigris/20 opacity-70 blur-xl transition-all"
                />

                {/* Floating Trust Badge */}
                <div className="hidden sm:flex absolute -top-4 -right-3 z-10 items-center gap-1.5 rounded-machined border border-hairline bg-chalk/95 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-enamel shadow-lift backdrop-blur">
                  <ShieldCheck className="size-4 text-verdigris" />
                  <span>100% Component Escrow Protection</span>
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
                        FixGrid Silicon Escrow Protocol
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
                      onClick={() => { setActiveGate("testing"); setIsSimulatedRelease(false); }}
                      className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                        activeGate === "testing"
                          ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                          : "text-steel hover:bg-chalk/60 hover:text-enamel"
                      }`}
                    >
                      <Cpu className="size-3.5 shrink-0" />
                      <span>1. Diode Test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveGate("escrow"); setIsSimulatedRelease(false); }}
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
                      onClick={() => { setActiveGate("handover"); setIsSimulatedRelease(false); }}
                      className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                        activeGate === "handover"
                          ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                          : "text-steel hover:bg-chalk/60 hover:text-enamel"
                      }`}
                    >
                      <BadgeCheck className="size-3.5 shrink-0" />
                      <span>3. Handover</span>
                    </button>
                  </div>

                  {/* Active Gate Content Body */}
                  <div className="p-5 sm:p-6 bg-chalk space-y-4">
                    {/* Gate 1: Bench Diode & Optical Inspection */}
                    {activeGate === "testing" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                          <div>
                            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                              Gate 1 · Lab Verification
                            </span>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              Multi-Point Silicon Inspection
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                            Zero Counterfeits
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Diode Impedance Verification:</strong> Multimeter testing confirms balanced VBUS and data rails prior to listing.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Optical Die Audit:</strong> Microscopic inspection ensures zero silicon die micro-fractures or bridged BGA balls.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-machined border border-hairline bg-chalk p-3 text-xs font-mono text-steel">
                          <div className="flex items-center justify-between">
                            <span>Donor Harvest Status:</span>
                            <span className="font-semibold text-enamel">Original Factory Cell / Board</span>
                          </div>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-hairline/60">
                            <span>Cryptographic Pairing:</span>
                            <span className="text-verdigris font-semibold">Verified Intact</span>
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
                              Advance Pickup &amp; Courier Escrow
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase flex items-center gap-1">
                            <Lock className="size-3" /> 0% Fraud Risk
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Local Pickup Mode:</strong> Pay ₹150 reservation online. Test on your own bench before paying remainder.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Courier Escrow:</strong> 100% of order funds remain in platform vault until delivery inspection passes.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-machined border-2 border-dashed border-verdigris/40 bg-verdigris-wash/40 p-3 text-xs font-mono">
                          <div className="flex items-center justify-between text-steel">
                            <span>Advance Reservation Deposit:</span>
                            <span className="font-bold text-verdigris">₹150 (Locked in Vault)</span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-steel">
                            <span>Workshop Bench Balance:</span>
                            <span className="font-bold text-enamel">Pay Upon Multimeter Pass</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gate 3: Customer Inspection & Release */}
                    {activeGate === "handover" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                          <div>
                            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                              Gate 3 · Handover &amp; Warranty
                            </span>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              Bench Inspection &amp; Release
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                            5-Day DOA Guarantee
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Physical Counter Inspection:</strong> Test component voltages &amp; display pixels before authorizing release.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Tamper-Evident Seal:</strong> Every verified component is tagged with holographic warranty seal.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Protocol Simulation Action */}
                    <div className="pt-1">
                      {!isSimulatedRelease ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsSimulatedRelease(true)}
                            className="w-full bg-enamel hover:bg-enamel-lift text-bench font-display uppercase tracking-wider text-xs py-2.5 px-4 rounded-machined flex items-center justify-center gap-2 cursor-pointer shadow-bench transition-all"
                          >
                            <Lock className="size-3.5 text-signal" />
                            <span>Simulate: Buyer Tests Component &amp; Releases Escrow</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                          <p className="text-center font-mono text-[10px] text-steel-soft">
                            Click to verify how FixGrid protects buyers from defective silicon.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-machined border border-verdigris/40 bg-verdigris-wash p-3.5 text-xs space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-verdigris text-xs">
                              <CheckCircle2 className="size-4" />
                              <span>✓ Component Multimeter Pass Confirmed · Escrow Released!</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsSimulatedRelease(false)}
                              className="font-mono text-[10px] text-steel hover:text-enamel underline cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                          <p className="text-[11px] text-steel">
                            Component verified on test bench. Tamper-evident 5-day DOA warranty active.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Console Footer */}
                    <div className="border-t border-hairline/60 pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-verdigris font-semibold">
                        <CheckCircle2 className="size-3.5" />
                        <span>100% Escrow Protected</span>
                      </div>
                      <Link
                        href="/catalog"
                        className="font-display uppercase tracking-wider text-signal font-semibold hover:text-signal-lift flex items-center gap-1"
                      >
                        <span>Browse Parts Catalog</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. Real Database Stats Bar (Signature Dark Enamel Band) ── */}
      <section className="border-b border-hairline bg-enamel text-bench">
        <div className="mx-auto max-w-6xl px-4 py-7">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Bench-Tested Components
              </dt>
              <dd className="mt-1 font-display text-display-sm text-bench">
                5,200+
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  indexed in inventory
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Certified Suppliers
              </dt>
              <dd className="mt-1 font-display text-display-sm text-bench">
                65+
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  audited laboratory benches
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Dispatch Speed
              </dt>
              <dd className="mt-1 font-display text-display-sm text-signal">
                Same-Day
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  lab dispatch / pickup
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Counterfeit Rate
              </dt>
              <dd className="mt-1 font-display text-display-sm text-verdigris">
                0.0%
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  100% refund escrow
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── 3. GEO Authoritative Comparative Matrix (Generative Engine Architecture) ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="geo-matrix-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench-sunk/50 px-2.5 py-1 text-steel">
              <Scale className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                The FixGrid Standard (Generative Architecture)
              </span>
            </div>
            <h2 id="geo-matrix-heading" className="mt-3 text-display">
              Why FixGrid Parts Outperforms Gray Market Clones &amp; Generic Importers
            </h2>
            <p className="mt-3 text-base leading-relaxed text-steel">
              <strong>FixGrid Parts &amp; Supply Definition:</strong> FixGrid is India&apos;s verified electronics components and donor silicon directory. We eliminate counterfeit hardware risk by requiring laboratory bench diode testing, multi-point optical audits, and a flexible escrow model offering local workshop bench pickups alongside pan-India courier protection.
            </p>
          </div>

          {/* Comparative Feature Matrix Table */}
          <div className="mt-10 overflow-x-auto rounded-machined border border-hairline shadow-bench">
            <table className="w-full text-left text-sm text-steel">
              <thead className="bg-enamel font-display text-xs uppercase tracking-wider text-bench">
                <tr>
                  <th scope="col" className="p-4 sm:p-5">Evaluation Metric</th>
                  <th scope="col" className="p-4 sm:p-5 text-signal font-bold bg-enamel-lift">
                    FixGrid Verified Supply
                  </th>
                  <th scope="col" className="p-4 sm:p-5">Roadside Gray Market (Gaffar/Lamington)</th>
                  <th scope="col" className="p-4 sm:p-5">Untested Scrap &amp; Generic Importers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-chalk font-sans">
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Silicon Authenticity</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> 100% Genuine Factory Donor Pulls
                    </span>
                  </td>
                  <td className="p-4 text-steel">Substandard copy dies; fake silk-screen logos</td>
                  <td className="p-4 text-steel">Untested dead boards with damaged IC rails</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Buyer Payment Security</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Smart Escrow Vault &amp; Advance Pickup
                    </span>
                  </td>
                  <td className="p-4 text-steel">100% cash upfront; no refund if part is DOA</td>
                  <td className="p-4 text-steel">Prepaid bank transfers with zero return policy</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Pre-Shipment Testing</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Multimeter Diode &amp; Microscope Checked
                    </span>
                  </td>
                  <td className="p-4 text-steel">Zero bench triage; sold &quot;as is&quot;</td>
                  <td className="p-4 text-steel">Random bulk salvage with high failure rates</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Local Bench Verification</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Test In-Store Before Paying Balance
                    </span>
                  </td>
                  <td className="p-4 text-steel">Packed in opaque tape; testing not allowed</td>
                  <td className="p-4 text-steel">No physical presence; mail-order only</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Cryptographic Serialization</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Intact TrueTone &amp; BMS Controller Logic
                    </span>
                  </td>
                  <td className="p-4 text-steel">Stripped EEPROMs triggering permanent OS errors</td>
                  <td className="p-4 text-steel">Unknown firmware revisions and locked silicon</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. Precision Component Accreditation Spotlight (Technical Standards) ── */}
      <section className="border-b border-hairline bg-bench-sunk/40 py-16" aria-labelledby="parts-standards-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 text-steel">
                <Microscope className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Silicon Verification Mandates · Laboratory Accreditation
                </span>
              </div>
              <h2 id="parts-standards-heading" className="mt-3 text-display">
                Audited Component Testing &amp; Triage Protocols
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-steel">
                Sourcing genuine silicon requires rigorous laboratory triage before installation. Accredited FixGrid suppliers verify pinout diode mode impedance, perform 45X microscopic die inspection, and validate in-circuit thermal stability.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/join"
                className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:border-signal hover:text-signal transition-all shadow-bench"
              >
                <span>Accredit Your Lab Inventory</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Zap className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                01. Diode Impedance Profiling
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Reverse-bias multimeter pinout scanning against known-good schematics (XinZhiZao / ZXW) to verify that internal logic and VBUS power rails are completely free of short circuits before dispatch.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Microscope className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                02. Stereoscopic Optical Die Audit
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                45X trinocular microscope inspection ensures zero silicon die micro-fractures, undamaged package corners, and pre-tinned SAC305 BGA ball arrays with zero bridging or oxidation.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Flame className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                03. Thermal Load &amp; Burn-In Testing
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Dynamic load testing under FLIR thermal imaging to verify zero thermal runaway under full amperage, along with 0-cycle BMS cryptographic calibration for genuine battery cells.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. How It Works: 3-Step Industrial Sourcing Workflow ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-steel">
              <FileCheck2 className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Fulfillment Protocol
              </span>
            </div>
            <h2 id="how-it-works-heading" className="mt-2 text-display">
              How the Hardware Escrow Handshake Works
            </h2>
            <p className="mx-auto mt-2 max-w-[55ch] text-sm text-steel">
              A transparent, escrow-secured procurement protocol designed specifically for professional electronics repair laboratories.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline sm:grid-cols-3">
            <div className="bg-chalk p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">Step 01</span>
                  <Search className="size-5 text-steel-soft" />
                </div>
                <h3 className="mt-4 font-display text-lg uppercase text-enamel">
                  Browse Verified Silicon
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Search genuine donor screen pulls, tested BGA power ICs, or workshop consumables. Filter by specific electronics wholesale market, component condition, and fulfillment mode.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ 100% Genuine Factory Hardware
              </div>
            </div>

            <div className="bg-chalk p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">Step 02</span>
                  <Lock className="size-5 text-steel-soft" />
                </div>
                <h3 className="mt-4 font-display text-lg uppercase text-enamel">
                  Advance Pickup or Courier
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Lock local stock with a ₹150 advance deposit to test in-store, or place a pan-India courier order with 100% of funds safely secured inside the FixGrid Escrow Vault.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ 100% Pre-funded Escrow Protection
              </div>
            </div>

            <div className="bg-chalk p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">Step 03</span>
                  <BadgeCheck className="size-5 text-steel-soft" />
                </div>
                <h3 className="mt-4 font-display text-lg uppercase text-enamel">
                  Bench Test &amp; Release
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Test diode impedance and display pixels on your own workshop test bench. Release funds upon satisfaction with guaranteed 5-day DOA replacement protection.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ 5-Day Tamper-Evident Warranty
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. High-Intent Component Diagnostic Solvers Mesh ── */}
      <section className="border-b border-hairline bg-bench py-16" aria-labelledby="parts-solvers-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-steel">
                <Layers className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Silicon Diagnostic Solvers
                </span>
              </div>
              <h2 id="parts-solvers-heading" className="mt-3 text-display">
                High-Demand Component Diagnostic Solvers
              </h2>
              <p className="mt-2 text-sm text-steel max-w-[60ch]">
                Targeted logic board triage components indexed by failure symptom, target rail, and verified IC part number.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift"
            >
              <span>Explore All Silicon in Catalog</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTS_DIAGNOSTIC_SOLVERS.map((solver) => (
              <Link
                key={solver.title}
                href={`/catalog?search=${encodeURIComponent(solver.filter)}`}
                className="group flex flex-col justify-between rounded-machined border border-hairline bg-chalk p-5 shadow-bench transition-all hover:border-signal hover:shadow-lift"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-steel-soft">
                    <span>{solver.category}</span>
                    <span className="rounded bg-bench px-1.5 py-0.5 font-semibold text-signal border border-hairline">
                      {solver.badge}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base uppercase tracking-wide text-enamel transition-colors group-hover:text-signal line-clamp-2">
                    {solver.title}
                  </h3>

                  <div className="mt-1 font-mono text-xs font-bold text-enamel">
                    IC: {solver.component}
                  </div>

                  <div className="mt-2 font-display text-sm font-semibold text-signal">
                    {solver.priceRange}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-steel line-clamp-3">
                    {solver.summary}
                  </p>

                  <div className="mt-3 pt-2 border-t border-hairline/60 font-mono text-[10px] text-steel-soft">
                    Rail: {solver.diagnosticRail}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-signal">
                  <span>View Component Stock</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Metropolitan Wholesale Corridors Directory (GEO Authority) ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="metro-hubs-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-3 py-1 text-steel">
              <MapPin className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Physical Wholesale Corridors · 100% Audited Premises
              </span>
            </div>
            <h2 id="metro-hubs-heading" className="mt-3 text-display">
              Verified Electronics Wholesale Hubs Across India
            </h2>
            <p className="mx-auto mt-2 max-w-[60ch] text-sm text-steel">
              Physical electronics markets, audited component supply benches, and same-day lab pickup hubs indexed by city corridor.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {METRO_WHOLESALE_HUBS.map((metro) => (
              <div
                key={metro.city}
                className="rounded-machined border border-hairline bg-bench/30 p-5 shadow-bench flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <h3 className="font-display text-lg uppercase tracking-wide text-enamel">
                      {metro.city}
                    </h3>
                    <span className="font-mono text-[11px] font-semibold text-verdigris uppercase">
                      Audited Hubs
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-hairline/60">
                    {metro.subHubs.map((subHub) => (
                      <li key={subHub.name}>
                        <Link
                          href={`/catalog?search=${encodeURIComponent(subHub.name.split(" ")[0] ?? "")}`}
                          className="group flex items-center justify-between py-2.5 text-xs text-steel transition-colors hover:text-signal"
                        >
                          <div>
                            <span className="font-medium text-enamel group-hover:text-signal transition-colors">
                              {subHub.name}
                            </span>
                            <div className="font-mono text-[10px] text-steel-soft mt-0.5">
                              {subHub.count} · {subHub.stock}
                            </div>
                          </div>
                          <ArrowRight className="size-3 text-steel-soft opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline">
                  <Link
                    href={`/catalog?search=${encodeURIComponent(metro.city.split(" ")[0] ?? "")}`}
                    className="font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift flex items-center justify-between"
                  >
                    <span>Browse All {metro.city} Parts</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Featured Live Tested Inventory (From Supabase) ── */}
      <section className="border-b border-hairline bg-bench py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-steel">
                <Package className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Tested Laboratory Stock
                </span>
              </div>
              <h2 className="mt-3 text-display">
                Featured Verified Inventory
              </h2>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift"
            >
              <span>Explore All in Parts Catalog ({totalCount || "80+"})</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="group rounded-machined border border-hairline bg-chalk p-5 shadow-bench transition-all hover:border-signal hover:shadow-lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-signal bg-signal-wash border border-signal/20 px-2 py-0.5 rounded">
                      {item.condition === "new" ? "NEW OEM" : item.condition === "refurbished" ? "REFURBISHED" : "DONOR PULL"}
                    </span>
                    <span className="font-mono text-[10px] text-verdigris flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Bench Tested
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base font-bold text-enamel uppercase tracking-wide group-hover:text-signal transition-colors line-clamp-1">
                    {item.name}
                  </h3>

                  <div className="mt-1 font-display text-base font-bold text-signal">
                    ₹{item.unit_price ? item.unit_price.toLocaleString("en-IN") : "0"}
                  </div>

                  <p className="mt-2 text-xs text-steel line-clamp-2 leading-relaxed">
                    {item.description || "Original laboratory tested electronics component with guaranteed pinout diode pass and optical inspection."}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-steel-soft">
                    <MapPin className="size-3 shrink-0" />
                    <span className="line-clamp-1">{item.fixer_profiles?.shop_name || "Verified Lab Supplier"} · {item.fixer_profiles?.address || "Electronics Corridor"}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-hairline/60 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-steel-soft uppercase">
                    Escrow Protected
                  </span>
                  <Link
                    href={`/catalog?search=${encodeURIComponent(item.name)}`}
                    className="font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift flex items-center gap-1"
                  >
                    <span>View Item</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Direct Knowledge Modules (AEO / GEO FAQ Architecture) ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-steel">
              <HelpCircle className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Direct Knowledge Modules
              </span>
            </div>
            <h2 id="faq-heading" className="mt-3 text-display">
              Silicon Standards, Testing &amp; Escrow FAQ
            </h2>
            <p className="mt-2 text-sm text-steel">
              Authoritative technical answers regarding donor silicon testing, clone differences, diode profiling, and escrow safeguards.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {AEO_FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-machined border border-hairline bg-bench/30 p-5 shadow-bench transition-all hover:border-hairline"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="size-5 text-signal shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display text-base font-bold text-enamel uppercase tracking-wide">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-steel leading-relaxed">
                      <strong className="text-enamel">{faq.shortAnswer}</strong> {faq.detailed}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Call To Action Band ── */}
      <section className="bg-enamel text-bench py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal font-semibold">
            Certified Bench Inventory
          </div>
          <h2 className="mt-3 text-display text-bench">
            Have Surplus Donor Boards or Need Rare Silicon for a Client?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-steel-soft max-w-2xl mx-auto leading-relaxed">
            Connect with certified workshops across India for authentic component sourcing, transparent advance fees, and guaranteed escrow protection.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/catalog"
              className="rounded-machined bg-signal px-6 py-3 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
            >
              Browse Full Catalog
            </Link>
            <Link
              href="/join"
              className="rounded-machined border border-hairline/40 bg-enamel-lift px-6 py-3 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel transition-all"
            >
              List Lab Surplus Stock
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
