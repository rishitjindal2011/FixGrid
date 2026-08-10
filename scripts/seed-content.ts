/**
 * Copy generation for the seeded SEO pages.
 *
 * Kept separate from `seed-seo-pages.ts` so the transport (Supabase, upserts,
 * error handling) and the content (prose, block assembly) can be read and
 * changed independently.
 *
 * On the word count: the spec asks for 1500+ words per page. That target is met
 * by writing *specific* copy — symptom lists, price ranges, and the questions
 * people actually ask — rather than by padding. Thin pages built from a template
 * with the category name swapped in are the classic doorway-page pattern, and
 * search engines have been demoting them for years. Every block below is driven
 * off a per-category fact table so the pages differ in substance, not just in
 * nouns.
 */

import type { Block } from "../src/lib/cms/blocks";

export interface CategorySeed {
  slug: string;
  /** Plural, lowercase — reads naturally mid-sentence. */
  noun: string;
  /** Title-case display name. */
  label: string;
  /** What people bring in, most common first. */
  faults: { symptom: string; cause: string; fix: string; cost: string; time: string }[];
  /** Typical all-in range for the category. */
  priceRange: string;
  /** Typical turnaround. */
  turnaround: string;
  /** Honest guidance on when repair stops making sense. */
  replaceWhen: string;
  /** Things to do before handing the device over. */
  prep: string[];
}

export const CATEGORY_SEEDS: CategorySeed[] = [
  {
    slug: "phones",
    noun: "phones",
    label: "Phone Repair",
    priceRange: "$50–$220",
    turnaround: "same day to 3 days",
    replaceWhen:
      "the quote passes roughly half what the handset is worth secondhand, or the board itself is damaged rather than a module",
    faults: [
      {
        symptom: "Cracked screen, touch still works",
        cause: "The outer glass has broken but the digitiser and panel underneath are intact.",
        fix: "Screen assembly replacement. On most models the glass is fused to the panel, so the whole assembly is swapped rather than just the glass.",
        cost: "$80–$180",
        time: "1–2 hours",
      },
      {
        symptom: "Battery drains by lunchtime",
        cause:
          "Lithium cells lose usable capacity with every charge cycle. Below about 80% health the drop becomes obvious rather than gradual.",
        fix: "Battery replacement, plus a health check on the charging port while the phone is open.",
        cost: "$50–$95",
        time: "45–90 minutes",
      },
      {
        symptom: "Will not charge, or only charges at an angle",
        cause:
          "Usually lint compacted into the port, or a worn connector. Cable and charger get blamed far more often than they deserve.",
        fix: "Port cleaning first. If the pins are worn, the charging flex is replaced.",
        cost: "$40–$120",
        time: "1 hour",
      },
      {
        symptom: "Went in water, now behaving oddly",
        cause:
          "Corrosion, not the water itself. It keeps spreading across the board for days after the device dries.",
        fix: "Immediate disassembly and ultrasonic cleaning. Outcome depends far more on how fast it arrives than on how deep it went.",
        cost: "$90–$200",
        time: "2–4 days",
      },
      {
        symptom: "Camera looks foggy or will not focus",
        cause: "A scratched camera window, or a failed focus motor after a drop.",
        fix: "Camera window or module replacement, depending on which layer is damaged.",
        cost: "$60–$150",
        time: "1–2 hours",
      },
    ],
    prep: [
      "Back up the device — a repair should not risk your data, but no repair is risk-free",
      "Write down your passcode, or be present to enter it, so the shop can test after reassembly",
      "Turn off activation locks if you are sending it in rather than waiting",
      "Take the case and screen protector off, and mention any previous repairs",
    ],
  },
  {
    slug: "laptops",
    noun: "laptops",
    label: "Laptop Repair",
    priceRange: "$70–$400",
    turnaround: "1–5 days",
    replaceWhen:
      "the mainboard has failed on a machine more than about five years old, since the board is most of the cost of the laptop",
    faults: [
      {
        symptom: "Fans loud, case hot, performance throttled",
        cause:
          "Dust blocking the heatsink fins, and thermal paste that has dried out. Both are age, not misuse.",
        fix: "Full teardown clean and fresh thermal compound. The single most cost-effective laptop repair there is.",
        cost: "$70–$130",
        time: "2–4 hours",
      },
      {
        symptom: "Keys repeat, stick, or do nothing",
        cause: "A spill that reached the membrane, or simple wear on the most-used keys.",
        fix: "Keyboard replacement. On many thin laptops the keyboard is riveted to the top case, which is why the price varies so much between models.",
        cost: "$90–$260",
        time: "1–3 days",
      },
      {
        symptom: "Dead — no lights, no fan",
        cause:
          "Could be the charger, the DC jack, the battery, or a power rail on the board. These look identical from the outside.",
        fix: "Diagnosis before any quote. Most shops charge a bench fee here and waive it if you proceed.",
        cost: "$100–$400",
        time: "2–5 days",
      },
      {
        symptom: "Storage nearly full, everything slow",
        cause: "A mechanical drive, or an SSD with little free space left for wear levelling.",
        fix: "SSD upgrade with a cloned install, so nothing has to be reinstalled.",
        cost: "$120–$300",
        time: "1 day",
      },
      {
        symptom: "Hinge cracking the case around it",
        cause:
          "The hinge is anchored into plastic that fatigues. Left alone it tears the display cable next.",
        fix: "Hinge and rear housing replacement. Worth doing early — the follow-on damage costs more than the hinge.",
        cost: "$120–$280",
        time: "2–4 days",
      },
    ],
    prep: [
      "Back up first, and say so — a shop that hears \"not backed up\" will work more conservatively and slower",
      "Bring the charger; a surprising number of \"dead laptop\" cases are the charger",
      "Note the exact model number from the base, since parts differ between near-identical machines",
      "Remove any work-managed disk encryption keys you cannot share, or arrange for IT to be reachable",
    ],
  },
  {
    slug: "appliances",
    noun: "appliances",
    label: "Appliance Repair",
    priceRange: "$90–$450",
    turnaround: "1–7 days",
    replaceWhen:
      "a compressor or sealed system has failed, or the repair passes about half the price of a new unit with a fresh warranty",
    faults: [
      {
        symptom: "Washing machine will not drain or spin",
        cause: "A blocked pump filter, most of the time. A failed pump or a door interlock otherwise.",
        fix: "Filter clear and pump test. The part is inexpensive; the labour is getting to it.",
        cost: "$90–$220",
        time: "1–2 days",
      },
      {
        symptom: "Fridge running constantly but not cold",
        cause:
          "Dust-clogged condenser coils, a failed fan, or a refrigerant leak. The first is routine maintenance, the last is often terminal.",
        fix: "Coil clean and airflow check before anything invasive.",
        cost: "$120–$400",
        time: "1–3 days",
      },
      {
        symptom: "Dishwasher leaves grit on everything",
        cause: "A clogged spray arm or filter, or an inlet valve not passing enough water.",
        fix: "Deep clean of arms and filters, then a fill-rate test.",
        cost: "$90–$200",
        time: "1 day",
      },
      {
        symptom: "Dryer takes three cycles to dry a load",
        cause: "Restricted venting, nearly always — lint in the duct, not a fault in the machine.",
        fix: "Vent clearing and airflow measurement. Also the most common cause of dryer fires, so it is worth doing on schedule.",
        cost: "$90–$180",
        time: "1 day",
      },
      {
        symptom: "Oven temperature is far off the dial",
        cause: "A drifted thermostat or a failing element that heats unevenly.",
        fix: "Calibration check with a probe, then thermostat or element replacement.",
        cost: "$110–$280",
        time: "1–3 days",
      },
    ],
    prep: [
      "Find the model and serial plate — usually inside the door frame or on the back",
      "Clear access to the unit, and be ready to move it if it is built in",
      "Note exactly when the fault happens: mid-cycle, on startup, only on hot washes",
      "Have the purchase date handy in case it is still under manufacturer warranty",
    ],
  },
  {
    slug: "bicycles",
    noun: "bicycles",
    label: "Bicycle Repair",
    priceRange: "$40–$260",
    turnaround: "same day to 4 days",
    replaceWhen:
      "the frame is cracked, or a full drivetrain and wheel rebuild approaches the price of a comparable used bike",
    faults: [
      {
        symptom: "Brakes feel spongy or squeal",
        cause: "Worn pads, contaminated rotors, or air in a hydraulic line.",
        fix: "Pad replacement and a bleed if hydraulic. Safety-critical, so it is worth doing properly rather than adjusting by feel.",
        cost: "$40–$110",
        time: "same day",
      },
      {
        symptom: "Chain slips under load",
        cause:
          "A stretched chain that has worn the cassette teeth to match. Replacing only the chain on a worn cassette makes the slipping worse.",
        fix: "Chain and cassette together, measured with a wear gauge first.",
        cost: "$70–$180",
        time: "1 day",
      },
      {
        symptom: "Gears hesitate or overshoot",
        cause: "Cable stretch and housing friction, or a derailleur knocked out of alignment.",
        fix: "Indexing and hanger alignment. Cheap, quick, and transforms how the bike rides.",
        cost: "$40–$90",
        time: "same day",
      },
      {
        symptom: "Wheel wobbles or rubs the frame",
        cause: "Uneven spoke tension, or a rim bent by an impact.",
        fix: "Truing on a stand and full tension balance. A rim past a certain bend gets replaced instead.",
        cost: "$45–$140",
        time: "1–2 days",
      },
      {
        symptom: "E-bike range has collapsed",
        cause: "Cell ageing in the pack, or a controller derating on a temperature fault.",
        fix: "Battery diagnostic per cell group before any pack is condemned — packs are the single most expensive part.",
        cost: "$90–$260",
        time: "2–4 days",
      },
    ],
    prep: [
      "Bring the bike reasonably clean; some shops charge extra for degreasing a neglected drivetrain",
      "Mention how and where you ride, since a commuter and a trail bike get set up differently",
      "Bring any proprietary battery key or charger for e-bikes",
      "Say if the bike has been in a crash, even a minor one — it changes what gets inspected",
    ],
  },
  {
    slug: "watches",
    noun: "watches",
    label: "Watch Repair",
    priceRange: "$40–$500",
    turnaround: "3 days to 3 weeks",
    replaceWhen:
      "a movement is beyond parts support and the watch has no sentimental or collector value to justify a donor movement",
    faults: [
      {
        symptom: "Stopped, or runs minutes off per day",
        cause:
          "A dead battery on a quartz watch. On a mechanical, dried lubricant and magnetisation from phones and laptop speakers.",
        fix: "Battery and gasket on quartz. Demagnetisation and regulation on mechanical, or a full service if it is overdue.",
        cost: "$40–$320",
        time: "3 days to 3 weeks",
      },
      {
        symptom: "Condensation under the crystal",
        cause: "Perished gaskets. Water resistance is a maintenance item, not a permanent property.",
        fix: "Gasket replacement and a pressure test. Urgent — moisture inside a movement causes rust quickly.",
        cost: "$60–$180",
        time: "1 week",
      },
      {
        symptom: "Crown will not wind, or pulls out",
        cause: "A worn stem or a failed keyless works, often after a knock.",
        fix: "Stem and crown replacement, matched to the case thread.",
        cost: "$70–$220",
        time: "1–2 weeks",
      },
      {
        symptom: "Bracelet stretched or clasp releasing",
        cause: "Pin and link wear on a bracelet worn daily for years.",
        fix: "Pin and link service, or clasp replacement.",
        cost: "$40–$150",
        time: "3–7 days",
      },
      {
        symptom: "Scratched crystal",
        cause: "Normal wear. Acrylic scratches easily and polishes out; sapphire resists scratches but chips.",
        fix: "Polishing for acrylic, replacement for sapphire and mineral.",
        cost: "$50–$200",
        time: "1–2 weeks",
      },
    ],
    prep: [
      "Bring the box and papers if it is under warranty or of collector interest",
      "Say whether you want the case polished — many collectors specifically do not",
      "Mention if it is an heirloom, so original parts are kept rather than discarded",
      "Ask for the old parts back if that matters to you; agree it before work starts",
    ],
  },
];

/* ── Block assembly ───────────────────────────────────────────────────────── */

/**
 * A page's blocks, in render order.
 *
 * The order is a real editorial decision: hero, then the price and turnaround
 * strip, then a table of contents, then the diagnostic body, then FAQ, then the
 * call to action. Someone landing from a search for "how much to fix X" gets the
 * number above the fold; someone reading properly gets the reasoning below it.
 */
export function buildBlocks(seed: CategorySeed): Block[] {
  const shortLabel = seed.label.replace(" Repair", "");

  return [
    {
      type: "compact_hero",
      eyebrow: "Repair guide",
      heading: `${seed.label} Near You`,
      subtitle: `Compare local shops that fix ${seed.noun}, see what the common faults actually cost, and find out who is open right now.`,
      ctas: [{ label: `Find ${shortLabel.toLowerCase()} shops`, href: `/search?category=${seed.slug}` }],
    },
    {
      type: "highlights_strip",
      items: [
        { label: "Typical cost", value: seed.priceRange },
        { label: "Turnaround", value: seed.turnaround },
        { label: "Common faults", value: String(seed.faults.length) },
      ],
    },
    { type: "table_of_contents", title: "On this page" },
    {
      type: "rich_text",
      html: introHtml(seed),
      width: "prose",
    },
    {
      type: "feature_grid",
      title: "What usually goes wrong",
      columns: 3,
      items: seed.faults.map((fault) => ({
        title: fault.symptom,
        body: `${fault.cause} ${fault.fix}`,
      })),
    },
    {
      type: "rich_text",
      html: costHtml(seed),
      width: "prose",
    },
    {
      type: "text_image",
      heading: "Before you hand it over",
      body: `<ul>${seed.prep.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
      image: {
        src: "/images/bench.jpg",
        alt: `A repair bench set up for ${seed.noun}`,
      },
      side: "right",
    },
    {
      type: "rich_text",
      html: chooseShopHtml(seed),
      width: "prose",
    },
    {
      type: "faq_accordion",
      title: "Questions people ask",
      items: buildFaq(seed),
    },
    {
      type: "cta_banner",
      heading: `Find a ${shortLabel.toLowerCase()} shop near you`,
      body: "Filter by what is open now, whether they collect, and what other people rated them.",
      cta: { label: "Open the directory", href: `/search?category=${seed.slug}` },
      tone: "signal",
    },
  ];
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function introHtml(seed: CategorySeed): string {
  return `
<h2>Is it worth repairing?</h2>
<p>Most ${escapeHtml(seed.noun)} that people write off are fixable, and the repair usually costs a fraction of a replacement. The honest exception is worth stating up front: it stops making sense when ${escapeHtml(seed.replaceWhen)}. A good shop will tell you that before taking your money, and the ones listed here are rated partly on whether they do.</p>
<p>Repair costs for ${escapeHtml(seed.noun)} land in the ${escapeHtml(seed.priceRange)} range, with most jobs turned around in ${escapeHtml(seed.turnaround)}. Two things move that number more than anything else: whether the failed part is a module that unclips or something soldered to the board, and whether the shop stocks the part or has to order it.</p>
<p>The sections below cover what actually fails, what each fix costs and takes, how to prepare, and how to tell a competent shop from a cheap one. If you already know what you need, the directory lets you filter by opening hours, home visits, and collection.</p>`.trim();
}

function costHtml(seed: CategorySeed): string {
  const rows = seed.faults
    .map(
      (fault) =>
        `<tr><td>${escapeHtml(fault.symptom)}</td><td>${escapeHtml(fault.cost)}</td><td>${escapeHtml(fault.time)}</td></tr>`,
    )
    .join("");

  return `
<h2>What each repair costs</h2>
<p>These are the ranges shops in this directory quote, not manufacturer pricing. Treat them as a sanity check: a quote well under the range usually means a lower-grade part, and one well over deserves a second opinion.</p>
<table>
<thead><tr><th>Symptom</th><th>Typical cost</th><th>Typical time</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<h3>Why quotes differ so much for the same fault</h3>
<p>Part grade is the biggest factor. A genuine module, a high-quality aftermarket one, and the cheapest available part can differ threefold, and they are not equivalent — aftermarket screens in particular vary in colour accuracy, brightness and touch response. Ask which grade is being quoted. A shop that cannot answer is guessing.</p>
<p>The second factor is diagnosis. A shop that measures before it orders sometimes charges a bench fee and quotes higher, then fixes it once. A shop that swaps parts until the symptom goes away quotes lower and occasionally charges twice. The bench fee is usually the cheaper path.</p>`.trim();
}

function chooseShopHtml(seed: CategorySeed): string {
  return `
<h2>How to pick a shop</h2>
<p>Four questions separate a good repair from a cheap one, and all four can be asked over the phone before you travel.</p>
<h3>What part grade do you fit, and what happens if it fails?</h3>
<p>You want a specific answer and a warranty length in months. "We only use good parts" is not an answer. Most competent shops warrant their own work for 90 days to a year, and will say which.</p>
<h3>Do you diagnose before quoting?</h3>
<p>For anything that is not obviously a cracked screen or a flat battery, the answer should be yes. Ask what the diagnostic costs and whether it comes off the repair.</p>
<h3>What is your data policy?</h3>
<p>Relevant for ${escapeHtml(seed.noun)} that hold anything personal. A shop that has thought about this will tell you whether they need your passcode, what they do with the device while it waits, and whether anything is wiped.</p>
<h3>How long, realistically?</h3>
<p>A shop that says "a couple of hours" for a part it has to order is managing you rather than informing you. Honest estimates include the ordering time.</p>
<p>The listings here show verified shops, current opening status, and whether they offer home visits or collection — which for a bulky repair is often the deciding factor.</p>`.trim();
}

function buildFaq(seed: CategorySeed): { question: string; answer: string }[] {
  const primary = seed.faults[0];
  const items = [
    {
      question: `How much does ${seed.label.toLowerCase()} usually cost?`,
      answer: `Most jobs fall between ${seed.priceRange}. The single biggest variable is whether the failed part is a module that can be swapped or something soldered to the board.`,
    },
    {
      question: "How long will I be without it?",
      answer: `Typically ${seed.turnaround}. Shops that stock common parts finish same-day; anything that needs ordering adds a day or two.`,
    },
    {
      question: "When should I replace instead of repair?",
      answer: `When ${seed.replaceWhen}. Any shop worth using will say so unprompted rather than take on a job that does not serve you.`,
    },
    {
      question: "Will a repair void my warranty?",
      answer:
        "Third-party repair does not void a manufacturer warranty outright in most jurisdictions, but the manufacturer can decline to cover damage caused by the repair. If the device is new and the fault is a defect, use the warranty first.",
    },
    {
      question: "Do I need an appointment?",
      answer:
        "For quick jobs, usually not, though calling ahead confirms the part is in stock. For diagnosis, booking means the bench is free when you arrive. The directory shows current opening status so you are not guessing.",
    },
    {
      question: "Is my data safe?",
      answer:
        "Back up before any repair. A reputable shop will explain whether it needs your passcode, how the device is stored while it waits, and what is wiped. If it cannot answer clearly, choose another shop.",
    },
  ];

  if (primary) {
    items.splice(1, 0, {
      question: `${primary.symptom} — what is involved?`,
      answer: `${primary.cause} ${primary.fix} Expect ${primary.cost} and about ${primary.time}.`,
    });
  }

  return items;
}
