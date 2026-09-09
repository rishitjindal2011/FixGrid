export interface FaqItem {
  id: string;
  question: string;
  shortAnswer: string;
  detailedPoints?: string[];
  citation?: string;
}

export const HOME_FAQS: FaqItem[] = [
  {
    id: "what-is-fixgrid",
    question: "What is FixGrid and how does it verify local repair shops in India?",
    shortAnswer:
      "FixGrid is India's verified local electronics and appliance repair network. Every listed technician undergoes physical workshop verification, address and tooling checks, and agrees to platform-backed escrow terms and 5-day minimum warranties.",
    detailedPoints: [
      "Physical bench inspection: Workshop address, diagnostic equipment, and technician credentials are independently verified.",
      "Zero unverified listings: No fabricated ratings, paid promotion, or unconfirmed shopfronts.",
      "Live operational status: Real-time opening hours and shop status updated per timezone and daily schedule.",
    ],
    citation: "Verified across Delhi NCR, Mumbai, Bengaluru, Pune, Hyderabad, and Chennai.",
  },
  {
    id: "how-escrow-works",
    question: "How does FixGrid smart escrow protect customers from repair fraud and overcharging?",
    shortAnswer:
      "FixGrid smart escrow holds customer payment in a secure escrow account before repair begins. Funds are released to the technician only after the repair is completed, tested, and approved by the customer, eliminating advance payment risks.",
    detailedPoints: [
      "0% upfront risk: Technicians quote an itemized cost upfront before touching circuit components.",
      "Customer release gate: You inspect the working device before authorizing payout release.",
      "Dispute protection: If a repair fails or does not match the quote, escrow funds are protected by our mediation framework.",
    ],
  },
  {
    id: "diagnostic-standards",
    question: "What diagnostic standards and tools are used by verified FixGrid repair shops?",
    shortAnswer:
      "Verified FixGrid technicians use professional bench diagnostic equipment including regulated DC power supplies, high-precision multimeters, thermal cameras, and stereoscopic inspection microscopes to isolate board-level faults before quoting.",
    detailedPoints: [
      "Component-level fault isolation: Pinpoint shorted MLCC capacitors, broken traces, and failing ICs without damaging sensitive silicon.",
      "Photographic fault proof: High-resolution macro photos of defective parts sent directly to your phone for complete transparency.",
      "Tamper-proof digital passport: Recorded test results and digital warranty tokens tracked directly through your booking dashboard.",
    ],
  },
  {
    id: "warranty-terms",
    question: "What warranty is provided on device and appliance repairs through FixGrid?",
    shortAnswer:
      "All eligible repairs booked through FixGrid include a 5-day platform-backed guarantee plus the individual technician's extended warranty (typically 30 to 90 days on replacement parts and labor), tracked digitally through your booking reference.",
    detailedPoints: [
      "Digital warranty passport: Recorded digitally in your customer dashboard with tamper-evident QR verification.",
      "No paper slips lost: Claim warranty directly online by referencing your booking token.",
      "Covers parts and craftsmanship: Protects against premature component failure and installation defects.",
    ],
  },
  {
    id: "device-unrepairable",
    question: "What happens if a technician cannot diagnose or repair my device?",
    shortAnswer:
      "If a device is deemed beyond economic repair or parts cannot be sourced, your smart escrow deposit is released back to you in accordance with the diagnostic policy, with no hidden labor markups or surprise surcharges.",
    detailedPoints: [
      "Transparent diagnostic fee: Clear, pre-communicated inspection terms with zero inflated labor surprises.",
      "Preservation of original hardware: Technicians return intact components with complete diagnostic logs.",
      "Honest assessment: Technicians explain why repair is unfeasible rather than performing dangerous temporary fixes.",
    ],
  },
  {
    id: "cities-and-categories",
    question: "Which cities and electronics categories are covered across India?",
    shortAnswer:
      "FixGrid covers 72 metropolitan clusters and diagnostic specialties across Delhi NCR (Delhi, Noida, Gurugram, Ghaziabad), Mumbai, Bengaluru, Pune, Hyderabad, and Chennai, servicing smartphones, laptops, MacBooks, gaming consoles, inverter PCBs, and home appliances.",
    detailedPoints: [
      "Electronics: Smartphones, iPhones, MacBooks, Windows laptops, desktop PCs, iPads, tablets, and gaming consoles (PS5, Xbox).",
      "Home appliances: Inverter AC PCB motherboards, refrigerators, washing machines, microwaves, and power supplies.",
      "Specialty gear: Drones, camera lenses, mechanical keyboards, audio amplifiers, and precision wearables.",
    ],
  },
  {
    id: "technician-onboarding",
    question: "How can local independent repair shops join the FixGrid verified network?",
    shortAnswer:
      "Professional repair shop owners apply through the FixGrid partner portal. After identity verification, bench tooling review, and background vetting, verified shops receive digital storefronts, diagnostic tools, and earn 5% cashback on completed jobs.",
    detailedPoints: [
      "One-time onboarding verification: Strict vetting protects network trust; rejected applicants are refunded.",
      "5% completion rebate: FixGrid shares value back with craftspeople on every verified invoice.",
      "Pro diagnostics & storefront: Direct customer bookings, calendar management, and shopfront analytics.",
    ],
  },
];
