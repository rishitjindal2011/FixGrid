import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  HelpCircle,
  Layers,
  Leaf,
  MapPin,
  Microscope,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

import { DiagnosticFinder } from "@/components/home/diagnostic-finder";
import { FaqSection } from "@/components/home/faq-section";
import { HeroTrustConsole } from "@/components/home/hero-trust-console";
import { ResultCard } from "@/components/search/result-card";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HOME_FAQS } from "@/lib/home/faq-data";
import { getShopStatus } from "@/lib/hours";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";
import {
  getCategories,
  getDirectoryStats,
  getFeaturedFixers,
  toHoursInput,
} from "@/lib/queries/search";
import {
  buildBreadcrumbs,
  buildFaqPage,
  buildService,
  type Thing,
  type WithContext,
} from "@/lib/seo/jsonld";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TAGLINE,
} from "@/lib/site";

export const revalidate = 900;

export const metadata: Metadata = {
  title: {
    absolute: `FixGrid — India's Verified Repair Network & Diagnostic Directory`,
  },
  description:
    "India's verified local electronics and appliance repair directory. Precision bench diagnostics, 100% smart escrow payment protection, and verified warranties across Delhi NCR, Mumbai, Bengaluru, Pune, Hyderabad, and Chennai.",
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      "en-IN": absoluteUrl("/"),
      "hi-IN": absoluteUrl("/hi"),
      "bn-IN": absoluteUrl("/bn"),
      "mr-IN": absoluteUrl("/mr"),
      "te-IN": absoluteUrl("/te"),
      "ta-IN": absoluteUrl("/ta"),
      "kn-IN": absoluteUrl("/kn"),
      "x-default": absoluteUrl("/"),
    },
  },
  openGraph: {
    title: `FixGrid — India's Verified Repair Network & Diagnostic Directory`,
    description:
      "Find verified local electronics and appliance repair shops in India. Component-level hardware testing, smart escrow protection, and platform-backed warranties.",
    type: "website",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "en_IN",
    alternateLocale: ["hi_IN", "bn_IN", "mr_IN", "te_IN", "ta_IN", "kn_IN"],
  },
  twitter: {
    card: "summary_large_image",
    title: `FixGrid — India's Verified Repair Network & Diagnostic Directory`,
    description:
      "Find verified local electronics and appliance repair shops in India. Component-level hardware testing, smart escrow protection, and platform-backed warranties.",
  },
  keywords: [
    ...SITE_KEYWORDS,
    "component level diagnostics",
    "smart escrow repair India",
    "laptop motherboard repair near me",
    "macbook screen repair Delhi Bangalore Mumbai",
    "inverter AC PCB repair",
    "verified electronics technician India",
    "right to repair India directory",
  ],
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
    "geo.position": "20.5937;78.9629",
    ICBM: "20.5937, 78.9629",
  },
};

const METRO_HUBS = [
  {
    city: "Delhi NCR",
    hubs: [
      { name: "Laptop & MacBooks", path: "/repair/laptops-delhi" },
      { name: "Smartphone Repair", path: "/repair/phones-delhi" },
      { name: "Smart TV & Display", path: "/repair/televisions-delhi" },
      { name: "Home Appliances", path: "/repair/appliances-delhi" },
      { name: "Audio Equipment", path: "/repair/audio-equipment-delhi" },
      { name: "Desktop PCs", path: "/repair/desktops-delhi" },
    ],
  },
  {
    city: "Bengaluru",
    hubs: [
      { name: "Precision Laptop Care", path: "/repair/laptops-bengaluru" },
      { name: "Smartphone Repair", path: "/repair/phones-bengaluru" },
      { name: "Audio & Hi-Fi", path: "/repair/audio-equipment-bengaluru" },
      { name: "Desktop Workstations", path: "/repair/desktops-bengaluru" },
      { name: "Home Appliances", path: "/repair/appliances-bengaluru" },
      { name: "Gaming Consoles", path: "/repair/consoles-bengaluru" },
    ],
  },
  {
    city: "Mumbai & Thane",
    hubs: [
      { name: "Laptop Motherboards", path: "/repair/laptops-mumbai" },
      { name: "Phone Screen & Glass", path: "/repair/phones-mumbai" },
      { name: "Home Appliances", path: "/repair/appliances-mumbai" },
      { name: "Gaming Consoles", path: "/repair/consoles-mumbai" },
      { name: "Camera & Optics", path: "/repair/cameras-mumbai" },
      { name: "TV & Display", path: "/repair/televisions-mumbai" },
    ],
  },
  {
    city: "Pune",
    hubs: [
      { name: "Laptop & Ultrabooks", path: "/repair/laptops-pune" },
      { name: "Smartphone Diagnostics", path: "/repair/phones-pune" },
      { name: "Home Appliances", path: "/repair/appliances-pune" },
      { name: "Bicycles & E-Bikes", path: "/repair/bicycles-pune" },
    ],
  },
  {
    city: "Hyderabad",
    hubs: [
      { name: "Laptop Chip-Level", path: "/repair/laptops-hyderabad" },
      { name: "Mobile Screen Replacement", path: "/repair/phones-hyderabad" },
      { name: "Home Appliances", path: "/repair/appliances-hyderabad" },
      { name: "TV & Display", path: "/repair/televisions-hyderabad" },
      { name: "Desktop Systems", path: "/repair/desktops-hyderabad" },
    ],
  },
  {
    city: "Chennai",
    hubs: [
      { name: "Laptop & Display Labs", path: "/repair/laptops-chennai" },
      { name: "Phone Motherboard Care", path: "/repair/phones-chennai" },
      { name: "Home Appliances", path: "/repair/appliances-chennai" },
      { name: "Camera & Optics", path: "/repair/cameras-chennai" },
    ],
  },
];

const DIAGNOSTIC_PROBLEMS = [
  {
    title: "MacBook Screen Delamination & Flexgate",
    slug: "/repair/macbook-screen-repair",
    category: "Laptops",
    badge: "Display IC",
    summary: "Retina panel backlight repair, T-CON micro-soldering, and ribbon cable rejuvenation without replacing entire assemblies.",
  },
  {
    title: "iPhone Battery Degradation & Swelling",
    slug: "/repair/iphone-battery-replacement",
    category: "Smartphones",
    badge: "Power Management",
    summary: "OEM cycle calibration, gas-leak inspection, and genuine cell swaps with zero battery warning health errors.",
  },
  {
    title: "PlayStation 5 & Xbox HDMI WLOD Port Fix",
    slug: "/repair/playstation-hdmi-repair",
    category: "Gaming Consoles",
    badge: "Micro-Soldering",
    summary: "Damaged trace jumping, HDMI retimer IC replacement, and White Light of Death hot-air diagnostic triage.",
  },
  {
    title: "Laptop Liquid Spill & Corrosion Electrolysis",
    slug: "/repair/laptop-liquid-damage",
    category: "Laptops",
    badge: "Ultrasonic Cleaning",
    summary: "Ultrasonic 99% IPA immersion, schematic rail tracing, and MLCC capacitor short elimination under microscope.",
  },
  {
    title: "Inverter AC PCB Motherboard Failure",
    slug: "/repair/inverter-pcb-repair",
    category: "Appliances",
    badge: "High-Voltage IPM",
    summary: "Surge-damaged Intelligent Power Module (IPM) debugging, DC link capacitor testing, and sensor loop verification.",
  },
  {
    title: "Refrigerator Compressor & PTC Relay Triage",
    slug: "/repair/refrigerator-compressor-repair",
    category: "HVAC & Coolers",
    badge: "Motor Diagnostics",
    summary: "Thermal overload relay replacement, winding ohm resistance measurement, and capillary line freeze recovery.",
  },
  {
    title: "Drone Brushless Motor & ESC Stator Fix",
    slug: "/repair/drone-motor-replacement",
    category: "Robotics",
    badge: "Aviation Sensors",
    summary: "Burnt copper winding rewinds, Electronic Speed Controller phase balancing, and gyro sensor calibration.",
  },
  {
    title: "Mechanical Keyboard Solder Pad & Switch Repair",
    slug: "/repair/mechanical-keyboard-switch-replacement",
    category: "Peripherals",
    badge: "Trace Routing",
    summary: "Hot-swap socket lift restoration, jumper wire trace bridging, and diode debouncing for chatter-free typing.",
  },
];

export default async function HomePage() {
  const [categories, featured, stats, recentBlogs, t, tc] = await Promise.all([
    getCategories(),
    getFeaturedFixers(6),
    getDirectoryStats(),
    getAllPublishedBlogPosts().then((posts) => posts.slice(0, 4)),
    getTranslations("home"),
    getTranslations("common"),
  ]);

  // Generate structured JSON-LD schemas for search engines
  const schemas: WithContext<Thing>[] = [
    buildService({
      name: "FixGrid Verified Electronics & Appliance Repair Network India",
      description:
        "India-wide verified local repair directory offering component-level circuit diagnostics, smart escrow payment protection, and platform warranties across smartphones, laptops, appliances, and gaming gear.",
      url: absoluteUrl("/"),
      areaServed: "India",
    }),
  ];

  const faqSchema = buildFaqPage(
    HOME_FAQS.map((faq) => ({
      question: faq.question,
      answer: `${faq.shortAnswer} ${faq.detailedPoints ? faq.detailedPoints.join(" ") : ""}`,
    })),
    absoluteUrl("/"),
  );
  if (faqSchema) schemas.push(faqSchema);

  const breadcrumbsSchema = buildBreadcrumbs([{ name: "Home", path: "/" }]);
  if (breadcrumbsSchema) schemas.push(breadcrumbsSchema);

  return (
    <>
      <JsonLd data={schemas} />

      {/* ── 1. Hero Section (MyPerfectResume-Inspired High-Converting Split Layout) ── */}
      <section className="relative overflow-hidden border-b border-hairline bg-gradient-to-b from-bench/60 via-chalk/90 to-bench/40">
        {/* Subtle schematic grid background for technical workshop feel */}
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
            {/* Left Column (7 cols): Social Proof, Punchy H1, Diagnostic Dual Finder, and 3 Guarantees */}
            <div className="flex flex-col lg:col-span-7">
              {/* Genuine Platform Telemetry - Zero Fake Reviews or Stats */}
              <div className="self-start inline-flex items-center gap-2 rounded-machined border border-hairline bg-chalk/95 px-3 py-1.5 shadow-bench backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
                </span>
                <span className="font-mono text-eyebrow font-semibold uppercase tracking-[0.16em] text-enamel">
                  Smart Escrow Protection Protocol · 0% Advance Payment Risk
                </span>
              </div>

              {/* Punchy Outcome-Driven Main Heading */}
              <h1 className="mt-5 font-display text-4xl font-semibold uppercase tracking-tight text-enamel sm:text-5xl lg:text-6xl">
                Find a Verified Repair Shop.{" "}
                <span className="bg-gradient-to-r from-signal via-signal-lift to-amber-600 bg-clip-text text-transparent">
                  Get It Fixed Right.
                </span>
              </h1>

              {/* Subtitle & Value Proposition */}
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-steel sm:text-lg">
                Connect with bench-tested electronics &amp; micro-soldering technicians near you.
                Upfront itemized quotes, zero advance deposit risk, and smart escrow release only after
                your device is tested and sealed.
              </p>

              {/* Interactive Dual Diagnostic Finder (Problem + City) */}
              <div className="mt-6 w-full">
                <DiagnosticFinder
                  placeholder="What broke? (e.g. MacBook M1 screen, iPhone battery, Inverter PCB, PS5 HDMI...)"
                  searchLabel="Search verified repairs"
                  searchButtonText="Find Technicians"
                />
              </div>

              {/* MyPerfectResume-Style 3 Core Value Guarantees */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-hairline/80 pt-5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">0% Advance Risk</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Funds held safely in escrow vault until you inspect.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">Fixed Quotes</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Itemized parts &amp; bench labor locked before work starts.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-verdigris shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-enamel uppercase tracking-wide">5-Day Warranty</p>
                    <p className="text-[11px] text-steel leading-tight mt-0.5">
                      Physical tamper-evident seal &amp; digital passport.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Interactive Repair Showcase & Escrow Simulator */}
            <div className="lg:col-span-5">
              <HeroTrustConsole />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Real Database Stats Bar ────────────────────────────────────── */}
      {(stats.shopCount > 0 || stats.categoryCount > 0) && (
        <section className="border-b border-hairline bg-enamel text-bench">
          <div className="mx-auto max-w-6xl px-4 py-7">
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatPill
                value={stats.shopCount}
                label="Registered Repair Shops"
                suffix="in directory"
              />
              <StatPill
                value={stats.categoryCount}
                label="Specialized Categories"
                suffix="tested & indexed"
              />
              <StatPill
                value={stats.verifiedCount}
                label="Verified Bench Technicians"
                suffix="physically inspected"
              />
              <div className="col-span-2 sm:col-span-1">
                <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  Platform Guarantee
                </dt>
                <dd className="mt-1 font-display text-display-sm text-bench">
                  5-Day Escrow
                  <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
                    + shop warranty
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {/* ── 3. GEO Authoritative Entity & Comparative Matrix ───────────────── */}
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
              Why FixGrid is Built Differently From Roadside &amp; OEM Repair
            </h2>
            <p className="mt-3 text-base leading-relaxed text-steel">
              <strong>FixGrid Definition:</strong> FixGrid is India&apos;s verified local electronics and home appliance repair network. We eliminate repair fraud by coupling physical workshop vetting with component-level circuit diagnostics, tamper-evident digital warranty seals, and a 100% smart escrow payment framework where technician funds are released only after verified customer satisfaction.
            </p>
          </div>

          {/* Comparative Feature Matrix Table */}
          <div className="mt-10 overflow-x-auto rounded-machined border border-hairline shadow-bench">
            <table className="w-full text-left text-sm text-steel">
              <thead className="bg-enamel font-display text-xs uppercase tracking-wider text-bench">
                <tr>
                  <th scope="col" className="p-4 sm:p-5">Evaluation Metric</th>
                  <th scope="col" className="p-4 sm:p-5 text-signal-wash font-bold bg-enamel-lift">
                    FixGrid Verified Network
                  </th>
                  <th scope="col" className="p-4 sm:p-5">Unorganized Roadside Stalls</th>
                  <th scope="col" className="p-4 sm:p-5">Authorized OEM Service Centers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-chalk font-sans">
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Diagnostic Verification</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> Component-Level Testing + Photographic Proof
                    </span>
                  </td>
                  <td className="p-4 text-steel">Visual guesswork &amp; destructive trial-and-error</td>
                  <td className="p-4 text-steel">Blanket whole-board replacement; no micro-soldering</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Customer Payment Risk</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="inline-flex items-center gap-1.5 text-verdigris font-semibold">
                      <CheckCircle2 className="size-4 shrink-0" /> 0% Risk · Smart Escrow Released on Approval
                    </span>
                  </td>
                  <td className="p-4 text-steel">100% Advance cash or upfront non-refundable fee</td>
                  <td className="p-4 text-steel">Hefty non-refundable diagnostic fee + high markups</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Turnaround Time</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="font-semibold text-enamel">Same-Day to 48 Hours</span>
                  </td>
                  <td className="p-4 text-steel">Unpredictable (days to weeks without status updates)</td>
                  <td className="p-4 text-steel">7 to 21 Days (parts shipped from central warehouses)</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Warranty Protection</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="font-semibold text-enamel">
                      5-Day Platform Guarantee + Shop Warranty (Digital QR Void Seal)
                    </span>
                  </td>
                  <td className="p-4 text-steel">Verbal promise (frequently disputed or rejected)</td>
                  <td className="p-4 text-steel">Strict 30-day warranty limited to new parts only</td>
                </tr>
                <tr className="transition-colors hover:bg-bench-sunk/30">
                  <td className="p-4 font-semibold text-enamel">Pricing Transparency</td>
                  <td className="p-4 font-medium text-enamel bg-signal-wash/30">
                    <span className="font-semibold text-enamel">Itemized quotation agreed prior to repair</span>
                  </td>
                  <td className="p-4 text-steel">Arbitrary pricing based on customer urgency</td>
                  <td className="p-4 text-steel">Inflated proprietary pricing (often 60–80% cost of new device)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. Precision Bench Diagnostics Spotlight ──────────────────────── */}
      <section className="border-b border-hairline bg-bench-sunk/40 py-16" aria-labelledby="bench-standards-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 text-steel">
                <Cpu className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Diagnostic Quality Standards · Component-Level Testing
                </span>
              </div>
              <h2 id="bench-standards-heading" className="mt-3 text-display">
                Precision Bench Diagnostics &amp; Quality Guarantee
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-steel">
                High-end electronics repair requires more than visual inspection. Verified FixGrid technicians operate equipped repair benches with dedicated DC power supplies, stereoscopic inspection microscopes, and high-impedance multimeter profiling to pinpoint failing components before quoting.
              </p>
            </div>
            <div className="shrink-0">
              <Button asChild variant="outline" size="md">
                <Link href="/diagnostic-bench-standards" className="gap-1.5">
                  <span>View Bench Standards</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Zap className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                01. In-Circuit Impedance &amp; Short Isolation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Technicians use low-voltage in-circuit impedance and diode curve profiling to locate shorted MLCC capacitors and open traces in milliseconds without risking thermal stress or electrostatic discharge (ESD) to sensitive silicon.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <Microscope className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                02. Macro Optical Fault Proof
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Technicians capture high-resolution, magnified macro photos of burned components, cracked BGA solder balls, or corroded traces — beaming verifiable visual proof straight to your smartphone before you approve any quotation.
              </p>
            </div>

            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="inline-flex size-11 items-center justify-center rounded-machined border border-hairline bg-bench-sunk text-signal">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-display uppercase tracking-wide text-enamel">
                03. Tamper-Evident QR Warranty Seal
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">
                Upon job completion, a physical tamper-evident QR void seal is affixed to the chassis. Scanning it unlocks verified test logs, before/after visual proof, and activates your recorded platform repair warranty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Repair Categories Explorer ─────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="categories-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("categories.eyebrow")}</p>
              <h2 id="categories-heading" className="mt-2 text-display">
                {t("categories.heading")}
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              {t("categories.all")}
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id} className="rounded-machined border border-hairline">
                <Link
                  href={`/search?category=${category.slug}`}
                  className="group flex h-full flex-col justify-between gap-4 bg-chalk p-5 transition-all hover:bg-signal-wash/40 hover:shadow-bench rounded-machined"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg uppercase tracking-[0.04em] text-enamel transition-colors group-hover:text-signal">
                        {category.name}
                      </span>
                      <Wrench className="size-4 text-steel-soft group-hover:text-signal transition-colors" />
                    </div>
                    {category.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-steel">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft transition-colors group-hover:text-signal">
                    {t("categories.findShops")}
                    <ArrowRight aria-hidden className="size-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 12 && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="md">
                <Link href="/search" className="gap-2">
                  {t("categories.browseAll", { count: categories.length })}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── 6. How it works ───────────────────────────────────────────────── */}
      <section
        className="border-y border-hairline bg-bench-sunk/30"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="eyebrow">{t("how.eyebrow")}</p>
            <h2 id="how-it-works-heading" className="mt-2 text-display">
              {t("how.heading")}
            </h2>
            <p className="mx-auto mt-3 max-w-[50ch] text-sm leading-relaxed text-steel">
              {t("how.intro")}
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline sm:grid-cols-3">
            <HowItWorksCard
              step="01"
              icon={<Search aria-hidden className="size-5" />}
              title={t("how.step1Title")}
              body={t("how.step1Body")}
            />
            <HowItWorksCard
              step="02"
              icon={<Clock aria-hidden className="size-5" />}
              title={t("how.step2Title")}
              body={t("how.step2Body")}
            />
            <HowItWorksCard
              step="03"
              icon={<Phone aria-hidden className="size-5" />}
              title={t("how.step3Title")}
              body={t("how.step3Body")}
            />
          </div>
        </div>
      </section>

      {/* ── 7. Featured Verified Repair Specialists ────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("featured.eyebrow")}</p>
              <h2 id="featured-heading" className="mt-2 text-display">
                {t("featured.heading")}
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              {t("featured.cta")}
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {featured.map((fixer, index) => (
              <ResultCard
                key={fixer.id}
                id={fixer.id}
                slug={fixer.slug}
                shopName={fixer.shop_name}
                address={fixer.address}
                photo={fixer.photos[0] ?? null}
                verified={fixer.verified}
                warrantyDays={fixer.default_warranty_days}
                ratingAvg={Number(fixer.rating_avg)}
                ratingCount={fixer.rating_count}
                categories={fixer.categories}
                hours={toHoursInput(fixer)}
                initialStatus={getShopStatus(toHoursInput(fixer))}
                index={index + 1}
                hasCoordinates={false}
                bio={fixer.bio}
                offersInShop={fixer.offers_in_shop}
                offersHomeService={fixer.offers_home_service}
                offersPickupDrop={fixer.offers_pickup_drop}
                responseHours={fixer.response_hours}
                workingDays={fixer.working_days}
                openingTime={fixer.opening_time}
                closingTime={fixer.closing_time}
              />
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/search">{t("featured.cta")}</Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── 8. High-Intent Diagnostic Problem Pages Mesh (SEO PageRank Engine) ── */}
      <section className="border-t border-hairline bg-chalk py-16" aria-labelledby="diagnostic-problems-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-steel">
                <Layers className="size-3.5 text-signal" />
                <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                  Component-Level Triage
                </span>
              </div>
              <h2 id="diagnostic-problems-heading" className="mt-3 text-display">
                High-Intent Diagnostic Guides &amp; Solvers
              </h2>
              <p className="mt-2 text-sm text-steel max-w-[55ch]">
                Explore circuit-level repair guides, troubleshooting workflows, and parts replacement standards authored by bench specialists.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/right-to-repair">Right to Repair</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/warranty-protection">Warranty Protection</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIAGNOSTIC_PROBLEMS.map((problem) => (
              <Link
                key={problem.slug}
                href={problem.slug}
                className="group flex flex-col justify-between rounded-machined border border-hairline bg-bench/30 p-4 transition-all hover:border-signal hover:bg-signal-wash/20 hover:shadow-bench"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-steel-soft">
                    <span>{problem.category}</span>
                    <span className="rounded bg-chalk px-1.5 py-0.5 font-semibold text-signal border border-hairline">
                      {problem.badge}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-display text-base uppercase tracking-wide text-enamel transition-colors group-hover:text-signal">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-steel line-clamp-3">
                    {problem.summary}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-signal">
                  <span>Explore Diagnostic</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Metropolitan City Hubs Directory (Local SEO Authority) ────────── */}
      <section className="border-t border-hairline bg-bench-sunk/30 py-16" aria-labelledby="metro-hubs-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 text-steel">
              <MapPin className="size-3.5 text-signal" />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
                Verified Indian Repair Clusters
              </span>
            </div>
            <h2 id="metro-hubs-heading" className="mt-3 text-display">
              Explore Local Repair Specialists by City Hub
            </h2>
            <p className="mx-auto mt-2 max-w-[60ch] text-sm text-steel">
              Connect directly with neighborhood workshops in your local district across India&apos;s top metropolitan centers.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {METRO_HUBS.map((metro) => (
              <div
                key={metro.city}
                className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench"
              >
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <h3 className="font-display text-lg uppercase tracking-wide text-enamel">
                    {metro.city}
                  </h3>
                  <span className="font-mono text-[11px] font-semibold text-verdigris uppercase">
                    Active Hubs
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-hairline/60">
                  {metro.hubs.map((hub) => (
                    <li key={hub.path}>
                      <Link
                        href={hub.path}
                        className="group flex items-center justify-between py-2 text-sm text-steel transition-colors hover:text-signal"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          {hub.name}
                        </span>
                        <ArrowRight className="size-3 text-steel-soft opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Recent Technical Engineering Guides (Blog) ────────────────── */}
      {recentBlogs.length > 0 && (
        <section className="border-t border-hairline bg-chalk py-16" aria-labelledby="blog-guides-heading">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Technical Knowledge Base</p>
                <h2 id="blog-guides-heading" className="mt-2 text-display">
                  Recent Engineering &amp; Triage Guides
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
              >
                View all articles
                <ArrowRight aria-hidden className="size-3" />
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentBlogs.map((post) => {
                const words = post.content ? post.content.split(/\s+/).length : 600;
                const readTime = Math.max(3, Math.ceil(words / 200));
                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col justify-between rounded-machined border border-hairline bg-bench/20 p-5 transition-all hover:border-signal hover:bg-signal-wash/20 hover:shadow-bench"
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-eyebrow text-steel-soft">
                        <span>
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })
                            : "Guide"}
                        </span>
                        <span>{readTime} min read</span>
                      </div>
                      <h3 className="mt-3 font-display text-base uppercase leading-tight tracking-wide text-enamel transition-colors group-hover:text-signal line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-steel line-clamp-3">
                        {post.meta_description ?? "Comprehensive circuit diagnosis, troubleshooting steps, and repair guidelines."}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between font-mono text-[11px] text-signal font-semibold uppercase">
                      <span>Read Guide</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 11. AEO FAQ Section ───────────────────────────────────────────── */}
      <FaqSection
        eyebrow="Answer Engine & Knowledge Hub"
        heading="Frequently Asked Questions"
        intro="Direct answers for search engines and consumers on repair authenticity, smart escrow mechanisms, verified bench diagnostics, and warranty guarantees."
      />

      {/* ── 12. Triple Bottom Line Impact ─────────────────────────────────── */}
      <section
        className="border-t border-hairline bg-enamel text-bench py-16"
        aria-labelledby="impact-heading"
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="eyebrow text-steel-soft">Empirical Sustainability</p>
            <h2 id="impact-heading" className="mt-2 text-display text-bench">
              The Triple Bottom Line Impact of FixGrid
            </h2>
            <p className="mx-auto mt-2 max-w-[55ch] text-sm text-steel-soft">
              Fixing broken items isn&apos;t just frugal — it transforms neighborhood economies and shields the planet from unnecessary electronic waste.
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="rounded-machined border border-enamel-lift bg-enamel-lift/40 p-6">
              <div className="inline-flex size-10 items-center justify-center rounded-machined bg-signal text-bench">
                <Scale className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-display uppercase tracking-wide text-bench">
                Economic (Consumer)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-soft">
                Consumers save <strong>60% to 80%</strong> compared to purchasing expensive new replacements. Smart escrow and visual proof eliminate surprise diagnostic charges.
              </p>
            </div>

            <div className="rounded-machined border border-enamel-lift bg-enamel-lift/40 p-6">
              <div className="inline-flex size-10 items-center justify-center rounded-machined bg-verdigris text-bench">
                <Wrench className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-display uppercase tracking-wide text-bench">
                Social (Community)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-soft">
                Local repair heroes gain a respected digital storefront, pro diagnostic tooling, and earn a <strong>5% cashback rebate</strong> on completed repair invoices.
              </p>
            </div>

            <div className="rounded-machined border border-enamel-lift bg-enamel-lift/40 p-6">
              <div className="inline-flex size-10 items-center justify-center rounded-machined bg-signal-lift text-bench">
                <Leaf className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-display uppercase tracking-wide text-bench">
                Ecological (Planet)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-soft">
                Combats toxic e-waste landfills by keeping appliances and devices in active service. The cleanest product is the one that is already built.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. Technician Join CTA ───────────────────────────────────────── */}
      <section className="border-t border-hairline bg-chalk">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Badge variant="verified" className="mb-3">{t("join.badge")}</Badge>
              <h2 className="text-display-sm">{t("join.heading")}</h2>
              <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-steel">
                {t("join.body")} Verified shops receive verified storefront listings, direct customer booking management, and a 5% completed-bill rebate.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Button asChild size="lg">
                <Link href="/join">
                  {t("join.cta")}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {t("join.note")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatPill({
  value,
  label,
  suffix,
  className,
}: {
  value: number;
  label: string;
  suffix: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-display-sm text-bench">
        {value.toLocaleString()}
        <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-steel-soft">
          {suffix}
        </span>
      </dd>
    </div>
  );
}

function HowItWorksCard({
  step,
  icon,
  title,
  body,
}: {
  step: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-chalk p-6">
      <div className="flex items-start justify-between">
        <span className="inline-flex size-10 items-center justify-center rounded-machined border border-hairline bg-bench text-signal">
          {icon}
        </span>
        <span className="font-mono text-[2rem] font-bold leading-none text-bench-sunk">
          {step}
        </span>
      </div>
      <div>
        <h3 className="text-base font-display uppercase tracking-wide text-enamel">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-steel">{body}</p>
      </div>
    </div>
  );
}
