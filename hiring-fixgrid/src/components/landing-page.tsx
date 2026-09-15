"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Cpu,
  Flame,
  Smartphone,
  Gamepad2,
  Tv,
  Zap,
  MapPin,
  Building2,
  ChevronRight,
  Lock,
  Users,
  BadgeCheck,
  Search,
  Briefcase,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  Check,
  HelpCircle,
  Clock,
  Compass,
  Scale,
  DollarSign,
  Microscope,
  Phone,
  FileCheck2,
  Laptop,
  Radio,
  Car,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { type ShopJob } from "@/lib/supabase";

type ProtocolGate = "skills" | "escrow" | "gear";

const SPECIALIZATIONS = [
  { name: "Micro-Soldering L3", tag: "L3 CHIP", path: "/jobs?specialization=Micro-Soldering" },
  { name: "Apple Logic Board", tag: "IPHONE/MAC", path: "/jobs?specialization=Apple+Logic+Board" },
  { name: "OLED Refurbishing", tag: "OCA LAB", path: "/jobs?specialization=OLED+Screen" },
  { name: "Inverter AC PCB", tag: "HIGH VOLTAGE", path: "/jobs?specialization=Inverter+AC+PCB" },
  { name: "Gaming Console APU", tag: "HDMI/APU", path: "/jobs?specialization=Gaming+Console" },
  { name: "Drone ESC Repair", tag: "ROBOTICS", path: "/jobs?specialization=Drone+Motor" },
];

const BENCH_DIAGNOSTIC_GUIDES = [
  {
    title: "MacBook Logic Board Power Rail & PMIC Triage",
    category: "Apple Hardware",
    badge: "L3 Micro-Soldering",
    salary: "₹65,000 – ₹95,000 / mo",
    gear: "ZXW / XinZhiZao · JBC C210 · Thermal Cam",
    summary: "PPBUS_G3H rail short isolation, USB-C CD3217 triage, SMC/T2/M-series communication analysis, and capacitor injection testing.",
    filter: "Apple Logic Board",
  },
  {
    title: "iPhone FaceID Dot Projector & EEPROM Salvage",
    category: "Smartphones",
    badge: "Optics & EEPROM",
    salary: "₹50,000 – ₹80,000 / mo",
    gear: "JC V1SE Programmer · 40x Microscope",
    summary: "Prism alignment, dot-projector MOSFET replacement, TrueTone serial transfer, and cryptographic sensor board transposition.",
    filter: "Micro-Soldering",
  },
  {
    title: "PlayStation 5 & Xbox APU Liquid Metal Reballing",
    category: "Gaming Consoles",
    badge: "BGA & Liquid Metal",
    salary: "₹45,000 – ₹75,000 / mo",
    gear: "Infrared Preheater · BGA Stencils",
    summary: "APU oxide cleanup, custom barrier foam sealing, HDMI 2.1 retimer IC swapping, and Southbridge BGA re-balling.",
    filter: "Gaming Console",
  },
  {
    title: "Inverter AC & HVAC Multi-Phase IPM PCB Debugging",
    category: "Heavy Appliances",
    badge: "High Voltage IPM",
    salary: "₹40,000 – ₹68,000 / mo",
    gear: "Differential Probe · IPM Tester",
    summary: "Surge-damaged Intelligent Power Module debugging, DC link capacitor ESR testing, motor controller PWM feedback triage.",
    filter: "Inverter AC PCB",
  },
  {
    title: "Curved OLED Cryogenic Separation & COF Bonding",
    category: "Display Refurbishing",
    badge: "Cleanroom OCA",
    salary: "₹45,000 – ₹70,000 / mo",
    gear: "Liquid Nitrogen Freezer · Laser COF Bonder",
    summary: "Polarizer de-lamination without micro-cracks, ITO laser trace reconstruction, and bubble-free autoclave curing.",
    filter: "OLED Screen",
  },
  {
    title: "Laptop Liquid Immersion & Ultrasonic Rail Recovery",
    category: "Motherboard Labs",
    badge: "Corrosion Triage",
    salary: "₹42,000 – ₹65,000 / mo",
    gear: "Ultrasonic 99% IPA Tank · Preheater",
    summary: "Electrolytic oxidation neutralization, corroded via jumping under stereomicroscope, and 3.3V/5V standby rail restoration.",
    filter: "Micro-Soldering",
  },
  {
    title: "Commercial Drone Brushless Motor & ESC Stator Fix",
    category: "Aviation Robotics",
    badge: "Robotics ESC",
    salary: "₹48,000 – ₹78,000 / mo",
    gear: "Dual Trace Oscilloscope · Stator Rewinder",
    summary: "Phase resistance matching, 4-in-1 ESC MOSFET replacements, gyro sensor calibration, and flight telemetry stress runs.",
    filter: "Drone Motor",
  },
  {
    title: "Automotive ECU & CAN-Bus Logic Board Diagnostics",
    category: "Automotive Electronics",
    badge: "Automotive CAN",
    salary: "₹55,000 – ₹90,000 / mo",
    gear: "CAN Bus Analyzer · Bench Power Supply",
    summary: "Fuel injection driver IC replacement, micro-controller flash dump extraction, and transient voltage suppression triage.",
    filter: "Micro-Soldering",
  },
];

const METRO_CORRIDORS = [
  {
    city: "Delhi NCR",
    subHubs: [
      { name: "Nehru Place Electronics Market", pay: "₹55k–₹90k", count: "28 Labs" },
      { name: "Gaffar Market Karol Bagh", pay: "₹50k–₹85k", count: "20 Labs" },
      { name: "Lajpat Nagar Central", pay: "₹45k–₹70k", count: "12 Labs" },
      { name: "Noida Sector 18 Tech Hub", pay: "₹48k–₹75k", count: "14 Labs" },
      { name: "Gurugram Cyber Park Zone", pay: "₹52k–₹80k", count: "16 Labs" },
    ],
  },
  {
    city: "Mumbai & Thane",
    subHubs: [
      { name: "Lamington Road Hardware Corridor", pay: "₹52k–₹88k", count: "24 Labs" },
      { name: "Grant Road Station District", pay: "₹50k–₹82k", count: "18 Labs" },
      { name: "Kurla West Industrial Cluster", pay: "₹45k–₹72k", count: "15 Labs" },
      { name: "Andheri East MIDC", pay: "₹48k–₹78k", count: "16 Labs" },
      { name: "Vashi Tech Cluster Navi Mumbai", pay: "₹44k–₹70k", count: "11 Labs" },
    ],
  },
  {
    city: "Bengaluru",
    subHubs: [
      { name: "SP Road Micro-Electronics Hub", pay: "₹55k–₹92k", count: "26 Labs" },
      { name: "Koramangala Tech Corridor", pay: "₹52k–₹85k", count: "18 Labs" },
      { name: "Jayanagar Hardware Sector", pay: "₹46k–₹75k", count: "12 Labs" },
      { name: "Whitefield ITPL District", pay: "₹50k–₹80k", count: "14 Labs" },
      { name: "Indiranagar Central", pay: "₹48k–₹78k", count: "10 Labs" },
    ],
  },
  {
    city: "Hyderabad & Secunderabad",
    subHubs: [
      { name: "CTC Parklane Electronics Complex", pay: "₹48k–₹78k", count: "18 Labs" },
      { name: "Gujarati Galli Koti Market", pay: "₹45k–₹72k", count: "14 Labs" },
      { name: "Ameerpet Tech Cluster", pay: "₹44k–₹70k", count: "12 Labs" },
      { name: "Madhapur Hitec City Hub", pay: "₹50k–₹80k", count: "10 Labs" },
    ],
  },
  {
    city: "Chennai",
    subHubs: [
      { name: "Ritchie Street Electronics District", pay: "₹45k–₹75k", count: "20 Labs" },
      { name: "Mount Road Service Center Zone", pay: "₹42k–₹70k", count: "12 Labs" },
      { name: "T Nagar Commercial Hub", pay: "₹40k–₹68k", count: "10 Labs" },
      { name: "Adyar Electronics Benches", pay: "₹42k–₹65k", count: "8 Labs" },
    ],
  },
  {
    city: "Kolkata",
    subHubs: [
      { name: "Chandni Chowk Electronics Hub", pay: "₹42k–₹70k", count: "16 Labs" },
      { name: "Princep Street Hardware Row", pay: "₹38k–₹65k", count: "12 Labs" },
      { name: "Salt Lake Sector V Tech Labs", pay: "₹45k–₹72k", count: "10 Labs" },
    ],
  },
];

const AEO_FAQS = [
  {
    question: "What is FixGrid Careers and how does the Bench Protocol operate?",
    shortAnswer: "FixGrid Careers is India's verified hardware artisan and electronics repair technician exchange.",
    detailed: "Unlike generic job portals like Naukri or Indeed, FixGrid connects certified micro-soldering, motherboard diagnostic, and precision hardware artisans directly with physically audited repair laboratories. Technicians retain 100% of their earnings with zero agency deductions, and initial 3-day bench trials are backed by automated platform escrow.",
  },
  {
    question: "How does the 3-day bench evaluation escrow guarantee protect technicians?",
    shortAnswer: "Wages for the 3-day trial are deposited into FixGrid Escrow before the artisan ever sets foot in the workshop.",
    detailed: "Upon completion of the 3-day bench evaluation, funds are automatically disbursed to the technician's bank account. This eliminates unpaid 'trial days', wage withholding, and unauthorized payroll cuts common in the informal electronics repair sector.",
  },
  {
    question: "What physical equipment is mandated for FixGrid L3 lab accreditation?",
    shortAnswer: "Workshops must provide certified stereomicroscopes, programmable hot-air stations, and ESD matting.",
    detailed: "FixGrid audits require: a 7X-45X stereomicroscope with LED ring light, calibrated soldering station (JBC C210/C245 or Hakko), programmable hot-air rework station (Quick 861DW or equivalent), ESD grounded matting, and digital schematic software licenses (ZXW Dongle or XinZhiZao).",
  },
  {
    question: "Why does FixGrid charge zero recruiter commission to technicians?",
    shortAnswer: "FixGrid replaces exploitative staffing brokers with a direct cryptographic and equipment verification protocol.",
    detailed: "Traditional manpower agencies take 15% to 25% of technician wages every month. FixGrid eliminates middlemen entirely, ensuring artisans receive 100% of their negotiated bench compensation.",
  },
  {
    question: "What hardware skills are required for L1, L2, and L3 technician tiers?",
    shortAnswer: "Tiers span from modular assembly to precision micro-soldering and trace reconstruction.",
    detailed: "L1 technicians handle modular display swaps, battery replacements, and camera flex transpositions. L2 covers charging port reconstruction, FPC connector swaps, and diode line testing. L3 requires BGA reballing, PMIC diagnosis, trace jumping under 40x magnification, NAND expansions, and thermal rail triage.",
  },
  {
    question: "How are workshop owners and repair laboratories audited before posting openings?",
    shortAnswer: "Workshops undergo on-site physical inspection, GSTIN verification, and bench tool auditing.",
    detailed: "FixGrid field auditors verify physical lab premises, workbench ergonomics, test instrument calibration, commercial registration, and safety equipment. This guarantees artisans join genuine engineering operations, not informal makeshift stalls.",
  },
  {
    question: "What happens if a workshop attempts to renegotiate compensation after an artisan arrives?",
    shortAnswer: "The agreed contract wage is digitally locked in FixGrid Escrow and enforceable by platform arbitration.",
    detailed: "Because the 3-day trial wage is pre-funded into escrow, workshops cannot unilaterally reduce agreed pay rates. Any violation triggers immediate account suspension and release of the escrowed funds to the artisan.",
  },
  {
    question: "Can technicians from outside metro centers apply for relocation bench seats?",
    shortAnswer: "Yes. Many verified workshops offer relocation allowances, bench lodging assistance, and travel guarantees.",
    detailed: "Workshops across Nehru Place, Lamington Road, and SP Road actively recruit skilled micro-soldering talent nationwide. Openings requiring relocation feature clear accommodation badges and pre-funded travel trial stipends.",
  },
];

interface HiringLandingPageProps {
  featuredJobs: ShopJob[];
  totalCount: number;
}

export function HiringLandingPage({ featuredJobs, totalCount }: HiringLandingPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGate, setActiveGate] = useState<ProtocolGate>("escrow");
  const [isSimulatedRelease, setIsSimulatedRelease] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/jobs");
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
                  Accredited Bench Network · 0% Recruiter Commission
                </span>
              </div>

              {/* Punchy Outcome-Driven Main Heading */}
              <h1 className="mt-5 font-display text-4xl font-semibold uppercase tracking-tight text-enamel sm:text-5xl lg:text-6xl leading-[0.96]">
                Find Verified Repair Workshops.{" "}
                <span className="bg-gradient-to-r from-signal via-signal-lift to-amber-600 bg-clip-text text-transparent">
                  Get Hired With Escrow.
                </span>
              </h1>

              {/* Subtitle & Value Proposition */}
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel sm:text-lg">
                Connect with India&apos;s verified micro-soldering laboratories and electronics workshops.
                Direct bench placements, guaranteed 3-day trial wage escrow, and zero recruiter commission across Delhi NCR, Mumbai, and Bengaluru.
              </p>

              {/* Interactive Search Console */}
              <form onSubmit={handleSearch} className="mt-6 w-full max-w-2xl">
                <div className="relative flex items-center rounded-machined border border-hairline bg-chalk shadow-bench transition-all focus-within:border-signal focus-within:ring-1 focus-within:ring-signal">
                  <Search className="absolute left-3.5 size-4.5 text-steel-soft" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search precision disciplines (e.g. L3 Micro-Soldering, Apple Logic Board, OLED, PS5 APU...)"
                    className="w-full bg-transparent py-3.5 pl-11 pr-32 text-sm text-enamel placeholder:text-steel-soft focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1.5 rounded-machined bg-signal px-4 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all cursor-pointer"
                  >
                    <span>Find Openings</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </form>

              {/* Interactive Category Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-steel-soft mr-1">
                  Disciplines:
                </span>
                {SPECIALIZATIONS.map((spec) => (
                  <Link
                    key={spec.name}
                    href={spec.path}
                    className="inline-flex items-center gap-1 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-xs text-steel transition-all hover:border-signal hover:text-signal hover:bg-signal-wash/40 cursor-pointer shadow-2xs"
                  >
                    <span>{spec.name}</span>
                    <span className="font-mono text-[9px] text-steel-soft uppercase font-bold">[{spec.tag}]</span>
                  </Link>
                ))}
              </div>

              {/* 3 Core Value Guarantees (Signature FixGrid Standard) */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-hairline/80 pt-5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">100% Wage Escrow</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      3-day trial pay locked in platform vault before you begin.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">₹0 Recruiter Cut</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Technicians keep 100% of their earnings. Zero middlemen.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">Audited Lab Gear</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Workstations audited for stereomicroscope, rework &amp; ESD.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Master Interactive HiringTrustConsole */}
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
                  <span>100% Wage Escrow Guarantee</span>
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
                        FixGrid Artisan Bench Protocol
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
                      onClick={() => { setActiveGate("skills"); setIsSimulatedRelease(false); }}
                      className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                        activeGate === "skills"
                          ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                          : "text-steel hover:bg-chalk/60 hover:text-enamel"
                      }`}
                    >
                      <Cpu className="size-3.5 shrink-0" />
                      <span>1. Skill Tier</span>
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
                      <span>2. Wage Escrow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveGate("gear"); setIsSimulatedRelease(false); }}
                      className={`flex items-center justify-center gap-1.5 py-3 px-2 transition-all cursor-pointer ${
                        activeGate === "gear"
                          ? "border-b-2 border-signal bg-chalk font-semibold text-signal shadow-inner"
                          : "text-steel hover:bg-chalk/60 hover:text-enamel"
                      }`}
                    >
                      <BadgeCheck className="size-3.5 shrink-0" />
                      <span>3. Lab Station</span>
                    </button>
                  </div>

                  {/* Active Gate Content Body */}
                  <div className="p-5 sm:p-6 bg-chalk space-y-4">
                    {/* Gate 1: Skill Tier & Scope */}
                    {activeGate === "skills" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                          <div>
                            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                              Gate 1 · Skill Accreditation
                            </span>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              L3 Chip-Level Micro-Soldering
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                            ₹55,000 – ₹85,000 / mo
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">BGA &amp; PMIC Reballing:</strong> Direct circuit tracing, jumper wire bridges under 40x magnification, shorted rail diagnosis.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Mandatory Tooling:</strong> 7X-45X stereomicroscope, JBC C210 micro-iron, Quick 861DW hot air, and XinZhiZao schematics.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-machined border border-hairline bg-chalk p-3 text-xs font-mono text-steel">
                          <div className="flex items-center justify-between">
                            <span>Evaluation Contract Type:</span>
                            <span className="font-semibold text-enamel">3-Day Hands-on Bench Trial</span>
                          </div>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-hairline/60">
                            <span>Recruiter Cut:</span>
                            <span className="text-verdigris font-semibold">₹0.00 (Zero Commission)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gate 2: Smart Wage Escrow */}
                    {activeGate === "escrow" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                          <div>
                            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                              Gate 2 · Wage Protection
                            </span>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              3-Day Trial Escrow Vault
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase flex items-center gap-1">
                            <Lock className="size-3" /> 100% Protected
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Locked Workshop Deposit:</strong> The workshop deposits ₹7,500 into platform escrow before your trial begins.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Guaranteed Payout:</strong> Once the 3-day trial is completed, funds disburse directly to your bank account.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-machined border-2 border-dashed border-verdigris/40 bg-verdigris-wash/40 p-3 text-xs font-mono">
                          <div className="flex items-center justify-between text-steel">
                            <span>Evaluation Wage Deposit:</span>
                            <span className="font-bold text-verdigris">₹7,500 (Locked in Vault)</span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-steel">
                            <span>Artisan Take-Home:</span>
                            <span className="font-bold text-enamel">100% (₹0 Agency Deduction)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gate 3: Workshop Station Gear */}
                    {activeGate === "gear" && (
                      <div className="space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-hairline/70 pb-2">
                          <div>
                            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel font-semibold">
                              Gate 3 · Station Audit
                            </span>
                            <h3 className="font-display text-sm font-bold uppercase text-enamel">
                              Audited Bench Workstation
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-verdigris bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 rounded font-semibold uppercase">
                            Inspected &amp; Certified
                          </span>
                        </div>

                        <div className="rounded-machined border border-hairline bg-bench/40 p-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">Optical Alignment:</strong> 7X-45X stereomicroscope with ring light &amp; 4K HDMI simul-focus sensor.
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                            <p className="text-steel leading-relaxed">
                              <strong className="text-enamel">ESD Grounding:</strong> Static dissipative bench mats grounded to mains earth with wrist straps.
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
                            <span>Simulate: Technician Completes Bench Trial &amp; Releases Escrow</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                          <p className="text-center font-mono text-[10px] text-steel-soft">
                            Click to verify how FixGrid guarantees zero unpaid trial work.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-machined border border-verdigris/40 bg-verdigris-wash p-3.5 text-xs space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-verdigris text-xs">
                              <CheckCircle2 className="size-4" />
                              <span>✓ ₹7,500 Disbursed to Technician · Zero Commission Taken!</span>
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
                            Workshop evaluation completed. Platform escrow automatically disbursed to the artisan&apos;s bank account.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Console Footer */}
                    <div className="border-t border-hairline/60 pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-verdigris font-semibold">
                        <CheckCircle2 className="size-3.5" />
                        <span>100% Escrow Guaranteed</span>
                      </div>
                      <Link
                        href="/jobs"
                        className="font-display uppercase tracking-wider text-signal font-semibold hover:text-signal-lift flex items-center gap-1"
                      >
                        <span>Browse Directory</span>
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
                Accredited Artisans
              </dt>
              <dd className="mt-1 font-display text-display-sm text-bench">
                480+
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  active bench specialists
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Audited Workshops
              </dt>
              <dd className="mt-1 font-display text-display-sm text-bench">
                140+
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  physically inspected labs
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Artisan Compensation
              </dt>
              <dd className="mt-1 font-display text-display-sm text-signal">
                ₹55k–₹85k
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  avg monthly pay
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                Recruiter Commission
              </dt>
              <dd className="mt-1 font-display text-display-sm text-verdigris">
                ₹0.00
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                  zero middlemen cuts
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
              Why FixGrid Careers Eliminates Unorganized Hiring &amp; Agency Brokers
            </h2>
            <p className="mt-3 text-base leading-relaxed text-steel">
              <strong>FixGrid Careers Definition:</strong> FixGrid is India&apos;s verified electronics repair bench exchange. We eliminate technician exploitation and recruitment fraud by coupling workshop physical equipment vetting with guaranteed 3-day evaluation escrow, verified skill triage, and a 100% zero-broker framework where hardware artisans take home their full negotiated compensation.
            </p>
          </div>

          {/* Comparative Feature Matrix Table */}
          <div className="mt-10 overflow-x-auto rounded-machined border border-hairline shadow-bench">
            <table className="w-full text-left text-sm text-steel">
              <thead className="bg-enamel font-display text-xs uppercase tracking-wider text-bench">
                <tr>
                  <th scope="col" className="p-4 sm:p-5">Evaluation Metric</th>
                  <th scope="col" className="p-4 sm:p-5 text-signal font-bold bg-enamel-lift">
                    FixGrid Bench Network
                  </th>
                  <th scope="col" className="p-4 sm:p-5">Unorganized Walk-in Hiring</th>
                  <th scope="col" className="p-4 sm:p-5">Generic Job Boards (Naukri/Indeed)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-chalk font-sans">
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Trial Wage Protection</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> 100% Smart Escrow Vault Deposit
                    </span>
                  </td>
                  <td className="p-4 text-steel">Unpaid &quot;test days&quot;; zero compensation if rejected</td>
                  <td className="p-4 text-steel">Zero wage guarantee or escrow protection</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Staffing Broker Cuts</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> ₹0.00 Commission (100% to Artisan)
                    </span>
                  </td>
                  <td className="p-4 text-steel">15%–25% subtracted by informal brokers</td>
                  <td className="p-4 text-steel">High employer listing fees with untargeted leads</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Lab Equipment Verification</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Audited Stereomicroscope &amp; ESD Grounding
                    </span>
                  </td>
                  <td className="p-4 text-steel">Unverified roadside stalls; missing safety gear</td>
                  <td className="p-4 text-steel">Self-reported claims with zero physical audits</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Hardware Skill Triage</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Standardized L1–L3 Micro-Soldering Tiers
                    </span>
                  </td>
                  <td className="p-4 text-steel">Vague verbal negotiations; mismatched job roles</td>
                  <td className="p-4 text-steel">Keyword-stuffed resumes without hardware triage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. Precision Bench Accreditation Spotlight (Technical Standards) ── */}
      <section className="border-b border-hairline bg-bench-sunk/40 py-16" aria-labelledby="bench-standards-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 text-steel">
                <Microscope className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Bench Quality Mandates · Laboratory Accreditation
                </span>
              </div>
              <h2 id="bench-standards-heading" className="mt-3 text-display">
                Audited Workstation Gear &amp; Safety Standards
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-steel">
                Precision micro-soldering requires more than a standard soldering pen. Verified FixGrid laboratories must provide certified stereoscopic inspection microscopes, programmable hot-air rework, and static-dissipative workstations.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/join"
                className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:border-signal hover:text-signal transition-all shadow-bench"
              >
                <span>Accredit Your Workshop Bench</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Microscope className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                01. Stereoscopic Optical Triage
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Workshops must furnish a 7X–45X trinocular zoom microscope with LED ring light and 4K HDMI simul-focus camera for live inspection of 01005 passives and 0.35mm pitch BGA ball matrices.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Flame className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                02. Calibrated Thermal &amp; Soldering Rig
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Stations mandate JBC C210/C245 micro-irons, Quick 861DW programmable airflow stations, and infrared preheating plates to prevent multi-layer PCB thermal shock and pad peeling.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                03. Anti-Static ESD &amp; Schematic Licensing
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                ESD grounded matting linked to mains earth, wrist strap grounding jacks, and valid digital schematic licenses (ZXW Dongle, XinZhiZao) are verified during on-site lab audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. How It Works: 3-Step Industrial Bench Workflow ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-steel">
              <FileCheck2 className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Placement Architecture
              </span>
            </div>
            <h2 id="how-it-works-heading" className="mt-2 text-display">
              How the Bench Evaluation Handshake Works
            </h2>
            <p className="mx-auto mt-2 max-w-[55ch] text-sm text-steel">
              A transparent, escrow-secured placement protocol that safeguards both artisans and laboratory owners.
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
                  Browse Audited Benches
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Filter verified workshop openings by micro-soldering tier, hardware discipline, tooling provided, and location corridor. Direct WhatsApp or platform application with zero middlemen.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ Audited Tooling &amp; Pay Ranges
              </div>
            </div>

            <div className="bg-chalk p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">Step 02</span>
                  <Lock className="size-5 text-steel-soft" />
                </div>
                <h3 className="mt-4 font-display text-lg uppercase text-enamel">
                  3-Day Escrow Handshake
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Before you travel to the lab, the workshop owner locks the 3-day evaluation wages in FixGrid Escrow. You arrive with guaranteed compensation secured in the vault.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ 100% Pre-funded Wage Vault
              </div>
            </div>

            <div className="bg-chalk p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal uppercase tracking-wider">Step 03</span>
                  <BadgeCheck className="size-5 text-steel-soft" />
                </div>
                <h3 className="mt-4 font-display text-lg uppercase text-enamel">
                  Trial Pass &amp; Direct Contract
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  Upon trial completion, trial pay dispatches to your bank account. Transition to full-time bench placement with zero ongoing recruiter markups or commission clawbacks.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-hairline/60 font-mono text-[11px] text-verdigris font-semibold">
                ✓ Immediate Bank Disbursement
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. High-Intent Diagnostic & Hardware Triage Solvers Mesh ── */}
      <section className="border-b border-hairline bg-bench py-16" aria-labelledby="bench-disciplines-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-steel">
                <Layers className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Precision Hardware Disciplines
                </span>
              </div>
              <h2 id="bench-disciplines-heading" className="mt-3 text-display">
                High-Yield Precision Bench Disciplines
              </h2>
              <p className="mt-2 text-sm text-steel max-w-[60ch]">
                Explore specialized electronics triage fields, mandatory instrumentation, and standardized monthly compensation ranges.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift"
            >
              <span>Explore All Disciplines in Portal</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENCH_DIAGNOSTIC_GUIDES.map((guide) => (
              <Link
                key={guide.title}
                href={`/jobs?search=${encodeURIComponent(guide.filter)}`}
                className="group flex flex-col justify-between rounded-machined border border-hairline bg-chalk p-5 shadow-bench transition-all hover:border-signal hover:shadow-lift"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-steel-soft">
                    <span>{guide.category}</span>
                    <span className="rounded bg-bench px-1.5 py-0.5 font-semibold text-signal border border-hairline">
                      {guide.badge}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base uppercase tracking-wide text-enamel transition-colors group-hover:text-signal line-clamp-2">
                    {guide.title}
                  </h3>

                  <div className="mt-2 font-display text-sm font-semibold text-signal">
                    {guide.salary}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-steel line-clamp-3">
                    {guide.summary}
                  </p>

                  <div className="mt-3 pt-2 border-t border-hairline/60 font-mono text-[10px] text-steel-soft">
                    Mandatory: {guide.gear}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-signal">
                  <span>View Openings</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Metropolitan City Hubs & Repair Corridors Directory (GEO Authority) ── */}
      <section className="border-b border-hairline bg-chalk py-16" aria-labelledby="metro-hubs-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-3 py-1 text-steel">
              <MapPin className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Physical Workshop Density · 100% Audited Premises
              </span>
            </div>
            <h2 id="metro-hubs-heading" className="mt-3 text-display">
              Explore Bench Seats Across Indian Repair Corridors
            </h2>
            <p className="mx-auto mt-2 max-w-[60ch] text-sm text-steel">
              Verified laboratories, component markets, and active technician benches indexed by metropolitan district.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {METRO_CORRIDORS.map((metro) => (
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
                      Audited Corridors
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-hairline/60">
                    {metro.subHubs.map((subHub) => (
                      <li key={subHub.name}>
                        <Link
                          href={`/jobs?search=${encodeURIComponent(subHub.name.split(" ")[0] ?? "")}`}
                          className="group flex items-center justify-between py-2 text-xs text-steel transition-colors hover:text-signal"
                        >
                          <div>
                            <span className="font-medium text-enamel group-hover:text-signal transition-colors">
                              {subHub.name}
                            </span>
                            <div className="font-mono text-[10px] text-steel-soft">
                              Avg: {subHub.pay} · {subHub.count}
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
                    href={`/jobs?search=${encodeURIComponent(metro.city.split(" ")[0] ?? "")}`}
                    className="font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift flex items-center justify-between"
                  >
                    <span>Browse All {metro.city} Openings</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Featured Live Bench Openings (From Database) ── */}
      <section className="border-b border-hairline bg-bench py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-2.5 py-1 text-steel">
                <Briefcase className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Live Audited Bench Seats
                </span>
              </div>
              <h2 className="mt-3 text-display">
                Active Hardware Openings
              </h2>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift"
            >
              <span>Explore All in Career Portal ({totalCount || "40+"})</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="group rounded-machined border border-hairline bg-chalk p-5 shadow-bench transition-all hover:border-signal hover:shadow-lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-signal bg-signal-wash border border-signal/20 px-2 py-0.5 rounded">
                      {job.experience_level || "EXPERIENCED"}
                    </span>
                    <span className="font-mono text-[10px] text-verdigris flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Verified Lab
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base font-bold text-enamel uppercase tracking-wide group-hover:text-signal transition-colors line-clamp-1">
                    {job.title}
                  </h3>

                  <div className="mt-1 font-display text-sm font-semibold text-signal">
                    {job.salary_min && job.salary_max
                      ? `₹${job.salary_min.toLocaleString("en-IN")} – ₹${job.salary_max.toLocaleString("en-IN")} / ${job.salary_period || "mo"}`
                      : job.salary_min
                      ? `From ₹${job.salary_min.toLocaleString("en-IN")} / ${job.salary_period || "mo"}`
                      : "Competitive Bench Compensation"}
                  </div>

                  <p className="mt-2 text-xs text-steel line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-steel-soft">
                    <MapPin className="size-3 shrink-0" />
                    <span className="line-clamp-1">{job.fixer_profiles?.shop_name || "Audited Electronics Lab"} · {job.fixer_profiles?.address || "Verified Location"}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-hairline/60 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-steel-soft uppercase">
                    Escrow Guaranteed
                  </span>
                  <Link
                    href={`/apply/${job.id}`}
                    className="font-display text-xs font-semibold uppercase tracking-wider text-signal hover:text-signal-lift flex items-center gap-1"
                  >
                    <span>View Opening</span>
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
                Direct Knowledge Modules · Answer Engine Optimization
              </span>
            </div>
            <h2 id="faq-heading" className="mt-3 text-display">
              Bench Protocol Specifications &amp; FAQ
            </h2>
            <p className="mt-2 text-sm text-steel">
              Authoritative technical answers regarding bench accreditation, wage escrow, and technician protections.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {AEO_FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-machined border border-hairline bg-bench/30 p-5 shadow-bench transition-all hover:border-signal hover:bg-chalk"
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
            Accredited Workshop Network
          </div>
          <h2 className="mt-3 text-display text-bench">
            Ready to Upgrade Your Bench Seat or Accredit Your Laboratory?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-steel-soft max-w-2xl mx-auto leading-relaxed">
            Join audited micro-soldering laboratories and certified hardware artisans on India&apos;s premier repair exchange.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/jobs"
              className="rounded-machined bg-signal px-6 py-3 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
            >
              Browse All Openings
            </Link>
            <Link
              href="/join"
              className="rounded-machined border border-hairline/40 bg-enamel-lift px-6 py-3 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel transition-all"
            >
              Accredit Your Workshop
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
