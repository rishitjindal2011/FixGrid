const pptxgen = require('pptxgenjs');
const path = require('path');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10.0" x 5.625"

// Image absolute paths
const imgEwaste = path.resolve('assets/ewaste_vs_renewed.jpg');
const imgArtisan = path.resolve('assets/artisan_repair.jpg');
const imgEscrow = path.resolve('assets/clean_escrow_trust.jpg');
const imgWebDesktop = path.resolve('fixgrid_website_desktop.png');
const imgWebMobile = path.resolve('fixgrid_website_mobile.png');
const imgQRScan = path.resolve('fixgrid_qr_scan.jpg');

// Google / Sequoia Style Clean Professional Palette (NO Blue Tint!)
const C = {
  bg: 'FFFFFF',             // Pure Crisp White
  card: 'F8FAFC',           // Light Slate Surface (Slate 50)
  cardSubtle: 'F1F5F9',     // Slate 100
  cardBorder: 'E2E8F0',     // Slate 200 Hairline Border
  cardBorderStrong: 'CBD5E1',// Slate 300
  
  textPrimary: '0F172A',    // Slate 900 (High Contrast Ink)
  textSecondary: '334155',  // Slate 700 (Body text)
  textMuted: '64748B',      // Slate 500 (Subtitles & captions)
  textDim: '94A3B8',        // Slate 400 (Dividers & metadata)
  
  // Emerald / Forest Green (Circular Economy & Sustainability)
  green: '059669',          // Emerald 600
  greenBg: 'ECFDF5',        // Emerald 50
  greenBorder: 'A7F3D0',    // Emerald 200
  
  // Warm Amber / Terracotta (Escrow, Trust & Warranty)
  amber: 'D97706',          // Amber 600
  amberBg: 'FFFBEB',        // Amber 50
  amberBorder: 'FDE68A',    // Amber 200
  
  // Crimson / Red (The Problem & Crisis)
  red: 'DC2626',            // Red 600
  redBg: 'FEF2F2',          // Red 50
  redBorder: 'FECACA',      // Red 200

  // Dark Slate Header Accent
  darkInk: '0F172A',
  darkInkBattleship: '1E293B'
};

// Helper: Professional Clean Header
function addSlideHeader(slide, kicker, title, slideNum, totalSlides = 10, titleFontSize = 21) {
  // Category Kicker
  slide.addText(`// ${kicker.toUpperCase()}`, {
    x: 0.6, y: 0.36, w: 7.0, h: 0.22,
    fontSize: 9, bold: true, color: C.green, fontFace: 'Calibri', margin: 0
  });
  // Pagination Pill (Clean minimal pill)
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 8.4, y: 0.34, w: 1.0, h: 0.26,
    fill: { color: C.cardSubtle },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.13
  });
  slide.addText(`[ ${slideNum.toString().padStart(2, '0')} / ${totalSlides} ]`, {
    x: 8.4, y: 0.34, w: 1.0, h: 0.26,
    fontSize: 8.5, bold: true, color: C.textMuted,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });
  // Main Title
  slide.addText(title, {
    x: 0.6, y: 0.60, w: 8.8, h: 0.44,
    fontSize: titleFontSize, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });
}

// Helper: Professional Clean Footer
function addSlideFooter(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 5.12, w: 8.8, h: 0.01,
    fill: { color: C.cardBorder },
    line: { color: C.cardBorder, width: 0.5 }
  });
  slide.addText([
    { text: 'FixGrid Platform  •  ', options: { bold: true, color: C.textMuted } },
    { text: 'www.vytron.me', options: { bold: true, color: C.green } }
  ], {
    x: 0.6, y: 5.20, w: 3.5, h: 0.24,
    fontSize: 8.5, fontFace: 'Calibri', margin: 0
  });
  slide.addText('Decentralized Trust & Warranty Infrastructure for Local Repairs', {
    x: 3.2, y: 5.20, w: 4.2, h: 0.24,
    fontSize: 8.5, color: C.textMuted, align: 'center', fontFace: 'Calibri', margin: 0
  });
  slide.addText('Hackathon Pitch Deck 2026', {
    x: 7.2, y: 5.20, w: 2.2, h: 0.24,
    fontSize: 8.5, color: C.textMuted, align: 'right', fontFace: 'Calibri', margin: 0
  });
}

// ==========================================
// SLIDE 1: CLEAN EXECUTIVE TITLE SLIDE
// ==========================================
{
  const s1 = pres.addSlide();
  s1.background = { color: C.bg };

  // Top Tag Badge
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 0.55, w: 3.8, h: 0.30,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.15
  });
  s1.addText('HACKATHON KEYNOTE  •  CIRCULAR ECONOMY & FINTECH', {
    x: 0.6, y: 0.55, w: 3.8, h: 0.30,
    fontSize: 8, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  // Hero Title
  s1.addText('FixGrid', {
    x: 0.6, y: 0.98, w: 4.5, h: 0.82,
    fontSize: 48, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });

  // Hero Subtitle
  s1.addText('Rewiring the $15.2B Local Repair Economy with Pure Software Trust', {
    x: 0.6, y: 1.82, w: 4.4, h: 0.55,
    fontSize: 15, bold: true, color: C.green, fontFace: 'Calibri', margin: 0
  });

  // Executive Description
  s1.addText('A milestone-based smart escrow & platform warranty infrastructure bridging consumers with skilled neighborhood repair artisans. Transforming fragmented street repairs into an accountable, dependable service experience.', {
    x: 0.6, y: 2.45, w: 4.3, h: 0.70,
    fontSize: 10.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
  });

  // 3 Feature Chips
  const heroChips = [
    { label: 'Milestone Smart Escrow', desc: 'Funds released only upon customer OTP inspection.', color: C.amber, bg: C.amberBg, border: C.amberBorder },
    { label: '5-Day FixGrid Shield', desc: 'Universal platform-backed warranty on workmanship.', color: C.green, bg: C.greenBg, border: C.greenBorder },
    { label: 'Live In Production', desc: 'Deployed full-stack app at www.vytron.me.', color: C.textPrimary, bg: C.cardSubtle, border: C.cardBorder }
  ];

  heroChips.forEach((chip, idx) => {
    const y = 3.28 + idx * 0.54;
    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: y, w: 4.3, h: 0.46,
      fill: { color: C.card },
      line: { color: chip.border, width: 1 },
      rectRadius: 0.08
    });
    s1.addText(`✓  ${chip.label}: `, {
      x: 0.75, y: y, w: 2.1, h: 0.46,
      fontSize: 9.5, bold: true, color: chip.color,
      valign: 'middle', fontFace: 'Calibri', margin: 0
    });
    s1.addText(chip.desc, {
      x: 2.85, y: y, w: 1.95, h: 0.46,
      fontSize: 8.5, color: C.textSecondary,
      valign: 'middle', fontFace: 'Calibri', margin: 0
    });
  });

  // Right Side: Clean Elevated Desktop Mockup Frame
  const rightX = 5.25;
  const rightW = 4.15;
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 0.55, w: rightW, h: 4.25,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1.5 },
    rectRadius: 0.12
  });

  s1.addImage({
    path: imgWebDesktop,
    x: rightX + 0.15, y: 0.75, w: rightW - 0.30, h: 2.45
  });
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.15, y: 0.75, w: rightW - 0.30, h: 2.45,
    fill: { type: 'none' },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.06
  });

  // Live URL Card beneath mockup
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.2, y: 3.35, w: rightW - 0.4, h: 1.25,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.08
  });
  s1.addText('● TESTED & FULLY FUNCTIONAL', {
    x: rightX + 0.35, y: 3.48, w: 3.4, h: 0.22,
    fontSize: 8, bold: true, color: C.green, fontFace: 'Calibri', margin: 0
  });
  s1.addText('Live Production Platform', {
    x: rightX + 0.35, y: 3.72, w: 3.4, h: 0.30,
    fontSize: 13, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });
  s1.addText('Visit: https://www.vytron.me', {
    x: rightX + 0.35, y: 4.08, w: 3.4, h: 0.32,
    fontSize: 10, bold: true, color: C.green, fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s1);
  s1.addNotes('Good morning judges. FixGrid rewires the massive $15.2 Billion unorganized repair economy in India by solving the fundamental obstacle preventing circular consumption: the trust deficit. FixGrid is live in production today at vytron.me.');
}

// ==========================================
// SLIDE 2: THE PROBLEM (SPLIT WITH CRISIS IMAGE)
// ==========================================
{
  const s2 = pres.addSlide();
  s2.background = { color: C.bg };
  addSlideHeader(s2, 'The Crisis', 'The Broken Economics of Repair & The Climate Paradox', 2);

  s2.addText('Consumers want to repair their broken items, but are trapped by acute trust and information asymmetry.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Column: 3 Problem Stat Cards
  const leftX = 0.6;
  const leftW = 4.4;

  const problemCards = [
    {
      kicker: 'THE LEMON MARKET TRAP',
      stat: '84%',
      statDesc: 'Fear arbitrary quotes & fake parts',
      desc: 'Without verifiable trust, consumers assume local repairers will overcharge or swap components. They default to buying expensive new replacements.',
      color: C.red, bg: C.redBg, border: C.redBorder
    },
    {
      kicker: 'THE INVISIBLE CRAFTSMAN',
      stat: '92%',
      statDesc: 'Local repairers lack any digital presence',
      desc: 'Skilled neighborhood technicians operate < 500m away, but remain digitally invisible, lacking verified reputation ledgers and booking tools.',
      color: C.amber, bg: C.amberBg, border: C.amberBorder
    },
    {
      kicker: 'THE ECOLOGICAL DISASTER',
      stat: '1.71M+ T',
      statDesc: 'Annual e-waste in India (#3 globally)',
      desc: '80% of gadget carbon is embodied in manufacturing. Discarding repairable items causes catastrophic pollution and resource depletion.',
      color: C.green, bg: C.greenBg, border: C.greenBorder
    }
  ];

  problemCards.forEach((pc, idx) => {
    const y = 1.36 + idx * 1.20;
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX, y: y, w: leftW, h: 1.12,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.10
    });

    // Stat Column
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX + 0.15, y: y + 0.16, w: 1.25, h: 0.80,
      fill: { color: pc.bg },
      line: { color: pc.border, width: 1 },
      rectRadius: 0.08
    });
    s2.addText(pc.stat, {
      x: leftX + 0.15, y: y + 0.20, w: 1.25, h: 0.38,
      fontSize: 16, bold: true, color: pc.color,
      align: 'center', fontFace: 'Cambria', margin: 0
    });
    s2.addText(pc.statDesc, {
      x: leftX + 0.18, y: y + 0.60, w: 1.19, h: 0.30,
      fontSize: 6.5, color: C.textMuted,
      align: 'center', fontFace: 'Calibri', margin: 0
    });

    // Content Column
    s2.addText(pc.kicker, {
      x: leftX + 1.50, y: y + 0.16, w: 2.80, h: 0.22,
      fontSize: 8, bold: true, color: pc.color, fontFace: 'Calibri', margin: 0
    });
    s2.addText(pc.desc, {
      x: leftX + 1.50, y: y + 0.38, w: 2.75, h: 0.66,
      fontSize: 8.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Right Column: Clean Framed Photograph
  const rightX = 5.25;
  const rightW = 4.15;
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: rightW, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1.5 },
    rectRadius: 0.12
  });

  s2.addImage({
    path: imgEwaste,
    x: rightX + 0.12, y: 1.48, w: rightW - 0.24, h: 2.84
  });

  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.17
  });
  s2.addText('The Choice: 1.71M Tonnes E-Waste vs. Circular Renewal', {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fontSize: 8.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s2);
  s2.addNotes('Akerlof won a Nobel Prize for explaining the Market for Lemons: without verifiable trust, consumers assume the worst and discard repairable goods. FixGrid restores trust at the point of repair.');
}

// ==========================================
// SLIDE 3: THE SOLUTION (SPLIT WITH ARTISAN IMAGE)
// ==========================================
{
  const s3 = pres.addSlide();
  s3.background = { color: C.bg };
  addSlideHeader(s3, 'Our Solution', 'FixGrid: 4 Pillars of Pure Software Trust', 3);

  s3.addText('Transforming fragmented street repairs into an accountable, standardized service experience.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Column: The 4 Pillars
  const leftX = 0.6;
  const leftW = 4.4;

  const pillars = [
    {
      num: '01',
      title: 'Geospatial Discovery & Live Map',
      desc: 'Leaflet-powered engine mapping verified neighborhood repair shops with transparent diagnostic rate cards and customer ratings.',
      color: C.textPrimary, bg: C.cardSubtle, border: C.cardBorder
    },
    {
      num: '02',
      title: 'Milestone-Based Smart Escrow',
      desc: 'Consumer payment locked in FixGrid Escrow Vault. Funds are released to technician only upon customer inspection & OTP entry.',
      color: C.amber, bg: C.amberBg, border: C.amberBorder
    },
    {
      num: '03',
      title: 'FixGrid Shield (Platform Warranty)',
      desc: 'Universal 5-day platform-backed warranty on workmanship + recorded merchant extended guarantees and dispute arbitration.',
      color: C.green, bg: C.greenBg, border: C.greenBorder
    },
    {
      num: '04',
      title: 'Shop Pro SaaS & 5% Cashback Rebate',
      desc: '5% completed-bill cashback rebate incentivizes offline shops to log walk-ins. Optional ₹999/mo SaaS for cloud ticketing & WhatsApp alerts.',
      color: C.textSecondary, bg: C.cardSubtle, border: C.cardBorder
    }
  ];

  pillars.forEach((p, idx) => {
    const y = 1.36 + idx * 0.90;
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX, y: y, w: leftW, h: 0.84,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.08
    });

    // Number Pill
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX + 0.12, y: y + 0.15, w: 0.42, h: 0.54,
      fill: { color: p.bg },
      line: { color: p.border, width: 1 },
      rectRadius: 0.06
    });
    s3.addText(p.num, {
      x: leftX + 0.12, y: y + 0.15, w: 0.42, h: 0.54,
      fontSize: 10, bold: true, color: p.color,
      align: 'center', valign: 'middle', fontFace: 'Cambria', margin: 0
    });

    s3.addText(p.title, {
      x: leftX + 0.62, y: y + 0.12, w: 3.65, h: 0.24,
      fontSize: 9.5, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
    });
    s3.addText(p.desc, {
      x: leftX + 0.62, y: y + 0.36, w: 3.65, h: 0.42,
      fontSize: 8, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Right Column: Artisan Photo Frame
  const rightX = 5.25;
  const rightW = 4.15;
  s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: rightW, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1.5 },
    rectRadius: 0.12
  });

  s3.addImage({
    path: imgArtisan,
    x: rightX + 0.12, y: 1.48, w: rightW - 0.24, h: 2.84
  });

  s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.17
  });
  s3.addText('Empowering Local Neighborhood Repair Heroes', {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fontSize: 8.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s3);
  s3.addNotes('FixGrid solves the trust deficit through 4 integrated pillars: Geospatial Discovery, Milestone Escrow with OTP verification, our FixGrid Shield 5-day guarantee, and Shop Pro SaaS with a 5% cashback rebate for artisans.');
}

// ==========================================
// SLIDE 4: HOW IT WORKS (CLEAN ESCROW & DESK VISUAL)
// ==========================================
{
  const s4 = pres.addSlide();
  s4.background = { color: C.bg };
  addSlideHeader(s4, 'User Journey', 'The Zero-Risk Repair Lifecycle & Escrow Flow', 4);

  s4.addText('A seamless, transparent workflow safeguarding consumers and guaranteeing fair artisan compensation.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Column: 4 Step Process
  const leftX = 0.6;
  const leftW = 4.4;

  const steps = [
    {
      step: 'STEP 01',
      title: 'Discover & Lock Quote',
      desc: 'Customer selects device model & fault. Compares nearby verified workshops and rate cards. Locks fixed estimate.',
      color: C.textPrimary, bg: C.cardSubtle, border: C.cardBorder
    },
    {
      step: 'STEP 02',
      title: 'Smart Escrow Deposit',
      desc: 'Payment held safely in FixGrid Escrow Vault. Technician receives guaranteed work order. Zero non-payment risk.',
      color: C.amber, bg: C.amberBg, border: C.amberBorder
    },
    {
      step: 'STEP 03',
      title: 'Diagnosis & Live Tracking',
      desc: 'Technician updates repair milestones with photo proof. Customer receives real-time WhatsApp & SMS progress alerts.',
      color: C.textSecondary, bg: C.cardSubtle, border: C.cardBorder
    },
    {
      step: 'STEP 04',
      title: 'OTP Release & Warranty',
      desc: 'Customer inspects working device, provides secret completion OTP to disburse funds. 5-day FixGrid Shield activates.',
      color: C.green, bg: C.greenBg, border: C.greenBorder
    }
  ];

  steps.forEach((st, idx) => {
    const y = 1.36 + idx * 0.90;
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX, y: y, w: leftW, h: 0.84,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.08
    });

    // Step Badge
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: leftX + 0.12, y: y + 0.15, w: 0.70, h: 0.54,
      fill: { color: st.bg },
      line: { color: st.border, width: 1 },
      rectRadius: 0.06
    });
    s4.addText(st.step, {
      x: leftX + 0.12, y: y + 0.15, w: 0.70, h: 0.54,
      fontSize: 8, bold: true, color: st.color,
      align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
    });

    s4.addText(st.title, {
      x: leftX + 0.90, y: y + 0.12, w: 3.35, h: 0.24,
      fontSize: 9.5, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
    });
    s4.addText(st.desc, {
      x: leftX + 0.90, y: y + 0.36, w: 3.35, h: 0.42,
      fontSize: 8, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Right Column: Clean Escrow Photograph Frame
  const rightX = 5.25;
  const rightW = 4.15;
  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: rightW, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1.5 },
    rectRadius: 0.12
  });

  s4.addImage({
    path: imgEscrow,
    x: rightX + 0.12, y: 1.48, w: rightW - 0.24, h: 2.84
  });

  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fill: { color: C.amberBg },
    line: { color: C.amberBorder, width: 1 },
    rectRadius: 0.17
  });
  s4.addText('Dual-Lock Escrow Vault & Platform Guarantee', {
    x: rightX + 0.25, y: 4.42, w: rightW - 0.5, h: 0.34,
    fontSize: 8.5, bold: true, color: C.amber,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s4);
  s4.addNotes('Notice how the financial incentive is aligned: the technician knows funds are guaranteed in escrow, while the consumer knows money won’t leave the vault until they inspect the repaired device and provide their completion OTP.');
}

// ==========================================
// SLIDE 5: SYSTEM ARCHITECTURE & TECH STACK
// ==========================================
{
  const s5 = pres.addSlide();
  s5.background = { color: C.bg };
  addSlideHeader(s5, 'System Architecture', 'Enterprise Web Stack Engineered for Speed & Trust', 5);

  s5.addText('High-concurrency, security-hardened Next.js 16 and Supabase infrastructure with sub-second response times.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  const techCards = [
    {
      title: 'Next.js 16 & Frontend Engine',
      kicker: 'CORE FRAMEWORK',
      accent: C.textPrimary,
      bg: C.cardSubtle,
      border: C.cardBorder,
      bullets: [
        'Next.js 16 App Router with React Server Components (RSC).',
        'TypeScript for full-stack end-to-end type safety.',
        'Leaflet & OpenStreetMap spatial engine for instant proximity search.',
        'Tailwind CSS custom design system with WCAG-compliant contrast.'
      ]
    },
    {
      title: 'Supabase PostgreSQL & Security',
      kicker: 'BACKEND & DATA INTEGRITY',
      accent: C.amber,
      bg: C.amberBg,
      border: C.amberBorder,
      bullets: [
        'PostgreSQL with granular Row Level Security (RLS) policies.',
        'Database Triggers orchestrating escrow state machines automatically.',
        'Anti-fraud middleware with IP-access gating and rate-limiting.',
        'Cryptographic completion OTP generator and verification audit trail.'
      ]
    },
    {
      title: 'Programmatic Headless SEO CMS',
      kicker: 'ZERO-CAC ACQUISITION',
      accent: C.green,
      bg: C.greenBg,
      border: C.greenBorder,
      bullets: [
        'Dedicated /seo-admin engine for automated landing page generation.',
        'Synthesizes thousands of localized long-tail URLs across urban pincodes.',
        'Automated Schema.org structured data & dynamic sitemaps.',
        'Funneling high-intent search traffic straight to local repair shops.'
      ]
    }
  ];

  techCards.forEach((tc, idx) => {
    const x = 0.6 + idx * 3.0;

    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.38, w: 2.8, h: 3.50,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.12
    });

    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.15, y: 1.54, w: 2.5, h: 0.25,
      fill: { color: tc.bg },
      line: { color: tc.border, width: 1 },
      rectRadius: 0.08
    });
    s5.addText(tc.kicker, {
      x: x + 0.15, y: 1.54, w: 2.5, h: 0.25,
      fontSize: 8, bold: true, color: tc.accent,
      align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
    });

    s5.addText(tc.title, {
      x: x + 0.15, y: 1.88, w: 2.5, h: 0.42,
      fontSize: 13, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
    });

    tc.bullets.forEach((b, bIdx) => {
      s5.addText(`•  ${b}`, {
        x: x + 0.15, y: 2.44 + bIdx * 0.58, w: 2.5, h: 0.52,
        fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
      });
    });
  });

  addSlideFooter(s5);
  s5.addNotes('Technically, we did not cut corners. Next.js 16 App Router handles dynamic rendering, Supabase PostgreSQL handles cryptographic escrow states with Row Level Security, and our custom programmatic SEO CMS generates thousands of localized organic search pages at zero CAC.');
}

// ==========================================
// SLIDE 6: LIVE WORKING PRODUCT (DUAL MOCKUPS)
// ==========================================
{
  const s6 = pres.addSlide();
  s6.background = { color: C.bg };
  addSlideHeader(s6, 'Live Deployment', 'Tested & Operational in Production: www.vytron.me', 6);

  s6.addText('FixGrid is not a mockup or wireframe. It is a live, production-deployed platform accessible worldwide.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Column: Features & Proof
  const leftX = 0.6;
  const leftW = 3.8;
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX, y: 1.36, w: leftW, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.12
  });

  // Live Badge
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX + 0.2, y: 1.56, w: 1.9, h: 0.28,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.14
  });
  s6.addText('● LIVE IN PRODUCTION', {
    x: leftX + 0.2, y: 1.56, w: 1.9, h: 0.28,
    fontSize: 8.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  s6.addText('Tested Feature Suite', {
    x: leftX + 0.2, y: 1.94, w: 3.4, h: 0.35,
    fontSize: 15, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });

  const liveFeatures = [
    'Sub-second Leaflet geospatial workshop locator.',
    'Verified technician storefronts with transparent rate cards.',
    'Escrow state transitions & simulated completion OTP flow.',
    'Fully responsive desktop and mobile web experience.',
    'Integrated SEO Admin engine for programmatic page generation.'
  ];

  liveFeatures.forEach((feat, fIdx) => {
    s6.addText(`✓  ${feat}`, {
      x: leftX + 0.2, y: 2.36 + fIdx * 0.40, w: 3.4, h: 0.36,
      fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Production URL Box
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX + 0.2, y: 4.42, w: 3.4, h: 0.34,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.08
  });
  s6.addText('https://www.vytron.me', {
    x: leftX + 0.2, y: 4.42, w: 3.4, h: 0.34,
    fontSize: 10.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  // Right Column: Dual Mockup Showcase (Desktop + Mobile overlay)
  const rightX = 4.65;
  const rightW = 4.75;
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: rightW, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1.5 },
    rectRadius: 0.12
  });

  // Desktop Mockup Frame
  s6.addImage({
    path: imgWebDesktop,
    x: rightX + 0.15, y: 1.52, w: 3.3, h: 2.2
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.15, y: 1.52, w: 3.3, h: 2.2,
    fill: { type: 'none' },
    line: { color: C.cardBorderStrong, width: 1 },
    rectRadius: 0.06
  });

  // Mobile Mockup Overlaid on Right
  s6.addImage({
    path: imgWebMobile,
    x: rightX + 3.15, y: 1.85, w: 1.45, h: 2.85
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 3.15, y: 1.85, w: 1.45, h: 2.85,
    fill: { type: 'none' },
    line: { color: C.greenBorder, width: 1.5 },
    rectRadius: 0.10
  });

  // Caption below desktop
  s6.addText('Desktop & Mobile Responsive: Live Map, Shop Profiles & Booking', {
    x: rightX + 0.15, y: 4.45, w: 2.9, h: 0.30,
    fontSize: 7.5, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s6);
  s6.addNotes('Here is our live website deployed at vytron.me. Judges can test the real-time map, look up neighborhood technicians, review rate cards, and experience the UI directly.');
}

// ==========================================
// SLIDE 7: MARKET OPPORTUNITY & BUSINESS MODEL
// ==========================================
{
  const s7 = pres.addSlide();
  s7.background = { color: C.bg };
  addSlideHeader(s7, 'Market & Monetization', 'Monetizing a $15.2B High-Frequency Unorganized Market', 7);

  s7.addText('A sustainable business model built on transaction take-rates, merchant SaaS, and verified B2B parts logistics.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Top 3 Market Opportunity Metrics
  const markets = [
    { title: 'TAM: $15.2 Billion', sub: 'Total Indian Unorganized Repair Sector (Electronics, appliances & daily goods)', accent: C.textPrimary },
    { title: 'SAM: $4.8 Billion', sub: 'Tier-1 & Tier-2 Urban Consumer Electronics & Mobile Device Repairs', accent: C.amber },
    { title: 'SOM: $120 Million', sub: 'Target 3-Year Addressable Hyperlocal Metro Clusters (NCR, Bengaluru, Mumbai)', accent: C.green }
  ];

  markets.forEach((m, idx) => {
    const x = 0.6 + idx * 3.0;
    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.36, w: 2.8, h: 1.0,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.10
    });
    s7.addText(m.title, {
      x: x + 0.15, y: 1.46, w: 2.5, h: 0.32,
      fontSize: 14, bold: true, color: m.accent, fontFace: 'Cambria', margin: 0
    });
    s7.addText(m.sub, {
      x: x + 0.15, y: 1.80, w: 2.5, h: 0.48,
      fontSize: 8.5, color: C.textMuted, fontFace: 'Calibri', margin: 0
    });
  });

  // Bottom 3 Revenue Channels
  const revs = [
    {
      kicker: 'REVENUE STREAM 1',
      title: 'Platform Take-Rate (5% – 8%)',
      accent: C.amber,
      bg: C.amberBg,
      border: C.amberBorder,
      bullets: [
        'Transaction commission charged on every completed escrow repair.',
        'Covers payment gateway costs, escrow vault management, and FixGrid Shield guarantee pool.',
        'High consumer willingness-to-pay for warranty peace of mind.'
      ]
    },
    {
      kicker: 'REVENUE STREAM 2',
      title: 'Shop Pro SaaS (₹999 / Month)',
      accent: C.textPrimary,
      bg: C.cardSubtle,
      border: C.cardBorder,
      bullets: [
        'Cloud software subscription for high-volume workshop technicians.',
        'Features: digital job ticketing, inventory alerts, automated WhatsApp status updates, and priority listing.',
        'Predictable, high-margin recurring SaaS revenue stream.'
      ]
    },
    {
      kicker: 'REVENUE STREAM 3',
      title: 'Certified Spare Parts Logistics',
      accent: C.green,
      bg: C.greenBg,
      border: C.greenBorder,
      bullets: [
        'B2B marketplace connecting local repair shops to verified wholesale component suppliers (parts.vytron.me).',
        '10%–18% distribution margin on authenticated batteries, screens, and ICs.',
        'Guarantees genuine parts quality across the repair network.'
      ]
    }
  ];

  revs.forEach((r, idx) => {
    const x = 0.6 + idx * 3.0;
    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 2.54, w: 2.8, h: 2.40,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.12
    });

    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.15, y: 2.68, w: 2.5, h: 0.22,
      fill: { color: r.bg },
      line: { color: r.border, width: 1 },
      rectRadius: 0.08
    });
    s7.addText(r.kicker, {
      x: x + 0.15, y: 2.68, w: 2.5, h: 0.22,
      fontSize: 7.5, bold: true, color: r.accent,
      align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
    });

    s7.addText(r.title, {
      x: x + 0.15, y: 2.96, w: 2.5, h: 0.32,
      fontSize: 12, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
    });

    r.bullets.forEach((b, bIdx) => {
      s7.addText(`•  ${b}`, {
        x: x + 0.15, y: 3.36 + bIdx * 0.46, w: 2.5, h: 0.42,
        fontSize: 9, color: C.textSecondary, fontFace: 'Calibri', margin: 0
      });
    });
  });

  addSlideFooter(s7);
  s7.addNotes('Our economics are proven and scalable: a 5 to 8% platform take rate, ₹999/month Shop Pro SaaS for workshops, and a B2B certified parts supply chain that solves counterfeit components at wholesale scale.');
}

// ==========================================
// SLIDE 8: TRIPLE BOTTOM LINE IMPACT (ESG)
// ==========================================
{
  const s8 = pres.addSlide();
  s8.background = { color: C.bg };
  addSlideHeader(s8, 'Measurable Impact', 'Triple Bottom Line: Economic, Social & Ecological Value', 8);

  s8.addText('FixGrid aligns consumer pocketbook savings with artisan livelihood growth and global carbon reduction.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  const impacts = [
    {
      kicker: 'ECONOMIC IMPACT (PEOPLE)',
      title: 'Consumer Savings',
      metric: '60% – 80%',
      metricLabel: 'Cost reduction vs. buying new replacements',
      accent: C.textPrimary,
      bg: C.cardSubtle,
      border: C.cardBorder,
      bullets: [
        'Saves an estimated ₹14,000 annually per urban household on appliance & device lifespans.',
        'Extends functional device life by an average of 2.5 to 4 years.',
        'Democratizes technology access for students, gig workers, and low-income families.'
      ]
    },
    {
      kicker: 'SOCIAL IMPACT (ARTISANS)',
      title: 'Artisan Livelihoods',
      metric: '+35% – 45%',
      metricLabel: 'Average increase in monthly artisan income',
      accent: C.amber,
      bg: C.amberBg,
      border: C.amberBorder,
      bullets: [
        'Formalizes unorganized street technicians with verified digital storefronts.',
        'Immutable rating ledger unlocks access to formal microcredit and banking.',
        '5% completed-bill cashback rebate drives direct financial inclusion for local micro-shops.'
      ]
    },
    {
      kicker: 'ECOLOGICAL IMPACT (PLANET)',
      title: 'Climate & E-Waste',
      metric: '72 kg CO₂e',
      metricLabel: 'Embodied carbon saved per repaired smartphone',
      accent: C.green,
      bg: C.greenBg,
      border: C.greenBorder,
      bullets: [
        'Diverts hundreds of tonnes of toxic e-waste (mercury, lead) from informal burning & landfills.',
        'Saves ~180 kg CO₂e per salvaged laptop by eliminating manufacturing emissions.',
        'Direct alignment with UN Sustainable Development Goals (SDG 12 & SDG 13).'
      ]
    }
  ];

  impacts.forEach((imp, idx) => {
    const x = 0.6 + idx * 3.0;

    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.36, w: 2.8, h: 3.52,
      fill: { color: C.card },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.12
    });

    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.15, y: 1.50, w: 2.5, h: 0.25,
      fill: { color: imp.bg },
      line: { color: imp.border, width: 1 },
      rectRadius: 0.08
    });
    s8.addText(imp.kicker, {
      x: x + 0.15, y: 1.50, w: 2.5, h: 0.25,
      fontSize: 7.5, bold: true, color: imp.accent,
      align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
    });

    s8.addText(imp.title, {
      x: x + 0.15, y: 1.84, w: 2.5, h: 0.32,
      fontSize: 14, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
    });

    // Stat Box
    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.15, y: 2.22, w: 2.5, h: 0.70,
      fill: { color: C.bg },
      line: { color: C.cardBorder, width: 1 },
      rectRadius: 0.08
    });
    s8.addText(imp.metric, {
      x: x + 0.20, y: 2.26, w: 2.4, h: 0.36,
      fontSize: 21, bold: true, color: imp.accent, fontFace: 'Cambria', margin: 0
    });
    s8.addText(imp.metricLabel, {
      x: x + 0.20, y: 2.62, w: 2.4, h: 0.24,
      fontSize: 8.5, color: C.textMuted, fontFace: 'Calibri', margin: 0
    });

    imp.bullets.forEach((b, bIdx) => {
      s8.addText(`•  ${b}`, {
        x: x + 0.15, y: 3.06 + bIdx * 0.50, w: 2.5, h: 0.46,
        fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
      });
    });
  });

  addSlideFooter(s8);
  s8.addNotes('FixGrid scores high on ESG evaluation: consumers save 60-80%, artisans boost their earnings by up to 45%, and the planet is spared 72kg of CO2 per smartphone repaired.');
}

// ==========================================
// SLIDE 9: COMPETITIVE MOATS & ROADMAP
// ==========================================
{
  const s9 = pres.addSlide();
  s9.background = { color: C.bg };
  addSlideHeader(s9, 'Defensibility & Roadmap', 'Competitive Moats & Execution Milestones', 9);

  s9.addText('How FixGrid establishes defensible network effects and scales into the definitive circular economy platform.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Column: Defensible Moats
  const leftX = 0.6;
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX, y: 1.36, w: 4.25, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.12
  });

  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX + 0.2, y: 1.54, w: 2.5, h: 0.25,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.08
  });
  s9.addText('SUSTAINABLE COMPETITIVE ADVANTAGE', {
    x: leftX + 0.2, y: 1.54, w: 2.5, h: 0.25,
    fontSize: 7.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  s9.addText('Why Incumbents Cannot Replicate FixGrid', {
    x: leftX + 0.2, y: 1.86, w: 3.85, h: 0.32,
    fontSize: 13, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });

  const moats = [
    {
      title: 'The Escrow & Warranty Trust Moat',
      desc: 'Generic directories (Justdial, Sulekha) offer zero financial security. FixGrid locks payment in escrow with a 5-day platform guarantee.'
    },
    {
      title: 'Zero-CAC Programmatic SEO Engine',
      desc: 'Our automated SEO engine captures thousands of high-intent Google searches locally without spending on ads, starving competitors of organic traffic.'
    },
    {
      title: 'Artisan Loyalty Loop (5% Rebate + SaaS)',
      desc: 'By offering a 5% cashback rebate on completed bills, shopkeepers bring their own walk-in customers onto FixGrid, creating exponential network effects.'
    }
  ];

  moats.forEach((m, mIdx) => {
    s9.addText(`${mIdx + 1}.  ${m.title}`, {
      x: leftX + 0.2, y: 2.30 + mIdx * 0.78, w: 3.85, h: 0.24,
      fontSize: 10.5, bold: true, color: C.amber, fontFace: 'Calibri', margin: 0
    });
    s9.addText(m.desc, {
      x: leftX + 0.42, y: 2.54 + mIdx * 0.78, w: 3.63, h: 0.48,
      fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Right Column: Execution Roadmap
  const rightX = 5.15;
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: 4.25, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.12
  });

  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.2, y: 1.54, w: 2.0, h: 0.25,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.08
  });
  s9.addText('EXECUTION TIMELINE', {
    x: rightX + 0.2, y: 1.54, w: 2.0, h: 0.25,
    fontSize: 7.5, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  s9.addText('Strategic Phased Expansion', {
    x: rightX + 0.2, y: 1.86, w: 3.85, h: 0.32,
    fontSize: 13, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });

  const phases = [
    {
      phase: 'PHASE 1 (TODAY / LIVE)',
      color: C.green,
      desc: 'Next.js 16 web platform live at vytron.me. Leaflet map discovery, shop onboarding, Supabase RLS security, and Headless SEO CMS.'
    },
    {
      phase: 'PHASE 2 (MONTHS 1 – 6)',
      color: C.amber,
      desc: 'Automated UPI split-escrow settlement via Razorpay/Cashfree, technician native PWA with offline job cards, and WhatsApp Business API alerts.'
    },
    {
      phase: 'PHASE 3 (MONTHS 6 – 12)',
      color: C.textPrimary,
      desc: 'B2B certified spare parts network (parts.vytron.me), verified battery health certificates, and national electronics brand repair partnerships.'
    }
  ];

  phases.forEach((ph, pIdx) => {
    s9.addText(`▶  ${ph.phase}`, {
      x: rightX + 0.2, y: 2.30 + pIdx * 0.78, w: 3.85, h: 0.24,
      fontSize: 10, bold: true, color: ph.color, fontFace: 'Calibri', margin: 0
    });
    s9.addText(ph.desc, {
      x: rightX + 0.42, y: 2.54 + pIdx * 0.78, w: 3.63, h: 0.48,
      fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  addSlideFooter(s9);
  s9.addNotes('Incumbents like Urban Company charge 25% take rates and compete with local shops. FixGrid empowers existing shops with trust infrastructure, programmatic SEO, and cashback incentives, building a true local network moat.');
}

// ==========================================
// SLIDE 10: CONCLUSION & LIVE DEMO INVITATION
// ==========================================
{
  const s10 = pres.addSlide();
  s10.background = { color: C.bg };
  addSlideHeader(s10, 'Conclusion & Live Demo', 'Making Repair the First Choice, Not the Last Resort', 10);

  s10.addText('FixGrid transforms throwaway consumerism into an equitable, sustainable circular repair economy.', {
    x: 0.6, y: 1.06, w: 8.8, h: 0.24,
    fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  // Left Box: Why FixGrid Wins
  const leftX = 0.6;
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX, y: 1.36, w: 5.6, h: 3.52,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: 0.12
  });

  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX + 0.2, y: 1.56, w: 2.5, h: 0.25,
    fill: { color: C.amberBg },
    line: { color: C.amberBorder, width: 1 },
    rectRadius: 0.08
  });
  s10.addText('HACKATHON WINNING CRITERIA', {
    x: leftX + 0.2, y: 1.56, w: 2.5, h: 0.25,
    fontSize: 8, bold: true, color: C.amber,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  s10.addText('Why FixGrid Deserves the Grand Prize', {
    x: leftX + 0.2, y: 1.90, w: 5.2, h: 0.35,
    fontSize: 15, bold: true, color: C.textPrimary, fontFace: 'Cambria', margin: 0
  });

  const criteria = [
    { title: 'Critical Problem Solved', desc: 'Unlocks the $15.2B repair market by removing the trust barrier causing toxic e-waste.' },
    { title: 'Deep Technical Execution', desc: 'Next.js 16 App Router, Supabase RLS security, Leaflet geo-routing & programmatic SEO CMS.' },
    { title: 'Fully Functional Software', desc: 'Not a Figma wireframe—deployed and operational right now at www.vytron.me.' },
    { title: 'Clear Sustainable Economics', desc: '5-8% take-rate, ₹999/mo Shop Pro SaaS, and wholesale B2B certified parts logistics.' }
  ];

  criteria.forEach((cr, cIdx) => {
    s10.addText(`★  ${cr.title}: `, {
      x: leftX + 0.2, y: 2.36 + cIdx * 0.44, w: 2.2, h: 0.38,
      fontSize: 10, bold: true, color: C.green, fontFace: 'Calibri', margin: 0
    });
    s10.addText(cr.desc, {
      x: leftX + 2.4, y: 2.36 + cIdx * 0.44, w: 3.0, h: 0.38,
      fontSize: 9.5, color: C.textSecondary, fontFace: 'Calibri', margin: 0
    });
  });

  // Quote Box
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: leftX + 0.2, y: 4.25, w: 5.2, h: 0.44,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1 },
    rectRadius: 0.08
  });
  s10.addText('"The greenest, most sustainable device is the one that is already in your hands."', {
    x: leftX + 0.2, y: 4.25, w: 5.2, h: 0.44,
    fontSize: 10, italic: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Cambria', margin: 0
  });

  // Right Box: QR Code & Live Demo Call to Action
  const rightX = 6.5;
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX, y: 1.36, w: 2.9, h: 3.52,
    fill: { color: C.card },
    line: { color: C.greenBorder, width: 1.5 },
    rectRadius: 0.12
  });

  s10.addText('TEST IT LIVE', {
    x: rightX + 0.2, y: 1.54, w: 2.5, h: 0.25,
    fontSize: 9, bold: true, color: C.green,
    align: 'center', fontFace: 'Calibri', margin: 0
  });
  s10.addText('Scan with Phone Camera', {
    x: rightX + 0.2, y: 1.78, w: 2.5, h: 0.20,
    fontSize: 8.5, color: C.textMuted,
    align: 'center', fontFace: 'Calibri', margin: 0
  });

  s10.addImage({
    path: imgQRScan,
    x: rightX + 0.45, y: 2.05, w: 2.0, h: 2.0
  });

  // URL Pill
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rightX + 0.2, y: 4.25, w: 2.5, h: 0.42,
    fill: { color: C.greenBg },
    line: { color: C.greenBorder, width: 1.2 },
    rectRadius: 0.08
  });
  s10.addText('www.vytron.me', {
    x: rightX + 0.2, y: 4.25, w: 2.5, h: 0.42,
    fontSize: 11, bold: true, color: C.green,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0
  });

  addSlideFooter(s10);
  s10.addNotes('Judges, the greenest device is the one that is already in your hand. FixGrid gives consumers the trust, escrow, and warranty they need, while empowering local repair heroes. Scan the QR code or open vytron.me right now on your mobile. Thank you!');
}

// Output file path
const outputPath = path.resolve('FixGrid_Hackathon_Pitch_Deck.pptx');

pres.writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`SUCCESS: Pitch deck generated at: ${outputPath}`);
  })
  .catch((err) => {
    console.error(`ERROR writing presentation:`, err);
    process.exit(1);
  });
