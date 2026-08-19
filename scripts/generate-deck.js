const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Initialize presentation
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10.0" x 5.625"
pres.author = 'Rishit Jindal';
pres.title = 'FixGrid — Hackathon Pitch Deck';

// Palette constants (NO '#' prefix, 6 hex chars)
const BG_DARK = '08090E';        // Deep Midnight Slate
const CARD_BG = '151B26';        // Frosted Surface
const CARD_BORDER = '243042';    // Subtle Border
const TEXT_WHITE = 'F8FAFC';     // Primary Text
const TEXT_MUTED = '94A3B8';     // Muted Slate Text
const ACCENT_INDIGO = '6366F1';  // Electric Indigo
const ACCENT_CYAN = '06B6D4';    // Neon Cyan
const ACCENT_EMERALD = '10B981'; // Vibrant Emerald
const ACCENT_CORAL = 'EF4444';   // Crimson / Alert
const FONT_HEADING = 'Arial';
const FONT_BODY = 'Calibri';

// Helper: add background & header to slide
function createBaseSlide(categoryBadge, mainTitle, subtitle) {
  const slide = pres.addSlide();
  
  // Background
  slide.background = { color: BG_DARK };
  
  // Top category badge
  if (categoryBadge) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 0.4, w: 2.2, h: 0.28,
      fill: { color: '1E293B' },
      line: { color: ACCENT_CYAN, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(categoryBadge.toUpperCase(), {
      x: 0.6, y: 0.4, w: 2.2, h: 0.28,
      fontSize: 8.5, bold: true, color: ACCENT_CYAN,
      align: 'center', valign: 'middle', fontFace: FONT_HEADING, margin: 0
    });
  }

  // Header Title
  if (mainTitle) {
    slide.addText(mainTitle, {
      x: 0.6, y: 0.72, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });
  }

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 1.18, w: 8.8, h: 0.3,
      fontSize: 11, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  }

  return slide;
}

// -------------------------------------------------------------
// SLIDE 1: Title & Hero (Modern 60/40 Split)
// -------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: BG_DARK };

  // Left Hero Side (60%)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.8, w: 2.2, h: 0.3,
    fill: { color: '1E293B' },
    line: { color: ACCENT_CYAN, width: 1 },
    rectRadius: 0.1
  });
  slide.addText('HACKATHON 2026 PITCH', {
    x: 0.8, y: 0.8, w: 2.2, h: 0.3,
    fontSize: 9, bold: true, color: ACCENT_CYAN,
    align: 'center', valign: 'middle', fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('FixGrid.', {
    x: 0.8, y: 1.25, w: 5.2, h: 1.0,
    fontSize: 48, bold: true, color: TEXT_WHITE,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('The Trust Infrastructure for the\n$15B Local Repair Economy', {
    x: 0.8, y: 2.35, w: 5.0, h: 0.9,
    fontSize: 18, bold: true, color: ACCENT_INDIGO,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Transforming fragmented neighbourhood repairs into a verified, escrow-backed, and guaranteed service network.', {
    x: 0.8, y: 3.35, w: 4.8, h: 0.8,
    fontSize: 12.5, color: TEXT_MUTED,
    fontFace: FONT_BODY, margin: 0
  });

  slide.addText('Presenter: Rishit Jindal  •  Live Working Prototype', {
    x: 0.8, y: 4.5, w: 4.8, h: 0.3,
    fontSize: 11, bold: true, color: ACCENT_EMERALD,
    fontFace: FONT_BODY, margin: 0
  });

  // Right Bento Cards (40%)
  const cards = [
    { title: '90-Day Guaranteed Warranty', desc: 'Platform-backed legal protection on every completed repair job.', color: ACCENT_EMERALD, y: 0.8, icon: '✓' },
    { title: 'Smart Escrow Safety', desc: 'Technicians are paid only after customer confirms device is working.', color: ACCENT_INDIGO, y: 2.2, icon: '🔒' },
    { title: '100% Verified Local Experts', desc: 'Multi-point background checks, GST registration & workshop audits.', color: ACCENT_CYAN, y: 3.6, icon: '📍' }
  ];

  cards.forEach(card => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.9, y: card.y, w: 3.4, h: 1.25,
      fill: { color: CARD_BG },
      line: { color: card.color, width: 1.5 },
      rectRadius: 0.12
    });

    slide.addText(`${card.icon}  ${card.title}`, {
      x: 6.1, y: card.y + 0.15, w: 3.0, h: 0.35,
      fontSize: 12, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(card.desc, {
      x: 6.1, y: card.y + 0.52, w: 3.0, h: 0.6,
      fontSize: 10, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`Judges, imagine your laptop or phone screen breaks today. What are your options? You either visit an unverified local shop with zero guarantee, or deal with expensive aggregators. I am Rishit Jindal, and we built FixGrid—the trust-first marketplace connecting consumers with verified local repair experts, backed by guaranteed warranties and escrow payments.`);
}

// -------------------------------------------------------------
// SLIDE 2: The Problem (Bento Grid of Frustrations)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'THE PROBLEM',
    'The $15B Repair Market is Fundamentally Broken',
    'Why 78% of consumers delay essential device and appliance repairs'
  );

  // Left Big Card (Dominant)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.6, w: 4.3, h: 3.45,
    fill: { color: CARD_BG },
    line: { color: ACCENT_CORAL, width: 1.5 },
    rectRadius: 0.12
  });

  slide.addText('0 DAYS', {
    x: 0.9, y: 1.85, w: 3.7, h: 0.65,
    fontSize: 34, bold: true, color: ACCENT_CORAL,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Zero Warranty & Zero Accountability', {
    x: 0.9, y: 2.55, w: 3.7, h: 0.35,
    fontSize: 14, bold: true, color: TEXT_WHITE,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Consumers hand over ₹80,000+ smartphones and laptops with zero formal protection.\n\nIf a replaced screen or part glitches 24 hours later, the customer loses 100% of their money. Incumbents offer no transparent warranty on public pages.', {
    x: 0.9, y: 2.95, w: 3.7, h: 1.9,
    fontSize: 11, color: TEXT_MUTED,
    fontFace: FONT_BODY, margin: 0
  });

  // Right Stacked Card 1
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 1.6, w: 4.3, h: 1.6,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1 },
    rectRadius: 0.12
  });

  slide.addText('⚠️  The Price Haggling Trap', {
    x: 5.35, y: 1.8, w: 3.8, h: 0.3,
    fontSize: 13, bold: true, color: TEXT_WHITE,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Arbitrary diagnostic inspection fees, unverified part markups, and aggressive on-site price changes force consumers into uncomfortable haggling.', {
    x: 5.35, y: 2.15, w: 3.8, h: 0.9,
    fontSize: 10.5, color: TEXT_MUTED,
    fontFace: FONT_BODY, margin: 0
  });

  // Right Stacked Card 2
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.1, y: 3.4, w: 4.3, h: 1.65,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1 },
    rectRadius: 0.12
  });

  slide.addText('🛡️  Safety & Quality Anxiety', {
    x: 5.35, y: 3.6, w: 3.8, h: 0.3,
    fontSize: 13, bold: true, color: TEXT_WHITE,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Consumers have zero standardized vetting for who is handling their private digital devices or entering their homes for appliance repairs.', {
    x: 5.35, y: 3.95, w: 3.8, h: 0.9,
    fontSize: 10.5, color: TEXT_MUTED,
    fontFace: FONT_BODY, margin: 0
  });

  slide.addNotes(`Today, getting repairs done is stressful. Consumers face zero warranty protection, aggressive price inflation on the spot, and complete anxiety over unvetted technicians. Over 78% of people delay repairs because trust is completely broken.`);
}

// -------------------------------------------------------------
// SLIDE 3: The Solution (3 Hero Value Pillars)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'THE SOLUTION',
    'FixGrid: Trust as a Service',
    'Turning independent neighbourhood repair shops into a trusted, guaranteed network'
  );

  const pillars = [
    {
      badge: 'FOR CONSUMERS',
      title: 'Guaranteed 30–90D Warranty',
      color: ACCENT_EMERALD,
      points: [
        'Mandatory warranty on every service',
        'Automated digital warranty certificate',
        'Instant platform dispute & redo guarantee'
      ]
    },
    {
      badge: 'TRANSACTION INTEGRITY',
      title: 'Smart Escrow Payments',
      color: ACCENT_INDIGO,
      points: [
        'Zero upfront cash leakage',
        'Funds held in platform escrow during fix',
        'Released only upon customer verification'
      ]
    },
    {
      badge: 'QUALITY & SAFETY',
      title: 'Certified Local Experts',
      color: ACCENT_CYAN,
      points: [
        'Multi-point KYC (GST, ID, Store audits)',
        'Reviews tied strictly to verified jobs',
        'Community trust & skill scoring'
      ]
    }
  ];

  pillars.forEach((p, idx) => {
    const xPos = 0.6 + idx * 3.05;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.6, w: 2.85, h: 3.45,
      fill: { color: CARD_BG },
      line: { color: p.color, width: 1.5 },
      rectRadius: 0.12
    });

    // Badge
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.2, y: 1.85, w: 2.45, h: 0.28,
      fill: { color: '1E293B' },
      line: { color: p.color, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(p.badge, {
      x: xPos + 0.2, y: 1.85, w: 2.45, h: 0.28,
      fontSize: 8.5, bold: true, color: p.color,
      align: 'center', valign: 'middle', fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(p.title, {
      x: xPos + 0.2, y: 2.25, w: 2.45, h: 0.6,
      fontSize: 14, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    p.points.forEach((pt, pIdx) => {
      slide.addText(`•  ${pt}`, {
        x: xPos + 0.2, y: 2.95 + pIdx * 0.65, w: 2.45, h: 0.55,
        fontSize: 10.5, color: TEXT_MUTED,
        fontFace: FONT_BODY, margin: 0
      });
    });
  });

  slide.addNotes(`FixGrid turns trust into the product. Every repair has a mandatory 30 to 90 day warranty, payments are held safely in escrow until the customer signs off, and every technician undergoes multi-point physical verification.`);
}

// -------------------------------------------------------------
// SLIDE 4: How It Works (4-Step Seamless User Journey)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'USER EXPERIENCE',
    'How FixGrid Works: From Broken to Fixed in 4 Steps',
    'A seamless, friction-free journey engineered for total customer peace of mind'
  );

  const steps = [
    { num: '01', title: 'Discover Nearby', desc: 'Browse verified repair shops on an interactive map filtered by warranty floor and ratings.', color: ACCENT_CYAN },
    { num: '02', title: 'Upfront Quote', desc: 'Receive transparent diagnostic & repair estimates with zero hidden fees.', color: ACCENT_INDIGO },
    { num: '03', title: 'Escrow Booking', desc: 'One-tap UPI booking. Payment is locked securely in platform escrow during work.', color: ACCENT_EMERALD },
    { num: '04', title: 'Guaranteed Fix', desc: 'Device returned fixed, digital warranty active, funds released to technician.', color: ACCENT_INDIGO }
  ];

  steps.forEach((s, idx) => {
    const xPos = 0.6 + idx * 2.28;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.65, w: 2.15, h: 3.35,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.12
    });

    slide.addText(s.num, {
      x: xPos + 0.2, y: 1.85, w: 1.75, h: 0.55,
      fontSize: 26, bold: true, color: s.color,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(s.title, {
      x: xPos + 0.2, y: 2.45, w: 1.75, h: 0.5,
      fontSize: 13, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(s.desc, {
      x: xPos + 0.2, y: 3.05, w: 1.75, h: 1.7,
      fontSize: 10, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`The customer journey is simple: discover local shops on a live map, get transparent upfront quotes, pay securely with escrow via UPI, and receive guaranteed completion with a digital warranty.`);
}

// -------------------------------------------------------------
// SLIDE 5: Technician Economics (Why Shops Love Us)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'SUPPLY ADVANTAGE',
    'Empowering Local Technicians, Not Exploiting Them',
    'Aligning marketplace incentives so independent shops earn more on-platform'
  );

  // Left Card (The Aggregator Trap)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.65, w: 4.25, h: 3.35,
    fill: { color: CARD_BG },
    line: { color: ACCENT_CORAL, width: 1.5 },
    rectRadius: 0.12
  });

  slide.addText('❌  The Aggregator Trap (Urban Company / Directories)', {
    x: 0.85, y: 1.9, w: 3.75, h: 0.45,
    fontSize: 13, bold: true, color: ACCENT_CORAL,
    fontFace: FONT_HEADING, margin: 0
  });

  const trapPoints = [
    '25%–30% heavy commission deductions',
    'Technicians treated as disposable gig workers',
    'Aggressive pay-per-lead bidding wars with 0 guarantee',
    'No direct customer relationship or repeat business'
  ];
  trapPoints.forEach((pt, idx) => {
    slide.addText(`•  ${pt}`, {
      x: 0.85, y: 2.45 + idx * 0.55, w: 3.75, h: 0.5,
      fontSize: 10.5, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  // Right Card (FixGrid Partner Model)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.15, y: 1.65, w: 4.25, h: 3.35,
    fill: { color: CARD_BG },
    line: { color: ACCENT_EMERALD, width: 1.5 },
    rectRadius: 0.12
  });

  slide.addText('✓  The FixGrid Partner Model', {
    x: 5.4, y: 1.9, w: 3.75, h: 0.45,
    fontSize: 13, bold: true, color: ACCENT_EMERALD,
    fontFace: FONT_HEADING, margin: 0
  });

  const partnerPoints = [
    'Low flat 5–8% platform take-rate',
    '5% Cashback Rebate to shops on verified jobs',
    'Dedicated digital storefront & customer ownership',
    'Free parts inventory & scheduling workbench tools'
  ];
  partnerPoints.forEach((pt, idx) => {
    slide.addText(`•  ${pt}`, {
      x: 5.4, y: 2.45 + idx * 0.55, w: 3.75, h: 0.5,
      fontSize: 10.5, color: TEXT_WHITE,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`Big aggregators exploit technicians with 25-30% cuts. FixGrid offers a fair 5-8% take rate and awards a 5% cashback rebate on verified completed bills, turning technicians into long-term platform partners.`);
}

// -------------------------------------------------------------
// SLIDE 6: Competitive Matrix (The Moat)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'COMPETITIVE MOAT',
    'Why FixGrid Wins: Direct Market Comparison',
    'FixGrid bridges the gap between unvetted directories and expensive aggregators'
  );

  const tableData = [
    [
      { text: 'Feature Matrix', options: { bold: true, color: TEXT_WHITE, fill: { color: '1E293B' }, fontSize: 10.5 } },
      { text: 'FixGrid', options: { bold: true, color: ACCENT_CYAN, fill: { color: '1E293B' }, fontSize: 10.5 } },
      { text: 'Urban Company', options: { bold: true, color: TEXT_MUTED, fill: { color: '1E293B' }, fontSize: 10.5 } },
      { text: 'Justdial / Local', options: { bold: true, color: TEXT_MUTED, fill: { color: '1E293B' }, fontSize: 10.5 } }
    ],
    [
      { text: 'Mandatory Warranty', options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
      { text: '✓  30–90 Days Guaranteed', options: { color: ACCENT_EMERALD, bold: true, fontSize: 9.5 } },
      { text: '✗  Unclear / None', options: { color: ACCENT_CORAL, fontSize: 9.5 } },
      { text: '✗  None', options: { color: ACCENT_CORAL, fontSize: 9.5 } }
    ],
    [
      { text: 'Payment Security', options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
      { text: '✓  Smart Escrow Hold', options: { color: ACCENT_EMERALD, bold: true, fontSize: 9.5 } },
      { text: '⚠️  Full Upfront Charge', options: { color: TEXT_MUTED, fontSize: 9.5 } },
      { text: '✗  Unprotected Cash', options: { color: ACCENT_CORAL, fontSize: 9.5 } }
    ],
    [
      { text: 'Technician Incentive', options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
      { text: '✓  5% Cashback Rebate', options: { color: ACCENT_EMERALD, bold: true, fontSize: 9.5 } },
      { text: '✗  25–30% Heavy Cut', options: { color: ACCENT_CORAL, fontSize: 9.5 } },
      { text: '✗  Costly Lead Bidding', options: { color: ACCENT_CORAL, fontSize: 9.5 } }
    ],
    [
      { text: 'Pricing Transparency', options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
      { text: '✓  Upfront Fixed Quotes', options: { color: ACCENT_EMERALD, bold: true, fontSize: 9.5 } },
      { text: '⚠️  High Markups', options: { color: TEXT_MUTED, fontSize: 9.5 } },
      { text: '✗  Random Haggling', options: { color: ACCENT_CORAL, fontSize: 9.5 } }
    ],
    [
      { text: 'Shop Verification', options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
      { text: '✓  Multi-Point KYC & Badging', options: { color: ACCENT_EMERALD, bold: true, fontSize: 9.5 } },
      { text: '⚠️  Generic Contractors', options: { color: TEXT_MUTED, fontSize: 9.5 } },
      { text: '✗  Zero Vetting', options: { color: ACCENT_CORAL, fontSize: 9.5 } }
    ]
  ];

  slide.addTable(tableData, {
    x: 0.6, y: 1.65, w: 8.8, h: 3.3,
    colW: [2.2, 2.4, 2.1, 2.1],
    border: { color: CARD_BORDER, width: 1 },
    fill: { color: CARD_BG },
    align: 'left',
    valign: 'middle'
  });

  slide.addNotes(`Compared to incumbents, FixGrid wins on verified warranties, smart escrow protection, fair technician rebates, and rigorous multi-point verification.`);
}

// -------------------------------------------------------------
// SLIDE 7: Market Opportunity (TAM / SAM / SOM)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'MARKET OPPORTUNITY',
    'A Massive $15B+ Untapped Market in India',
    'The circular repair economy is surging as device prices rise and replacement cycles lengthen'
  );

  const marketCards = [
    {
      metric: '$15.2 B',
      label: 'TAM — Total Market',
      desc: 'India’s unorganized gadget & home appliance repair market (800M+ smartphones, 150M+ laptops).',
      color: ACCENT_INDIGO
    },
    {
      metric: '$3.4 B',
      label: 'SAM — Serviceable Market',
      desc: 'Urban gadget, laptop, and consumer appliance repairs across Tier-1 and Tier-2 metro hubs.',
      color: ACCENT_CYAN
    },
    {
      metric: '$350 M',
      label: 'SOM — Beachhead Target',
      desc: 'Initial wedge: Smartphone screen replacements and laptop chip diagnostics in top 5 metros.',
      color: ACCENT_EMERALD
    }
  ];

  marketCards.forEach((c, idx) => {
    const xPos = 0.6 + idx * 3.05;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.65, w: 2.85, h: 3.35,
      fill: { color: CARD_BG },
      line: { color: c.color, width: 1.5 },
      rectRadius: 0.12
    });

    slide.addText(c.metric, {
      x: xPos + 0.2, y: 1.9, w: 2.45, h: 0.7,
      fontSize: 32, bold: true, color: c.color,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(c.label, {
      x: xPos + 0.2, y: 2.65, w: 2.45, h: 0.35,
      fontSize: 12.5, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(c.desc, {
      x: xPos + 0.2, y: 3.05, w: 2.45, h: 1.6,
      fontSize: 10.5, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`The opportunity is massive: India's unorganized repair sector is over $15B. Our initial beachhead targets the $350M urban tech repair market starting with smartphone screens and laptop repairs.`);
}

// -------------------------------------------------------------
// SLIDE 8: Business & Monetization Model
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'BUSINESS MODEL',
    'Monetization: Multi-Stream Sustainable Revenue',
    'High-margin transaction fees coupled with recurring SaaS and B2B marketplace value'
  );

  const streams = [
    {
      num: '01',
      title: 'Platform Take-Rate',
      metric: '5% – 8%',
      desc: 'Transparent convenience fee on completed bookings, snapshotted at checkout with zero hidden surprises.',
      color: ACCENT_EMERALD
    },
    {
      num: '02',
      title: 'Shop Pro SaaS Tiers',
      metric: '₹999 / mo',
      desc: 'Monthly subscription for repair shops offering priority map ranking, verified badges, and parts inventory tools.',
      color: ACCENT_INDIGO
    },
    {
      num: '03',
      title: 'Parts & Extended Warranty',
      metric: '12% – 18%',
      desc: 'Margin on B2B certified OEM spare parts fulfillment plus optional 6-month extended warranty add-ons.',
      color: ACCENT_CYAN
    }
  ];

  streams.forEach((s, idx) => {
    const xPos = 0.6 + idx * 3.05;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.65, w: 2.85, h: 3.35,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.12
    });

    slide.addText(s.metric, {
      x: xPos + 0.2, y: 1.9, w: 2.45, h: 0.6,
      fontSize: 26, bold: true, color: s.color,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(s.title, {
      x: xPos + 0.2, y: 2.55, w: 2.45, h: 0.35,
      fontSize: 13, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(s.desc, {
      x: xPos + 0.2, y: 2.95, w: 2.45, h: 1.7,
      fontSize: 10.5, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`Our business model relies on three clean revenue streams: 5 to 8% booking take rates, ₹999/month shop subscriptions for pro discovery tools, and margins on certified spare parts and extended warranties.`);
}

// -------------------------------------------------------------
// SLIDE 9: Complete Product Ecosystem (Live Suite)
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'PRODUCT DEMO',
    'A Complete Ecosystem Built for Every Stakeholder',
    'Three fully built, operational applications delivering a seamless end-to-end experience'
  );

  const portals = [
    {
      title: 'Customer Web App',
      badge: 'DISCOVER & BOOK',
      color: ACCENT_CYAN,
      features: [
        'Interactive geospatial map search',
        'Real-time booking status tracker',
        'INR wallet top-ups via instant UPI',
        'Digital warranty claim manager'
      ]
    },
    {
      title: 'Technician Workbench',
      badge: 'MANAGE & EARN',
      color: ACCENT_INDIGO,
      features: [
        'Action-first job request queue',
        'One-tap status updates on the bench',
        'Parts & inventory tracking',
        'Gross revenue vs 5% rebate statements'
      ]
    },
    {
      title: 'Operations Admin',
      badge: 'ARBITRATE & SCALE',
      color: ACCENT_EMERALD,
      features: [
        'Multi-party dispute arbitration',
        'Bill approvals & rebate authorization',
        'Technician verification & audits',
        'Platform health & fraud telemetry'
      ]
    }
  ];

  portals.forEach((p, idx) => {
    const xPos = 0.6 + idx * 3.05;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.65, w: 2.85, h: 3.35,
      fill: { color: CARD_BG },
      line: { color: p.color, width: 1.5 },
      rectRadius: 0.12
    });

    slide.addText(p.badge, {
      x: xPos + 0.2, y: 1.85, w: 2.45, h: 0.25,
      fontSize: 8.5, bold: true, color: p.color,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(p.title, {
      x: xPos + 0.2, y: 2.15, w: 2.45, h: 0.35,
      fontSize: 14, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    p.features.forEach((f, fIdx) => {
      slide.addText(`✓  ${f}`, {
        x: xPos + 0.2, y: 2.65 + fIdx * 0.55, w: 2.45, h: 0.5,
        fontSize: 10, color: TEXT_MUTED,
        fontFace: FONT_BODY, margin: 0
      });
    });
  });

  slide.addNotes(`FixGrid is completely built: the Customer Web App for booking and warranties, the Technician Workbench for shop management and rebate tracking, and the Operations Admin for dispute adjudication.`);
}

// -------------------------------------------------------------
// SLIDE 10: Environmental & Social Impact
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'SOCIAL IMPACT',
    'Championing Sustainability & The Right to Repair',
    'Creating lasting economic dignity for local fixers while fighting the global e-waste crisis'
  );

  // Left Box (Environmental)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.65, w: 4.25, h: 3.35,
    fill: { color: CARD_BG },
    line: { color: ACCENT_EMERALD, width: 1.5 },
    rectRadius: 0.12
  });

  slide.addText('🌱  Combatting the E-Waste Crisis', {
    x: 0.85, y: 1.9, w: 3.75, h: 0.45,
    fontSize: 13, bold: true, color: ACCENT_EMERALD,
    fontFace: FONT_HEADING, margin: 0
  });

  const ecoPoints = [
    'Extending device lifespans prevents 4,200+ tons of toxic e-waste per 1M repairs.',
    'Promotes a circular economy by making repair cheaper and more reliable than buying new.',
    'Aligns directly with India’s national Right to Repair mission.'
  ];
  ecoPoints.forEach((pt, idx) => {
    slide.addText(`•  ${pt}`, {
      x: 0.85, y: 2.45 + idx * 0.75, w: 3.75, h: 0.68,
      fontSize: 10.5, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  // Right Box (Social / Micro-Entrepreneurs)
  slide.addShape(pres.ShapeType.roundRect, {
    x: 5.15, y: 1.65, w: 4.25, h: 3.35,
    fill: { color: CARD_BG },
    line: { color: ACCENT_CYAN, width: 1.5 },
    rectRadius: 0.12
  });

  slide.addText('🤝  Dignity for Local Micro-Entrepreneurs', {
    x: 5.4, y: 1.9, w: 3.75, h: 0.45,
    fontSize: 13, bold: true, color: ACCENT_CYAN,
    fontFace: FONT_HEADING, margin: 0
  });

  const socialPoints = [
    'Uplifting thousands of informal neighborhood technicians into the digital economy.',
    'Providing reliable incomes, verified credentials, and digital payment tools.',
    'Rebuilding hyper-local community trust between neighbors and local repair heroes.'
  ];
  socialPoints.forEach((pt, idx) => {
    slide.addText(`•  ${pt}`, {
      x: 5.4, y: 2.45 + idx * 0.75, w: 3.75, h: 0.68,
      fontSize: 10.5, color: TEXT_MUTED,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addNotes(`FixGrid supports the Right to Repair movement by extending electronics lifespans and reducing e-waste, while bringing informal technicians into the formal digital economy with dignity and fair income.`);
}

// -------------------------------------------------------------
// SLIDE 11: Growth & Execution Roadmap
// -------------------------------------------------------------
{
  const slide = createBaseSlide(
    'ROADMAP',
    'The Path Forward: From Hackathon to Scale',
    'A phased, pragmatic go-to-market strategy built on density and network effects'
  );

  const phases = [
    {
      phase: 'PHASE 01',
      title: 'Beachhead Launch (Q1)',
      color: ACCENT_CYAN,
      items: [
        'Onboard 100 verified repair shops across Delhi-NCR',
        'Launch live UPI escrow booking & warranty tracking',
        'Establish direct technician support channels'
      ]
    },
    {
      phase: 'PHASE 02',
      title: 'Ecosystem Expansion (Q2-Q3)',
      color: ACCENT_INDIGO,
      items: [
        'Launch B2B certified spare parts fulfillment network',
        'Deploy automated WhatsApp booking & status bot',
        'Introduce extended warranty protection plans'
      ]
    },
    {
      phase: 'PHASE 03',
      title: 'National Scale (Q4)',
      color: ACCENT_EMERALD,
      items: [
        'Scale to top 15 Indian Tier-1 metro cities',
        'Enterprise IT device lifecycle repair contracts',
        'Franchise certification standards for local shops'
      ]
    }
  ];

  phases.forEach((ph, idx) => {
    const xPos = 0.6 + idx * 3.05;

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.65, w: 2.85, h: 3.35,
      fill: { color: CARD_BG },
      line: { color: ph.color, width: 1.5 },
      rectRadius: 0.12
    });

    slide.addText(ph.phase, {
      x: xPos + 0.2, y: 1.85, w: 2.45, h: 0.25,
      fontSize: 8.5, bold: true, color: ph.color,
      fontFace: FONT_HEADING, margin: 0
    });

    slide.addText(ph.title, {
      x: xPos + 0.2, y: 2.15, w: 2.45, h: 0.35,
      fontSize: 13, bold: true, color: TEXT_WHITE,
      fontFace: FONT_HEADING, margin: 0
    });

    ph.items.forEach((it, iIdx) => {
      slide.addText(`•  ${it}`, {
        x: xPos + 0.2, y: 2.65 + iIdx * 0.7, w: 2.45, h: 0.65,
        fontSize: 10, color: TEXT_MUTED,
        fontFace: FONT_BODY, margin: 0
      });
    });
  });

  slide.addNotes(`Our roadmap is focused: Phase 1 onboards 100 shops in Delhi-NCR; Phase 2 introduces B2B spare parts and WhatsApp booking; and Phase 3 scales across 15 Indian metro cities.`);
}

// -------------------------------------------------------------
// SLIDE 12: Vision & Pitch Conclusion
// -------------------------------------------------------------
{
  const slide = pres.addSlide();
  slide.background = { color: BG_DARK };

  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.2, y: 0.7, w: 7.6, h: 4.2,
    fill: { color: CARD_BG },
    line: { color: ACCENT_INDIGO, width: 1.5 },
    rectRadius: 0.15
  });

  slide.addText('FixGrid.', {
    x: 1.6, y: 1.0, w: 6.8, h: 0.7,
    fontSize: 36, bold: true, color: TEXT_WHITE,
    fontFace: FONT_HEADING, margin: 0
  });

  slide.addText('Let’s Fix the Repair Industry Together', {
    x: 1.6, y: 1.7, w: 6.8, h: 0.4,
    fontSize: 18, bold: true, color: ACCENT_CYAN,
    fontFace: FONT_HEADING, margin: 0
  });

  const summaryBullets = [
    'Proven Market Gap: Solving repair anxiety with mandatory warranties and smart escrow safety.',
    'Win-Win Economics: Empowering independent repair shops with 5% rebates instead of heavy take-rates.',
    'Working Prototype: Three integrated applications fully operational and ready for demonstration.'
  ];

  summaryBullets.forEach((b, idx) => {
    slide.addText(`✓  ${b}`, {
      x: 1.6, y: 2.25 + idx * 0.55, w: 6.8, h: 0.48,
      fontSize: 11.5, color: TEXT_WHITE,
      fontFace: FONT_BODY, margin: 0
    });
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.6, y: 3.95, w: 6.8, h: 0.6,
    fill: { color: '1E293B' },
    line: { color: ACCENT_EMERALD, width: 1 },
    rectRadius: 0.08
  });

  slide.addText('🚀  Experience the Live Demo  •  Presenter: Rishit Jindal  •  Open for Q&A', {
    x: 1.6, y: 3.95, w: 6.8, h: 0.6,
    fontSize: 11, bold: true, color: ACCENT_EMERALD,
    align: 'center', valign: 'middle', fontFace: FONT_HEADING, margin: 0
  });

  slide.addNotes(`FixGrid turns a broken, untrusted market into a transparent, safe, and empowering ecosystem. Our prototype is fully functional and ready to demo. Thank you, and I look forward to your questions!`);
}

// Write the PPTX file
const outputPath = path.join(__dirname, '..', 'FixGrid_Pitch_Deck.pptx');
pres.writeFile({ fileName: outputPath })
  .then(fileName => {
    console.log(`Presentation successfully created at: ${fileName}`);
  })
  .catch(err => {
    console.error('Error generating presentation:', err);
  });
