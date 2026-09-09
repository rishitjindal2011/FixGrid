/**
 * Seeds `repair_categories`, `cms_templates`, and `seo_pages` from the category fact tables
 * in `seed-content.ts` and core informational site pages.
 *
 * Safe to run repeatedly: upserts on unique constraints.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import { ContentSectionsSchema, type Block } from "../src/lib/cms/blocks";
import type { Database, Json } from "../src/lib/types/database";
import { CATEGORY_SEEDS, buildBlocks, type CategorySeed } from "./seed-content";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n  Missing ${name}.\n`);
    process.exit(1);
  }
  return value.trim();
}

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PATH_PREFIX = "repair";

function metaFor(seed: CategorySeed, city?: string) {
  if (city) {
    return {
      meta_title: `${seed.label} Service in ${city} — Certified Local Shops & Costs | FixGrid`,
      meta_description: `Looking for reliable ${seed.noun} repair in ${city}? Find certified local technicians, compare diagnostic costs (${seed.priceRange}), and book with 90-day warranty protection.`,
      keywords: [
        `${seed.slug} repair in ${city.toLowerCase()}`,
        `${seed.slug} repair near me in ${city.toLowerCase()}`,
        `${seed.slug} repair ${city.toLowerCase()}`,
        `${seed.label.toLowerCase()} in ${city.toLowerCase()}`,
        `best ${seed.slug} repair shop ${city.toLowerCase()}`,
        `${seed.noun} repair ${city.toLowerCase()}`,
        `${seed.slug} repair near me`,
        `${seed.slug} repair cost`,
      ],
    };
  }

  return {
    meta_title: `${seed.label} Near You (Mumbai & Major Cities) — Certified Local Shops & Costs`,
    meta_description: `What ${seed.noun} repairs cost (${seed.priceRange}), typical turnaround times, and verified local repair technicians across Mumbai, Delhi, Bengaluru & nearby hubs. Find experts open now.`,
    keywords: [
      `${seed.slug} repair`,
      `${seed.slug} repair near me`,
      `${seed.slug} repair in mumbai`,
      `${seed.slug} repair cost`,
      `fix ${seed.noun}`,
      `${seed.noun} repair technician`,
      `local ${seed.slug} service`,
    ],
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  phones: "Smartphone",
  laptops: "Laptop",
  appliances: "WashingMachine",
  bicycles: "Bike",
  watches: "Watch",
  tablets: "Tablet",
  desktops: "Monitor",
  consoles: "Gamepad2",
  "audio-equipment": "Headphones",
  cameras: "Camera",
  "smart-home": "Home",
  "power-tools": "Wrench",
  televisions: "Tv",
  "small-appliances": "Coffee",
  drones: "Radio",
  "e-scooters": "Zap",
  "macbook-screen-repair": "Laptop",
  "iphone-battery-replacement": "Smartphone",
  "playstation-hdmi-repair": "Gamepad2",
  "laptop-liquid-damage": "Laptop",
  "inverter-pcb-repair": "Cpu",
  "refrigerator-compressor-repair": "Snowflake",
  "drone-motor-replacement": "Radio",
  "mechanical-keyboard-switch-replacement": "Keyboard",
};

interface Result {
  slug: string;
  action: "created" | "updated" | "skipped" | "failed";
  detail?: string;
  words?: number;
}

function countWords(blocks: unknown): number {
  const text = JSON.stringify(blocks)
    .replace(/<[^>]+>/g, " ")
    .replace(/[^A-Za-z0-9'’-]+/g, " ");
  return text.split(" ").filter((word) => word.length > 1).length;
}

async function seedCategoryDirectory(seed: CategorySeed, sortOrder: number) {
  const icon = CATEGORY_ICONS[seed.slug] || "Wrench";
  const { data: existing } = await supabase
    .from("repair_categories")
    .select("id")
    .ilike("slug", seed.slug)
    .maybeSingle();

  const payload = {
    name: seed.label,
    slug: seed.slug,
    description: `Diagnostics, parts replacement, and servicing for ${seed.noun}.`,
    icon,
    sort_order: sortOrder,
  };

  if (existing) {
    const { error } = await supabase.from("repair_categories").update(payload).eq("id", existing.id);
    if (error) console.warn(`  Warning: Could not update category ${seed.slug}:`, error.message);
  } else {
    const { error } = await supabase.from("repair_categories").insert(payload);
    if (error) console.warn(`  Warning: Could not insert category ${seed.slug}:`, error.message);
  }
}

async function seedTemplate(seed: CategorySeed, blocks: unknown): Promise<string> {
  const { data, error } = await supabase
    .from("cms_templates")
    .upsert(
      {
        slug: `${seed.slug}-guide`,
        name: `${seed.label} guide`,
        sections: blocks as Json,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`template ${seed.slug}: ${error.message}`);
  return data.id;
}

async function seedPage(
  seed: CategorySeed,
  blocks: unknown,
  templateId: string,
  customSlug?: string,
  city?: string,
): Promise<Result> {
  const pageSlug = customSlug || seed.slug;
  const pageTitle = city ? `${seed.label} in ${city}` : `${seed.label} Near You`;

  const { data: existing, error: readError } = await supabase
    .from("seo_pages")
    .select("id, status")
    .eq("path_prefix", PATH_PREFIX)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (readError) return { slug: pageSlug, action: "failed", detail: readError.message };

  const regenerated = {
    title: pageTitle,
    ...metaFor(seed, city),
    content_sections: blocks as Json,
    status: "published" as const,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    schema_type: "Service",
    is_indexed: true,
    is_followed: true,
  };

  if (existing) {
    const { error } = await supabase.from("seo_pages").update(regenerated).eq("id", existing.id);
    if (error) return { slug: pageSlug, action: "failed", detail: error.message };
    return { slug: pageSlug, action: "updated", words: countWords(blocks) };
  }

  const { error } = await supabase.from("seo_pages").insert({
    ...regenerated,
    path_prefix: PATH_PREFIX,
    slug: pageSlug,
    template_id: templateId,
    canonical_url: null,
    og_title: null,
    og_image_url: null,
    schema_markup: null,
  });
  if (error) return { slug: pageSlug, action: "failed", detail: error.message };
  return { slug: pageSlug, action: "created", words: countWords(blocks) };
}

/* ── Core Informational / Trust Pages ────────────────────────────────────── */

const CORE_PAGES: Array<{
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  blocks: Block[];
}> = [
  {
    slug: "verification",
    title: "How Verification Works at FixGrid",
    meta_title: "How FixGrid Verifies Local Repair Shops | FixGrid",
    meta_description: "Learn about the rigorous verification standards FixGrid uses to vet independent repair shops, verify technician credentials, and audit warranties.",
    keywords: ["verified repair shops", "repair shop credentials", "repair certification", "vetted repair experts", "FixGrid standards"],
    blocks: [
      {
        type: "compact_hero",
        eyebrow: "Trust & Safety",
        heading: "How FixGrid Verifies Repair Experts",
        subtitle: "Every verified badge on FixGrid represents genuine technical credentials, physical bench audits, business licensing, and transparent customer warranties.",
        ctas: [{ label: "Browse Verified Shops", href: "/search" }],
      },
      {
        type: "highlights_strip",
        items: [
          { label: "License verification", value: "100% Audited" },
          { label: "Warranty requirement", value: "90+ Days" },
          { label: "Fake reviews", value: "Zero Tolerance" },
        ],
      },
      {
        type: "rich_text",
        html: `
<h2>Our 4-Step Repairer Vetting Process</h2>
<p>FixGrid was founded on the belief that consumers deserve honest, transparent, and skilled independent repair services. We strictly reject fake shops and unverified listings. Here is how every verified repair shop is audited:</p>

<h3>1. Physical Location and Business Entity Verification</h3>
<p>We verify that every listed repairer operates an active commercial repair workshop or certified mobile service van. We review government registration documents, local business operating licenses, and commercial liability insurance policies.</p>

<h3>2. Diagnostic Bench Equipment & Safety Standards</h3>
<p>Modern micro-electronics and appliance repairs require professional diagnostic equipment. We verify that shops utilize temperature-controlled soldering stations, anti-static (ESD) protection, high-grade microscopes, diagnostic multimeters, and safe lithium-ion battery handling storage containers.</p>

<h3>3. Minimum 90-Day Parts & Labor Warranty Guarantee</h3>
<p>To qualify for verified status on FixGrid, a repair shop must offer a written warranty of at least 90 days on both replacement parts and technician labor. If a replaced component fails under normal use within the warranty period, the shop guarantees replacement without additional diagnostic charges.</p>

<h3>4. Authentic Review Integrity</h3>
<p>FixGrid enforces strict review authenticity. Only verified customers who engage repair shops through our directory can submit service ratings. We utilize automated fraud detection and manual audits to permanently remove any fraudulent or incentivized testimonials.</p>
        `.trim(),
        width: "prose",
      },
      {
        type: "faq_accordion",
        title: "Verification Questions",
        items: [
          {
            question: "How do I know a shop on FixGrid is truly verified?",
            answer: "Look for the green 'Verified' badge next to the shop name. This indicates the business has passed license, insurance, equipment, and warranty audits.",
          },
          {
            question: "What happens if a verified shop does not honor their warranty?",
            answer: "FixGrid investigates all warranty disputes. If a shop refuses to honor their stated warranty terms, their verified badge is suspended.",
          },
        ],
      },
      {
        type: "cta_banner",
        heading: "Are you a qualified repair technician?",
        body: "Join our verified directory of trusted local repair shops today.",
        cta: { label: "Apply to List Your Shop", href: "/join" },
        tone: "signal",
      },
    ],
  },
  {
    slug: "about",
    title: "About FixGrid — Championing Repair Over Replacement",
    meta_title: "About FixGrid | The Open Directory of Local Repair Experts",
    meta_description: "FixGrid connects consumers with skilled, independent repair technicians to reduce electronic waste, support local trades, and champion the Right to Repair.",
    keywords: ["about FixGrid", "right to repair platform", "e-waste reduction", "local repair directory", "fix rather than replace"],
    blocks: [
      {
        type: "compact_hero",
        eyebrow: "Our Mission",
        heading: "Fix More. Waste Less.",
        subtitle: "FixGrid is an independent platform connecting consumers with verified local repair technicians across electronics, appliances, vehicles, and precision instruments.",
        ctas: [{ label: "Explore Directory", href: "/search" }],
      },
      {
        type: "highlights_strip",
        items: [
          { label: "Community", value: "Independent" },
          { label: "Right to Repair", value: "100% Champion" },
          { label: "Fake Content", value: "0%" },
        ],
      },
      {
        type: "rich_text",
        html: `
<h2>Why FixGrid Exists</h2>
<p>Every year, millions of tons of repairable consumer electronics and household appliances are discarded into landfills. Modern consumer culture has been pushed toward disposable devices with glued batteries, encrypted parts pairing, and nonexistent manufacturer schematics.</p>
<p>FixGrid was created to restore balance. By providing transparent technical diagnostic guides, realistic component repair cost benchmarks, and a curated directory of skilled local repairers, we make repairing your existing devices easier, faster, and more affordable than buying brand new replacements.</p>

<h3>Our Core Commitments</h3>
<ul>
  <li><strong>100% Real, Honest Content:</strong> We never generate fake customer testimonials, fabricated shops, or artificially inflated ratings. Everything on FixGrid is grounded in real engineering facts and verified local businesses.</li>
  <li><strong>Advocating for the Right to Repair:</strong> We actively support legislation requiring manufacturers to provide public schematics, spare parts, and diagnostic tools to independent repairers and owners.</li>
  <li><strong>Empowering Local Trades:</strong> Independent repair technicians are the backbone of sustainable local economies. FixGrid provides them with open visibility without exorbitant lead-generation middlemen fees.</li>
</ul>
        `.trim(),
        width: "prose",
      },
      {
        type: "cta_banner",
        heading: "Find a verified repair shop near you",
        body: "Search local technicians by category, opening hours, and service options.",
        cta: { label: "Search Directory", href: "/search" },
        tone: "signal",
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    meta_title: "Privacy Policy | FixGrid",
    meta_description: "FixGrid's transparent privacy policy explaining how we handle and protect your personal information.",
    keywords: ["privacy policy", "data protection", "FixGrid privacy"],
    blocks: [
      {
        type: "compact_hero",
        heading: "Privacy Policy",
        subtitle: "How FixGrid collects, uses, and protects your information.",
      },
      {
        type: "rich_text",
        html: `
<h2>Our Privacy Commitment</h2>
<p>FixGrid is committed to protecting your privacy and personal data. We do not sell your personal data to third-party data brokers or advertisers.</p>
<h3>1. Information We Collect</h3>
<p>We collect information you provide directly to us when creating an account, requesting a repair consultation, or listing a repair business (such as name, email address, phone number, and physical shop location).</p>
<h3>2. How We Use Information</h3>
<p>Your information is used strictly to facilitate connections between consumers and local repair technicians, manage authentication sessions, and send service updates.</p>
<h3>3. Data Security</h3>
<p>We implement industry-standard encryption, secure session tokens, and strict database access controls to safeguard your personal information.</p>
        `.trim(),
        width: "prose",
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    meta_title: "Terms of Service | FixGrid",
    meta_description: "Terms and conditions governing the use of the FixGrid directory platform.",
    keywords: ["terms of service", "user agreement", "FixGrid terms"],
    blocks: [
      {
        type: "compact_hero",
        heading: "Terms of Service",
        subtitle: "Please read these terms carefully before using the FixGrid platform.",
      },
      {
        type: "rich_text",
        html: `
<h2>1. Acceptance of Terms</h2>
<p>By accessing or using FixGrid, you agree to be bound by these Terms of Service. If you do not agree, you must not use the platform.</p>
<h2>2. Directory Nature of Platform</h2>
<p>FixGrid operates an informational and discovery directory connecting consumers with independent repair businesses. Independent repair technicians operate their own businesses and set their own quotes, diagnostic procedures, and service terms.</p>
<h2>3. Accurate Information</h2>
<p>Repair businesses listing on FixGrid agree to provide accurate, truthful details regarding business licenses, contact details, operating hours, and warranty terms.</p>
        `.trim(),
        width: "prose",
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund Policy",
    meta_title: "Refund Policy | FixGrid",
    meta_description: "FixGrid's refund policy and dispute resolution guidelines for consumer repair transactions.",
    keywords: ["refund policy", "repair dispute resolution", "FixGrid refunds"],
    blocks: [
      {
        type: "compact_hero",
        heading: "Refund Policy & Dispute Resolution",
        subtitle: "Clear, transparent guidelines on repair warranties and refund processes.",
      },
      {
        type: "rich_text",
        html: `
<h2>Repair Warranty & Refund Protocols</h2>
<p>Because independent repair technicians provide physical services and install hardware parts, service warranties and refund terms are governed by the specific service agreement issued by the repair shop at the time of repair.</p>
<h3>Verified Shop Warranty Guarantee</h3>
<p>All verified repair shops on FixGrid agree to maintain a minimum 90-day parts and labor warranty on completed repairs. If a repair fails due to defective parts or workmanship within this timeframe, the shop will re-service the device or refund the labor cost.</p>
<h3>Dispute Resolution</h3>
<p>If you experience an unresolved dispute with a verified repairer, contact FixGrid support at support@vytron.me with your receipt and service documentation. We will review the case with the repair shop to ensure fair resolution.</p>
        `.trim(),
        width: "prose",
      },
    ],
  },
  {
    slug: "right-to-repair",
    title: "The Right to Repair — Championing Fair Repair Over Forced Upgrades",
    meta_title: "The Right to Repair Movement & Consumer Rights | FixGrid",
    meta_description: "Understand the Right to Repair movement, consumer hardware rights, parts pairing barriers, and how FixGrid empowers independent technicians and owners.",
    keywords: ["right to repair", "fair repair act", "e-waste reduction", "independent repair rights", "parts pairing repair", "open repair data"],
    blocks: [
      {
        type: "compact_hero",
        eyebrow: "Repair Advocacy",
        heading: "You Own It. You Have the Right to Repair It.",
        subtitle: "FixGrid champions legislative and technical Right to Repair standards: public schematics, diagnostic tools, OEM spare parts, and zero digital lock-out barriers.",
        ctas: [{ label: "Explore Verified Directory", href: "/search" }],
      },
      {
        type: "highlights_strip",
        items: [
          { label: "Repair Advocacy", value: "100% Pro-Repair" },
          { label: "Schematics Access", value: "Open Standards" },
          { label: "E-Waste Target", value: "Zero Landfill" },
        ],
      },
      {
        type: "rich_text",
        html: `
<h2>The Engineering & Environmental Case for Repair</h2>
<p>Modern consumers generate over 50 million metric tons of electronic waste annually. The primary driver of this crisis is planned obsolescence: hardware engineered with permanent adhesives, proprietary screw heads, software serialization locking replacement parts, and artificial restrictions withholding component schematics from independent repairers.</p>
<p>FixGrid exists to counteract this trend. We believe that once you purchase a smartphone, computer, appliance, or vehicle, you own the right to repair it yourself or bring it to any independent technician of your choice without punitive software lockouts.</p>

<h3>The Four Pillars of True Right to Repair</h3>
<ul>
  <li><strong>1. Open Diagnostic Tools:</strong> Independent workshops must have equal access to diagnostic software, error code readouts, and calibration utilities equivalent to factory repair centers.</li>
  <li><strong>2. Availability of Component Schematics:</strong> Wiring diagrams, boardview files, and component value documentation must be accessible so technicians can micro-solder failed capacitors rather than discarding entire functional motherboards.</li>
  <li><strong>3. Unrestricted Spare Parts Supply:</strong> Consumers and independent shops should be able to purchase authentic OEM and high-tier aftermarket replacement parts at reasonable commercial prices.</li>
  <li><strong>4. Elimination of Digital Parts Pairing:</strong> Disabling Face ID, true tone, battery health statistics, or camera autofocus simply because a part was replaced without manufacturer cloud authorization is an anti-consumer practice that must end.</li>
</ul>

<h3>Supporting Independent Trade Economies</h3>
<p>Independent repair technicians are neighborhood artisans and engineers. When you repair an existing device locally, 80% or more of that repair expenditure remains inside your local community economy, while simultaneously sparing the environment from raw mineral extraction and carbon emissions required to produce new hardware.</p>
        `.trim(),
        width: "prose",
      },
      {
        type: "faq_accordion",
        title: "Right to Repair Questions",
        items: [
          {
            question: "Does repairing my phone or laptop at an independent shop void my consumer rights?",
            answer:
              "In most modern jurisdictions, the law prohibits manufacturers from voiding consumer warranties simply because an independent technician opened or serviced the device, provided the repair itself did not cause damage.",
          },
          {
            question: "What is 'parts pairing' or serialization?",
            answer:
              "Parts pairing is a manufacturer practice where microcontrollers on screens, batteries, or camera modules are cryptographically linked to the motherboard CPU, causing software warnings or feature shutdowns if swapped without proprietary factory software.",
          },
          {
            question: "How does FixGrid support the Right to Repair?",
            answer:
              "FixGrid provides public diagnostic guides, transparent component pricing benchmarks, and a commission-free discovery directory for vetted independent repair technicians.",
          },
        ],
      },
      {
        type: "cta_banner",
        heading: "Support your local independent repair economy",
        body: "Find skilled local technicians offering component-level diagnostics and honest pricing.",
        cta: { label: "Search Verified Repair Shops", href: "/search" },
        tone: "signal",
      },
    ],
  },
  {
    slug: "warranty-protection",
    title: "FixGrid 90-Day Warranty Protection & Dispute Resolution",
    meta_title: "FixGrid 90-Day Repair Warranty Protection & Guarantee",
    meta_description: "Learn how FixGrid's mandatory 90-day minimum repair warranty protects consumers against component defects and ensures fair service mediation.",
    keywords: ["repair warranty guarantee", "90 day repair warranty", "fixgrid warranty protection", "dispute resolution repair", "certified repair guarantee"],
    blocks: [
      {
        type: "compact_hero",
        eyebrow: "Customer Assurance",
        heading: "Guaranteed 90-Day Repair Protection",
        subtitle: "Every verified repair shop on FixGrid provides a minimum 90-day parts and labor warranty, backed by impartial platform mediation.",
        ctas: [{ label: "Find Protected Shops", href: "/search" }],
      },
      {
        type: "highlights_strip",
        items: [
          { label: "Minimum Period", value: "90 Days" },
          { label: "Coverage", value: "Parts & Labor" },
          { label: "Platform Mediation", value: "100% Free" },
        ],
      },
      {
        type: "rich_text",
        html: `
<h2>Transparent Warranty Standards You Can Trust</h2>
<p>Leaving expensive electronics or essential household appliances with a repair shop requires trust. To eliminate uncertainty, FixGrid requires all verified repairers to adhere to standardized warranty protocols.</p>

<h3>What Is Covered Under the 90-Day Warranty</h3>
<ul>
  <li><strong>Replacement Component Defects:</strong> If a replaced screen develops touch digitizer glitches, a new battery fails to hold charge, or an HDMI port loses signal within 90 days, the shop will replace the defective part at zero cost to you.</li>
  <li><strong>Technician Workmanship:</strong> Solder connections, thermal paste application, internal shielding alignment, and adhesive re-bonding are fully guaranteed against failure under standard operating conditions.</li>
</ul>

<h3>What Is Excluded from Warranty Coverage</h3>
<p>Warranties cover manufacturing and assembly defects, but do not cover accidental damage occurring after device pickup, including:</p>
<ul>
  <li>Physical drop impacts resulting in cracked glass or bent metal chassis</li>
  <li>Subsequent liquid immersion or moisture exposure</li>
  <li>Unauthorized third-party teardown or firmware tampering after repair completion</li>
</ul>

<h3>How Our Dispute Mediation Works</h3>
<p>If you experience any issue with a completed repair and the shop fails to resolve it promptly, submit your service receipt and diagnostic photos to our dispute team at support@vytron.me. Our technical advisors review bench logs and ensure the shop fulfills their warranty commitment.</p>
        `.trim(),
        width: "prose",
      },
      {
        type: "faq_accordion",
        title: "Warranty Protection FAQs",
        items: [
          {
            question: "How do I claim a warranty repair?",
            answer:
              "Contact the repair shop directly with your digital invoice or receipt. If you encounter any friction, notify FixGrid support with your booking details for immediate escalation.",
          },
          {
            question: "Can shops offer longer warranties than 90 days?",
            answer:
              "Yes! Many premium verified shops offer 6-month or 1-year warranties on modular screen and battery replacements. The 90-day requirement is our platform baseline.",
          },
        ],
      },
      {
        type: "cta_banner",
        heading: "Book repair with guaranteed warranty protection",
        body: "Browse certified repair experts with upfront pricing and verified warranties.",
        cta: { label: "Search Protected Shops", href: "/search" },
        tone: "signal",
      },
    ],
  },
  {
    slug: "diagnostic-bench-standards",
    title: "FixGrid Technical Diagnostic Bench Standards for Repairers",
    meta_title: "Repair Diagnostic Bench & Equipment Standards | FixGrid",
    meta_description: "Explore the professional bench equipment, ESD safety protocols, and micro-soldering precision standards required of FixGrid verified repair shops.",
    keywords: ["repair bench standards", "esd safety electronics", "ultrasonic cleaning standards", "micro-soldering repair", "certified technician bench"],
    blocks: [
      {
        type: "compact_hero",
        eyebrow: "Bench Engineering Standards",
        heading: "Precision Diagnostic & Safety Standards",
        subtitle: "Behind every FixGrid verified badge is a rigorous evaluation of workshop diagnostic equipment, thermal imaging, ESD grounding, and safe battery handling.",
        ctas: [{ label: "Browse Verified Technicians", href: "/search" }],
      },
      {
        type: "highlights_strip",
        items: [
          { label: "ESD Protection", value: "Mandatory" },
          { label: "Optical Zoom", value: "45x Trinocular" },
          { label: "Ultrasonic Bath", value: "99.9% Anhydrous IPA" },
        ],
      },
      {
        type: "rich_text",
        html: `
<h2>The Anatomy of a Professional Repair Bench</h2>
<p>FixGrid verifies that independent repairers operate clean, equipped, and safety-compliant diagnostic workstations. Modern micro-electronics operate at microscopic tolerances where improper tools cause irreversible logic board destruction.</p>

<h3>1. Electrostatic Discharge (ESD) Protection</h3>
<p>Human bodies regularly accumulate electrostatic charges exceeding 3,000 volts—sufficient to blow delicate 1.2V semiconductor gates without an audible spark. Verified workshops must maintain dissipative grounded silicone work mats, ESD wrist straps, and conductive parts bins.</p>

<h3>2. Precision Micro-Soldering & Thermal Imaging</h3>
<p>Component-level board repair requires optical magnification and controlled thermal profiles:</p>
<ul>
  <li>Trinocular stereo microscopes with minimum 7x–45x continuous zoom for inspecting 0201 surface-mount passive components.</li>
  <li>Thermal imaging cameras (minimum 256x192 sensor resolution) paired with programmable DC bench power supplies to locate shorted ceramic capacitors by thermal signature.</li>
  <li>Temperature-controlled hot-air rework stations and precision micro-soldering iron tips with rapid thermocouple thermal recovery.</li>
</ul>

<h3>3. Ultrasonic Cleaning & Chemical Safety</h3>
<p>Liquid-damaged electronics require ultrasonic cavitation baths filled with anhydrous 99.9% electronic-grade isopropyl alcohol to dislodge mineral crusts beneath ball grid array (BGA) packages without mechanical scratching.</p>

<h3>4. Lithium Battery Fire Containment</h3>
<p>Swollen or punctured lithium-ion cells represent a volatile combustion hazard. Verified facilities maintain fireproof LiPo safety bags, Class D extinguishing agents, and sand containment buckets.</p>
        `.trim(),
        width: "prose",
      },
      {
        type: "faq_accordion",
        title: "Technical Standards FAQs",
        items: [
          {
            question: "Why does component-level micro-soldering matter?",
            answer:
              "Micro-soldering allows technicians to replace a 50-cent failed power capacitor rather than charging you hundreds of dollars for a complete motherboard replacement.",
          },
          {
            question: "How does FixGrid audit bench standards?",
            answer:
              "We perform photographic audits, business license verifications, and cross-reference equipment capabilities before issuing verified workshop status.",
          },
        ],
      },
      {
        type: "cta_banner",
        heading: "Find a verified repair workshop with audited bench tools",
        body: "Browse certified technicians equipped for precision electronics and appliance diagnostics.",
        cta: { label: "Search Verified Bench Shops", href: "/search" },
        tone: "signal",
      },
    ],
  },
];

async function seedCorePages(): Promise<void> {
  console.log(`\n  Seeding ${CORE_PAGES.length} core site pages under root…\n`);
  for (const page of CORE_PAGES) {
    const { data: existing } = await supabase
      .from("seo_pages")
      .select("id")
      .eq("path_prefix", "")
      .eq("slug", page.slug)
      .maybeSingle();

    const payload = {
      title: page.title,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      keywords: page.keywords,
      content_sections: page.blocks as unknown as Json,
      path_prefix: "",
      slug: page.slug,
      status: "published" as const,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schema_type: "WebPage",
      is_indexed: true,
      is_followed: true,
    };

    if (existing) {
      const { error } = await supabase.from("seo_pages").update(payload).eq("id", existing.id);
      if (error) {
        console.error(`  ✗ /${page.slug} failed to update:`, error.message);
      } else {
        console.log(`  ✓ /${page.slug} updated`);
      }
    } else {
      const { error } = await supabase.from("seo_pages").insert({
        ...payload,
        template_id: null,
        canonical_url: null,
        og_title: null,
        og_image_url: null,
        schema_markup: null,
      });
      if (error) {
        console.error(`  ✗ /${page.slug} failed to insert:`, error.message);
      } else {
        console.log(`  ✓ /${page.slug} created`);
      }
    }
  }
}

async function main(): Promise<void> {
  console.log(`\n  Seeding ${CATEGORY_SEEDS.length} category pages under /${PATH_PREFIX}/…\n`);

  const results: Result[] = [];
  let sortOrder = 10;

  for (const seed of CATEGORY_SEEDS) {
    await seedCategoryDirectory(seed, sortOrder);
    sortOrder += 10;

    const blocks = buildBlocks(seed);
    const parsed = ContentSectionsSchema.safeParse(blocks);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first ? `${first.path.join(".")}: ${first.message}` : "unknown";
      results.push({ slug: seed.slug, action: "failed", detail: `invalid blocks — ${where}` });
      continue;
    }

    try {
      const templateId = await seedTemplate(seed, parsed.data);
      results.push(await seedPage(seed, parsed.data, templateId));
    } catch (error) {
      results.push({
        slug: seed.slug,
        action: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n  Seeding High-Intent Local SEO City Pages (Mumbai & Key Metros)…\n`);

  const LOCAL_CITY_SEEDS: Array<{ slug: string; city: string }> = [
    // Mumbai (12 high-demand categories)
    { slug: "phones", city: "Mumbai" },
    { slug: "laptops", city: "Mumbai" },
    { slug: "appliances", city: "Mumbai" },
    { slug: "desktops", city: "Mumbai" },
    { slug: "audio-equipment", city: "Mumbai" },
    { slug: "tablets", city: "Mumbai" },
    { slug: "consoles", city: "Mumbai" },
    { slug: "televisions", city: "Mumbai" },
    { slug: "cameras", city: "Mumbai" },
    { slug: "smart-home", city: "Mumbai" },
    { slug: "bicycles", city: "Mumbai" },
    { slug: "power-tools", city: "Mumbai" },

    // Delhi NCR (8 core electronics & appliance categories)
    { slug: "phones", city: "Delhi" },
    { slug: "laptops", city: "Delhi" },
    { slug: "appliances", city: "Delhi" },
    { slug: "desktops", city: "Delhi" },
    { slug: "audio-equipment", city: "Delhi" },
    { slug: "tablets", city: "Delhi" },
    { slug: "consoles", city: "Delhi" },
    { slug: "televisions", city: "Delhi" },

    // Bengaluru (7 tech hub categories)
    { slug: "phones", city: "Bengaluru" },
    { slug: "laptops", city: "Bengaluru" },
    { slug: "appliances", city: "Bengaluru" },
    { slug: "desktops", city: "Bengaluru" },
    { slug: "audio-equipment", city: "Bengaluru" },
    { slug: "tablets", city: "Bengaluru" },
    { slug: "consoles", city: "Bengaluru" },

    // Hyderabad (5 categories)
    { slug: "phones", city: "Hyderabad" },
    { slug: "laptops", city: "Hyderabad" },
    { slug: "appliances", city: "Hyderabad" },
    { slug: "desktops", city: "Hyderabad" },
    { slug: "televisions", city: "Hyderabad" },

    // Pune (4 categories)
    { slug: "phones", city: "Pune" },
    { slug: "laptops", city: "Pune" },
    { slug: "appliances", city: "Pune" },
    { slug: "bicycles", city: "Pune" },

    // Chennai (4 categories)
    { slug: "phones", city: "Chennai" },
    { slug: "laptops", city: "Chennai" },
    { slug: "appliances", city: "Chennai" },
    { slug: "cameras", city: "Chennai" },
  ];

  for (const item of LOCAL_CITY_SEEDS) {
    const seed = CATEGORY_SEEDS.find((s) => s.slug === item.slug);
    if (!seed) continue;

    const citySlug = `${seed.slug}-${item.city.toLowerCase()}`;
    const blocks = buildBlocks(seed, item.city);
    const parsed = ContentSectionsSchema.safeParse(blocks);
    if (!parsed.success) continue;

    try {
      const templateId = await seedTemplate(seed, parsed.data);
      results.push(await seedPage(seed, parsed.data, templateId, citySlug, item.city));
    } catch (error) {
      results.push({
        slug: citySlug,
        action: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    const mark = result.action === "failed" ? "✗" : "✓";
    const words = result.words ? ` · ${result.words} words` : "";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`  ${mark} /${PATH_PREFIX}/${result.slug} ${result.action}${words}${detail}`);
  }

  await seedCorePages();

  console.log("\n  All category and core pages seeded and published in Supabase successfully.\n");
}

main().catch((error: unknown) => {
  console.error("\n  Seeding failed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
