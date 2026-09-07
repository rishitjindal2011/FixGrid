const pptxgen = require('pptxgenjs');
const path = require('path');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10.0" x 5.625"

// Image absolute paths
const imgSafeProbe = path.resolve('safeprobe_wand.jpg');
const imgWebDesktop = path.resolve('fixgrid_website_desktop.png');
const imgQRScan = path.resolve('fixgrid_qr_scan.jpg');

// Sleek Dark Keynote Color Palette (Hex WITHOUT #)
const C = {
  bg: '090D16',            // Deep Obsidian Navy
  card: '111827',          // Slate Dark Surface
  cardSubtle: '172033',    // Elevated Container
  cardHighlight: '1E293B', // High-Contrast Card
  
  border: '1F293D',        // Subtle Separator
  borderLight: '2E3D59',   // Card Border
  
  textWhite: 'FFFFFF',     // Headers & Primary Text
  textBody: 'CBD5E1',      // Body Text
  textMuted: '94A3B8',     // Subtitles & Captions
  textDim: '64748B',       // Footers & Metadata
  
  cyan: '38BDF8',          // Electric Sky Blue
  cyanBorder: '0284C7',
  cyanBg: '0B253A',
  
  emerald: '34D399',       // Neon Mint / Emerald
  emeraldBorder: '059669',
  emeraldBg: '07291E',
  
  purple: 'A78BFA',        // Lavender / Violet
  purpleBorder: '7C3AED',
  purpleBg: '23153C',
  
  rose: 'FB7185',          // Rose / Coral Red
  roseBorder: 'E11D48',
  roseBg: '2A0E17',
  
  amber: 'FBBF24',         // Warm Amber / Gold
  amberBorder: 'D97706',
  amberBg: '2B1D06'
};

// Helper: Add consistent Keynote header
function addSlideHeader(slide, kicker, title, slideNum) {
  // Category Kicker
  slide.addText(`// ${kicker}`, {
    x: 0.6, y: 0.45, w: 7.0, h: 0.22,
    fontSize: 9, bold: true, color: C.cyan, fontFace: 'Calibri'
  });
  // Pagination Pill on Top Right
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 8.4, y: 0.42, w: 1.0, h: 0.24,
    fill: { color: C.cardSubtle },
    line: { color: C.border, width: 1 },
    rectRadius: 0.12
  });
  slide.addText(`[ ${slideNum} / 08 ]`, {
    x: 8.4, y: 0.42, w: 1.0, h: 0.24,
    fontSize: 8.5, bold: true, color: C.textMuted,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });
  // Slide Main Title
  slide.addText(title, {
    x: 0.6, y: 0.7, w: 8.8, h: 0.48,
    fontSize: 23, bold: true, color: C.textWhite, fontFace: 'Cambria'
  });
}

// Helper: Add consistent Keynote footer
function addSlideFooter(slide) {
  // Subtle divider line
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 5.0, w: 8.8, h: 0.01,
    fill: { color: C.border },
    line: { color: C.border, width: 0.5 }
  });
  // Left: Brand
  slide.addText([
    { text: 'FixGrid Ecosystem  •  ', options: { bold: true, color: C.textMuted } },
    { text: 'www.vytron.me', options: { bold: true, color: C.cyan } }
  ], {
    x: 0.6, y: 5.08, w: 4.0, h: 0.25,
    fontSize: 9, fontFace: 'Calibri'
  });
  // Center: Core Tech
  slide.addText('Live Web Platform  +  SafeProbe™ Frugal Diagnostics', {
    x: 3.5, y: 5.08, w: 3.5, h: 0.25,
    fontSize: 8.5, color: C.textDim, align: 'center', fontFace: 'Calibri'
  });
  // Right: Mission
  slide.addText('Right-to-Repair & Circular Economy', {
    x: 6.8, y: 5.08, w: 2.6, h: 0.25,
    fontSize: 9, color: C.textMuted, align: 'right', fontFace: 'Calibri'
  });
}

// ==========================================
// SLIDE 1: HERO TITLE (Dark Keynote Showcase)
// ==========================================
{
  const s1 = pres.addSlide();
  s1.background = { color: C.bg };

  // Top Category Pill
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 0.6, w: 3.9, h: 0.3,
    fill: { color: C.cardSubtle },
    line: { color: C.borderLight, width: 1 },
    rectRadius: 0.15
  });
  s1.addText('Right-to-Repair & Circular Economy Platform', {
    x: 0.6, y: 0.6, w: 3.9, h: 0.3,
    fontSize: 9, bold: true, color: C.cyan,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  // Main Title & Subtitle on Left
  s1.addText('FixGrid & SafeProbe™', {
    x: 0.6, y: 1.05, w: 4.8, h: 1.05,
    fontSize: 38, bold: true, color: C.textWhite,
    fontFace: 'Cambria', valign: 'middle'
  });

  s1.addText('The Complete Ecosystem: A Live Web Platform (www.vytron.me) & A Frugal Handheld Diagnostic Wand Championing Sustainable Electronics Repair', {
    x: 0.6, y: 2.18, w: 4.8, h: 0.85,
    fontSize: 12, color: C.textMuted,
    fontFace: 'Calibri', lineSpacingMultiple: 1.2
  });

  // 3 Value Proposition Chips
  const heroBadges = [
    { text: '✓  Live Digital Platform: Neighborhood search, escrow & warranties', color: C.cyan },
    { text: '✓  Physical Innovation: Under ₹1,200 SafeProbe™ diagnostic wand', color: C.emerald },
    { text: '✓  Dual-Loop QR Warranty: Tamper-evident seals with photo proof', color: C.purple }
  ];
  heroBadges.forEach((b, i) => {
    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 3.25 + (i * 0.44), w: 4.8, h: 0.35,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.06
    });
    s1.addText(b.text, {
      x: 0.75, y: 3.25 + (i * 0.44), w: 4.5, h: 0.35,
      fontSize: 9.5, bold: true, color: b.color,
      valign: 'middle', fontFace: 'Calibri'
    });
  });

  // Dual Visual Mockups on Right Side
  // Top: Desktop Website Mockup (w: 3.8", h: 2.0")
  s1.addImage({
    path: imgWebDesktop,
    x: 5.6, y: 0.65, w: 3.8, h: 2.05,
    rounding: true
  });
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.6, y: 0.65, w: 3.8, h: 2.05,
    fill: { type: 'none' },
    line: { color: C.cyanBorder, width: 1.5 },
    rectRadius: 0.08
  });
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.75, y: 2.45, w: 2.3, h: 0.22,
    fill: { color: C.bg },
    line: { color: C.cyanBorder, width: 1 },
    rectRadius: 0.11
  });
  s1.addText('Live Platform: www.vytron.me', {
    x: 5.75, y: 2.45, w: 2.3, h: 0.22,
    fontSize: 8, bold: true, color: C.cyan,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  // Bottom: SafeProbe Prototype Photo (w: 3.8", h: 1.85")
  s1.addImage({
    path: imgSafeProbe,
    x: 5.6, y: 2.8, w: 3.8, h: 1.85,
    rounding: true
  });
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.6, y: 2.8, w: 3.8, h: 1.85,
    fill: { type: 'none' },
    line: { color: C.emeraldBorder, width: 1.5 },
    rectRadius: 0.08
  });
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.75, y: 4.38, w: 2.5, h: 0.22,
    fill: { color: C.bg },
    line: { color: C.emeraldBorder, width: 1 },
    rectRadius: 0.11
  });
  s1.addText('SafeProbe™ Working Prototype', {
    x: 5.75, y: 4.38, w: 2.5, h: 0.22,
    fontSize: 8, bold: true, color: C.emerald,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  addSlideFooter(s1);
  s1.addNotes('Welcome. FixGrid unites a live web marketplace with a low-cost physical diagnostic wand, solving both the digital trust void and the technical hardware diagnostic barrier.');
}

// ==========================================
// SLIDE 2: EXECUTIVE SUMMARY (Dual-Pillar Architecture)
// ==========================================
{
  const s2 = pres.addSlide();
  s2.background = { color: C.bg };
  addSlideHeader(s2, '02 • EXECUTIVE SUMMARY', 'The Two-Pillar Repair Ecosystem', '02');

  // Pillar 1: Web Platform Container
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.35, w: 4.25, h: 2.65,
    fill: { color: C.card },
    line: { color: C.border, width: 1 },
    rectRadius: 0.08
  });
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 1.5, w: 1.7, h: 0.24,
    fill: { color: C.cyanBg },
    line: { color: C.cyanBorder, width: 1 },
    rectRadius: 0.04
  });
  s2.addText('PILLAR 1: WEB PLATFORM', {
    x: 0.8, y: 1.5, w: 1.7, h: 0.24,
    fontSize: 8, bold: true, color: C.cyan, align: 'center', valign: 'middle', fontFace: 'Calibri'
  });
  s2.addText('FixGrid Digital Trust Web Network', {
    x: 0.8, y: 1.82, w: 3.85, h: 0.28,
    fontSize: 13, bold: true, color: C.textWhite, fontFace: 'Calibri'
  });
  s2.addText([
    { text: 'Live Web Platform: Hyper-local directory with real-time shop hours and 21 repair categories.', options: { bullet: true } },
    { text: 'Smart Escrow: Funds held securely and released only after verified customer satisfaction.', options: { bullet: true } },
    { text: 'Platform-Backed Warranty: 5-day standard warranty + digital shopkeeper warranty records.', options: { bullet: true } },
    { text: 'Artisan Cashback: 5% completed-bill rebate rewarding honest local craftsmanship.', options: { bullet: true } }
  ], {
    x: 0.8, y: 2.15, w: 3.85, h: 1.7,
    fontSize: 9.2, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15, paraSpaceAfter: 4
  });

  // Pillar 2: Hardware Container
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.15, y: 1.35, w: 4.25, h: 2.65,
    fill: { color: C.card },
    line: { color: C.border, width: 1 },
    rectRadius: 0.08
  });
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.35, y: 1.5, w: 1.7, h: 0.24,
    fill: { color: C.emeraldBg },
    line: { color: C.emeraldBorder, width: 1 },
    rectRadius: 0.04
  });
  s2.addText('PILLAR 2: HARDWARE', {
    x: 5.35, y: 1.5, w: 1.7, h: 0.24,
    fontSize: 8, bold: true, color: C.emerald, align: 'center', valign: 'middle', fontFace: 'Calibri'
  });
  s2.addText('SafeProbe™ Smart Diagnostic Wand', {
    x: 5.35, y: 1.82, w: 3.85, h: 0.28,
    fontSize: 13, bold: true, color: C.textWhite, fontFace: 'Calibri'
  });
  s2.addText([
    { text: 'Frugal Tool BOM: Built for under ₹1,200 ($14), replacing ₹1.5L lab oscilloscopes.', options: { bullet: true } },
    { text: 'Instant Micro-Touch Sensing: Precision needle probe tests trace impedance with audio chirp & OLED color.', options: { bullet: true } },
    { text: '5MP Macro Camera Microscope: Snaps magnified photo proof sent straight to customer’s phone.', options: { bullet: true } },
    { text: 'Dual-Loop QR Passport: Issues physical tamper-evident QR void seals linked to cloud warranty.', options: { bullet: true } }
  ], {
    x: 5.35, y: 2.15, w: 3.85, h: 1.7,
    fontSize: 9.2, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15, paraSpaceAfter: 4
  });

  // Bottom 4 Stat Chips
  const stats = [
    { val: 'www.vytron.me', label: 'Live Web Platform', bg: C.cyanBg, border: C.cyanBorder, color: C.cyan, x: 0.6, w: 2.1 },
    { val: '₹1,200 BOM', label: 'SafeProbe Hardware', bg: C.emeraldBg, border: C.emeraldBorder, color: C.emerald, x: 2.9, w: 2.1 },
    { val: '5MP Macro', label: 'Customer Photo Proof', bg: C.purpleBg, border: C.purpleBorder, color: C.purple, x: 5.2, w: 2.0 },
    { val: 'Zero E-Waste', label: 'Circular Economy Goal', bg: C.roseBg, border: C.roseBorder, color: C.rose, x: 7.4, w: 2.0 }
  ];

  stats.forEach(st => {
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: st.x, y: 4.15, w: st.w, h: 0.72,
      fill: { color: st.bg },
      line: { color: st.border, width: 1 },
      rectRadius: 0.08
    });
    s2.addText(st.val, {
      x: st.x, y: 4.2, w: st.w, h: 0.32,
      fontSize: 13, bold: true, color: st.color, align: 'center', fontFace: 'Calibri'
    });
    s2.addText(st.label, {
      x: st.x, y: 4.54, w: st.w, h: 0.25,
      fontSize: 8, bold: true, color: C.textMuted, align: 'center', fontFace: 'Calibri'
    });
  });

  addSlideFooter(s2);
  s2.addNotes('FixGrid operates as a dual-pillar innovation: a live web platform providing escrow, directory discovery, and warranties, coupled with the SafeProbe handheld hardware wand for roadside mechanics.');
}

// ==========================================
// SLIDE 3: PROBLEM STATEMENT (The Dual Barrier)
// ==========================================
{
  const s3 = pres.addSlide();
  s3.background = { color: C.bg };
  addSlideHeader(s3, '03 • THE CHALLENGE', 'The Throwaway Culture & The Diagnostic Void', '03');

  // Top Two Contrast Cards
  s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.35, w: 4.25, h: 2.05,
    fill: { color: C.roseBg },
    line: { color: C.roseBorder, width: 1 },
    rectRadius: 0.08
  });
  s3.addText('1. The Trust & Visibility Void', {
    x: 0.8, y: 1.48, w: 3.85, h: 0.28,
    fontSize: 12.5, bold: true, color: C.rose, fontFace: 'Calibri'
  });
  s3.addText([
    { text: 'Consumers discard repairable electronics assuming replacement is the only safe option.', options: { bullet: true } },
    { text: 'Roadside repair artisans lack digital storefronts, standardized pricing, and formal warranty tracking.', options: { bullet: true } },
    { text: 'Consumers fear arbitrary overcharging, counterfeit parts, and shoddy workmanship.', options: { bullet: true } }
  ], {
    x: 0.8, y: 1.8, w: 3.85, h: 1.45,
    fontSize: 9.2, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15, paraSpaceAfter: 4
  });

  s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.15, y: 1.35, w: 4.25, h: 2.05,
    fill: { color: C.roseBg },
    line: { color: C.roseBorder, width: 1 },
    rectRadius: 0.08
  });
  s3.addText('2. The Hardware Diagnostic Void (Root Cause)', {
    x: 5.35, y: 1.48, w: 3.85, h: 0.28,
    fontSize: 12.5, bold: true, color: C.rose, fontFace: 'Calibri'
  });
  s3.addText([
    { text: 'Lab oscilloscopes & inspection microscopes cost ₹1,00,000 to ₹1,50,000—unaffordable for local mechanics.', options: { bullet: true } },
    { text: 'Crude multimeters cause accidental voltage spikes, frying delicate microprocessors.', options: { bullet: true } },
    { text: 'Micro-faults are invisible to naked eyes; without photo proof, consumers distrust technicians.', options: { bullet: true } }
  ], {
    x: 5.35, y: 1.8, w: 3.85, h: 1.45,
    fontSize: 9.2, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15, paraSpaceAfter: 4
  });

  // Bottom 3 Impact Callouts with bold metrics
  const impacts = [
    { stat: '₹1.2L Cr', title: 'THE LOST VALUE', desc: 'Billions wasted buying new replacements when only a ₹50 micro-component had failed.', color: C.rose, x: 0.6 },
    { stat: '85%+', title: 'SKILLED HEROES OVERLOOKED', desc: 'Vast majority of neighborhood repairers remain informal, uncertified, and underpaid.', color: C.amber, x: 3.6 },
    { stat: 'Millions', title: 'E-WASTE CATASTROPHE', desc: 'Repairable electronics flood municipal landfills, generating toxic heavy metal contamination.', color: C.purple, x: 6.6 }
  ];

  impacts.forEach(im => {
    s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: im.x, y: 3.55, w: 2.8, h: 1.35,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s3.addText(im.stat, {
      x: im.x + 0.15, y: 3.65, w: 2.5, h: 0.32,
      fontSize: 16, bold: true, color: im.color, fontFace: 'Calibri'
    });
    s3.addText(im.title, {
      x: im.x + 0.15, y: 3.98, w: 2.5, h: 0.22,
      fontSize: 9, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s3.addText(im.desc, {
      x: im.x + 0.15, y: 4.22, w: 2.5, h: 0.6,
      fontSize: 8.5, color: C.textMuted, fontFace: 'Calibri', lineSpacingMultiple: 1.15
    });
  });

  addSlideFooter(s3);
  s3.addNotes('The problem requires solving both ends: fixing the trust void with our web platform and fixing the diagnostic barrier with our handheld probe.');
}

// ==========================================
// SLIDE 4: THE HARDWARE INVENTION (SAFEPROBE SHOWCASE)
// ==========================================
{
  const s4 = pres.addSlide();
  s4.background = { color: C.bg };
  addSlideHeader(s4, '04 • HARDWARE INNOVATION', 'SafeProbe™: Lab Diagnostics in a Handheld Wand', '04');

  // Left Side: Product Photo
  s4.addImage({
    path: imgSafeProbe,
    x: 0.6, y: 1.35, w: 4.1, h: 3.5,
    rounding: true
  });
  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.35, w: 4.1, h: 3.5,
    fill: { type: 'none' },
    line: { color: C.cyanBorder, width: 1.5 },
    rectRadius: 0.08
  });
  s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 4.45, w: 3.7, h: 0.28,
    fill: { color: C.bg },
    line: { color: C.border, width: 1 },
    rectRadius: 0.14
  });
  s4.addText('SafeProbe™ Working Prototype (₹1,200 / $14 BOM)', {
    x: 0.8, y: 4.45, w: 3.7, h: 0.28,
    fontSize: 8.5, bold: true, color: C.cyan,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  // Right Side: 3 Feature Callout Cards
  const features = [
    {
      badge: 'MICRO-TOUCH SENSING',
      title: 'Instant Fault Chirp',
      pillBg: C.cyanBg,
      pillBorder: C.cyanBorder,
      pillColor: C.cyan,
      desc: 'Technician touches probe needle to circuit trace. Conducts rapid impedance testing in milliseconds, beeping and lighting Green (Normal) or Red (Fault) on OLED screen. Safe sub-3.3V (<5mA) sensing prevents static shock.',
      y: 1.35
    },
    {
      badge: 'MAGNIFIED VISUALS',
      title: '5MP Macro Photo Proof',
      pillBg: C.purpleBg,
      pillBorder: C.purpleBorder,
      pillColor: C.purple,
      desc: 'Integrated 5MP macro camera with polarized ring LEDs captures 10x close-up photos of burned ICs or cracked solder joints, sending undeniable visual proof straight to the customer’s smartphone before soldering.',
      y: 2.55
    },
    {
      badge: 'DIGITAL PASSPORT',
      title: 'Dual-Loop QR Warranty',
      pillBg: C.emeraldBg,
      pillBorder: C.emeraldBorder,
      pillColor: C.emerald,
      desc: 'Tool writes a physical tamper-evident QR void seal placed over gadget seam. Customer scans to review diagnostic readings, before/after photos, and activates a guaranteed 30-day digital warranty.',
      y: 3.75
    }
  ];

  features.forEach(f => {
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.9, y: f.y, w: 4.5, h: 1.1,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.05, y: f.y + 0.1, w: 1.8, h: 0.2,
      fill: { color: f.pillBg },
      line: { color: f.pillBorder, width: 1 },
      rectRadius: 0.04
    });
    s4.addText(f.badge, {
      x: 5.05, y: f.y + 0.1, w: 1.8, h: 0.2,
      fontSize: 7.5, bold: true, color: f.pillColor, align: 'center', valign: 'middle', fontFace: 'Calibri'
    });
    s4.addText(f.title, {
      x: 6.95, y: f.y + 0.08, w: 2.3, h: 0.24,
      fontSize: 11.5, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s4.addText(f.desc, {
      x: 5.05, y: f.y + 0.35, w: 4.2, h: 0.68,
      fontSize: 8.8, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15
    });
  });

  addSlideFooter(s4);
  s4.addNotes('SafeProbe provides three capabilities in one wand: micro-touch fault sensing with instant beeps, macro photo proof sent to the phone, and a tamper-evident digital warranty seal.');
}

// ==========================================
// SLIDE 5: THE DIGITAL PLATFORM (WEBSITE SHOWCASE)
// ==========================================
{
  const s5 = pres.addSlide();
  s5.background = { color: C.bg };
  addSlideHeader(s5, '05 • DIGITAL PLATFORM', 'FixGrid Web Platform (www.vytron.me)', '05');

  // Left Side: 3 Software Capabilities Cards (w: 4.5")
  const webFeatures = [
    {
      title: 'Hyper-Local Search & Map Engine',
      desc: 'Allows consumers to discover verified repair shops within walking distance across 21 repair categories (Phones, Laptops, Appliances, Watches) with live opening-hour status.',
      tag: 'Next.js 16 + Leaflet Map Engine',
      y: 1.35
    },
    {
      title: 'Smart Escrow & Payment Protection',
      desc: 'Customer payments are locked securely on the platform upon booking and released to the shopkeeper only after the customer inspects and signs off on verified satisfaction.',
      tag: 'Supabase PostgreSQL Triggers & RLS',
      y: 2.55
    },
    {
      title: 'Artisan Storefronts & 5% Cashback',
      desc: 'Provides informal repair mechanics with instant SEO-indexed digital profiles, verified reviews, diagnostic log uploads, and a 5% completed-bill cashback incentive.',
      tag: 'Shopkeeper Empowerment Engine',
      y: 3.75
    }
  ];

  webFeatures.forEach(wf => {
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: wf.y, w: 4.4, h: 1.1,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s5.addText(wf.title, {
      x: 0.75, y: wf.y + 0.1, w: 4.1, h: 0.24,
      fontSize: 11.5, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s5.addText(wf.desc, {
      x: 0.75, y: wf.y + 0.35, w: 4.1, h: 0.48,
      fontSize: 8.5, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15
    });
    s5.addText('• ' + wf.tag, {
      x: 0.75, y: wf.y + 0.85, w: 4.1, h: 0.18,
      fontSize: 7.5, bold: true, color: C.cyan, fontFace: 'Calibri'
    });
  });

  // Right Side: Live Website Desktop Screenshot in a Sleek Browser Mockup Frame (w: 4.2", h: 3.5")
  s5.addImage({
    path: imgWebDesktop,
    x: 5.2, y: 1.35, w: 4.2, h: 3.2,
    rounding: true
  });
  s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.2, y: 1.35, w: 4.2, h: 3.2,
    fill: { type: 'none' },
    line: { color: C.cyanBorder, width: 1.5 },
    rectRadius: 0.08
  });
  // Caption Pill
  s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.4, y: 4.4, w: 3.8, h: 0.28,
    fill: { color: C.bg },
    line: { color: C.border, width: 1 },
    rectRadius: 0.14
  });
  s5.addText('Live Production Platform at www.vytron.me', {
    x: 5.4, y: 4.4, w: 3.8, h: 0.28,
    fontSize: 8.5, bold: true, color: C.cyan,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  addSlideFooter(s5);
  s5.addNotes('Here is our live website at www.vytron.me: featuring 21 repair categories, real-time shop hours, smart escrow, and verified local shop listings.');
}

// ==========================================
// SLIDE 6: THE SYNERGY (DUAL-LOOP QR WARRANTY)
// ==========================================
{
  const s6 = pres.addSlide();
  s6.background = { color: C.bg };
  addSlideHeader(s6, '06 • HARDWARE-SOFTWARE BRIDGE', 'Dual-Loop QR Digital Product Passport', '06');

  // Left Side: Real Photo of Smartphone Scanning Holographic Void Sticker
  s6.addImage({
    path: imgQRScan,
    x: 0.6, y: 1.35, w: 4.1, h: 3.5,
    rounding: true
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.35, w: 4.1, h: 3.5,
    fill: { type: 'none' },
    line: { color: C.emeraldBorder, width: 1.5 },
    rectRadius: 0.08
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 4.45, w: 3.7, h: 0.28,
    fill: { color: C.bg },
    line: { color: C.border, width: 1 },
    rectRadius: 0.14
  });
  s6.addText('Tamper-Evident Seal + Instant Smartphone Scan', {
    x: 0.8, y: 4.45, w: 3.7, h: 0.28,
    fontSize: 8.5, bold: true, color: C.emerald,
    align: 'center', valign: 'middle', fontFace: 'Calibri'
  });

  // Right Side: 3 Synergy Steps
  const synergySteps = [
    {
      num: 'STEP 01',
      title: 'SafeProbe Diagnostics Upload',
      desc: 'When the technician repairs the gadget, the SafeProbe wand syncs the passing impedance test and high-res macro photos directly to the FixGrid cloud database via ESP32 Wi-Fi/BLE.',
      y: 1.35
    },
    {
      num: 'STEP 02',
      title: 'Physical Holographic Void Seal',
      desc: 'A serialized, tamper-evident holographic QR void sticker is printed and affixed over the device seam. If anyone attempts to tamper with or open the device, the physical pattern breaks.',
      y: 2.55
    },
    {
      num: 'STEP 03',
      title: 'Customer Scan & Warranty Activation',
      desc: 'The customer scans the QR code with any standard smartphone camera. It displays component before/after photos, diagnostic health logs, and activates an ironclad 30-day digital warranty certificate.',
      y: 3.75
    }
  ];

  synergySteps.forEach(st => {
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.9, y: st.y, w: 4.5, h: 1.1,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s6.addText(st.num, {
      x: 5.05, y: st.y + 0.1, w: 1.5, h: 0.18,
      fontSize: 7.5, bold: true, color: C.emerald, fontFace: 'Calibri'
    });
    s6.addText(st.title, {
      x: 5.05, y: st.y + 0.28, w: 4.2, h: 0.24,
      fontSize: 11.5, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s6.addText(st.desc, {
      x: 5.05, y: st.y + 0.52, w: 4.2, h: 0.52,
      fontSize: 8.5, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15
    });
  });

  addSlideFooter(s6);
  s6.addNotes('This is where the magic happens: the SafeProbe hardware records the repair, generates a tamper-evident holographic QR seal, and the customer scans it on their phone to see verified before-and-after photos and activate their warranty.');
}

// ==========================================
// SLIDE 7: TRIPLE BOTTOM LINE & MARKET MODEL
// ==========================================
{
  const s7 = pres.addSlide();
  s7.background = { color: C.bg };
  addSlideHeader(s7, '07 • IMPACT & SCALABILITY', 'Tapping the $15.2B Repair Economy', '07');

  // Left Side: Triple Bottom Line Impact (w: 4.3")
  const tblBlocks = [
    {
      metric: '60–80%',
      title: 'ECONOMIC (Consumer & Artisan)',
      desc: 'Consumers save 60–80% compared to purchasing new devices. Local mechanics gain formal digital identity, repeat customers, and higher daily earnings.',
      color: C.cyan, bg: C.cyanBg, border: C.cyanBorder, y: 1.35
    },
    {
      metric: '100%',
      title: 'SOCIAL (Community Dignity)',
      desc: 'Brings unorganized street artisans into the formal digital economy, elevating informal mechanics with lab-grade diagnostic tools and transparent trust.',
      color: C.purple, bg: C.purpleBg, border: C.purpleBorder, y: 2.55
    },
    {
      metric: 'Zero',
      title: 'ECOLOGICAL (Planet Circularity)',
      desc: 'Diverts hundreds of kilograms of toxic printed circuit boards and lithium batteries from municipal landfills, cutting manufacturing carbon emissions.',
      color: C.emerald, bg: C.emeraldBg, border: C.emeraldBorder, y: 3.75
    }
  ];

  tblBlocks.forEach(b => {
    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: b.y, w: 4.1, h: 1.1,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s7.addText(b.metric, {
      x: 0.75, y: b.y + 0.08, w: 1.2, h: 0.32,
      fontSize: 15, bold: true, color: b.color, fontFace: 'Calibri'
    });
    s7.addText(b.title, {
      x: 2.0, y: b.y + 0.12, w: 2.55, h: 0.22,
      fontSize: 8, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s7.addText(b.desc, {
      x: 0.75, y: b.y + 0.42, w: 3.8, h: 0.62,
      fontSize: 8.2, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15
    });
  });

  // Right Side: 4 Revenue Streams (w: 4.5")
  const streams = [
    { title: '1. Platform Take-Rate (5–8%)', desc: 'Competitive transaction fee on every escrow-verified repair booking.' },
    { title: '2. Customer Care+ Subscription (₹199/mo | ₹1,499/yr)', desc: 'Household repair pass: free SafeProbe diagnostics, zero booking fees & 60-day warranty.' },
    { title: '3. Shop Pro SaaS & Hardware Tier (₹999/mo)', desc: 'SafeProbe firmware updates, warranty management, digital store CRM & analytics.' },
    { title: '4. Certified Spare Parts Logistics', desc: 'Curated B2B marketplace revenue for verified authentic micro-components.' }
  ];

  streams.forEach((st, i) => {
    const yPos = 1.35 + i * 0.88;
    s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.9, y: yPos, w: 4.5, h: 0.8,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.08
    });
    s7.addText(st.title, {
      x: 5.05, y: yPos + 0.08, w: 4.2, h: 0.26,
      fontSize: 10, bold: true, color: C.amber, fontFace: 'Calibri'
    });
    s7.addText(st.desc, {
      x: 5.05, y: yPos + 0.35, w: 4.2, h: 0.38,
      fontSize: 8.5, color: C.textBody, fontFace: 'Calibri'
    });
  });

  addSlideFooter(s7);
  s7.addNotes('Our model creates value for everyone: consumers save money, informal mechanics earn reliable livelihoods, and FixGrid monetizes through transaction fees and subscriptions.');
}

// ==========================================
// SLIDE 8: CONCLUSION & ROADMAP (Dark Theme Closer)
// ==========================================
{
  const s8 = pres.addSlide();
  s8.background = { color: C.bg };
  addSlideHeader(s8, '08 • THE FUTURE ROADMAP', 'A Movement Towards a Sustainable Repair Economy', '08');

  // 3-Phase Roadmap Cards
  const phases = [
    {
      step: '01',
      tag: 'PHASE 1 (MONTHS 1–6)',
      tagColor: C.cyan,
      title: 'Pilot Repair Clusters',
      points: [
        'Deploy 50 SafeProbe units across Mumbai electronics repair markets.',
        'Validate web escrow & before/after macro photo flow with 1,000+ customer repairs.'
      ],
      x: 0.6
    },
    {
      step: '02',
      tag: 'PHASE 2 (MONTHS 7–12)',
      tagColor: C.purple,
      title: 'Community Drives',
      points: [
        'Partner with schools & colleges for zero-e-waste community repair clinics.',
        'Roll out Customer Care+ subscription pass and certified technician onboarding.'
      ],
      x: 3.6
    },
    {
      step: '03',
      tag: 'PHASE 3 (YEAR 2+)',
      tagColor: C.emerald,
      title: 'Municipal Scaling',
      points: [
        'Integrate with municipal e-waste boards for certified gadget triage.',
        'Scale frugal SafeProbe tool manufacturing to local repairers nationwide.'
      ],
      x: 6.6
    }
  ];

  phases.forEach(ph => {
    s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: ph.x, y: 1.35, w: 2.8, h: 2.25,
      fill: { color: C.card },
      line: { color: C.border, width: 1 },
      rectRadius: 0.1
    });
    // Step Number
    s8.addText(ph.step, {
      x: ph.x + 0.15, y: 1.45, w: 0.6, h: 0.35,
      fontSize: 16, bold: true, color: ph.tagColor, fontFace: 'Calibri'
    });
    s8.addText(ph.tag, {
      x: ph.x + 0.75, y: 1.48, w: 1.9, h: 0.25,
      fontSize: 8, bold: true, color: C.textMuted, fontFace: 'Calibri'
    });
    s8.addText(ph.title, {
      x: ph.x + 0.15, y: 1.82, w: 2.5, h: 0.3,
      fontSize: 13, bold: true, color: C.textWhite, fontFace: 'Calibri'
    });
    s8.addText(ph.points.map(p => ({ text: p, options: { bullet: true } })), {
      x: ph.x + 0.15, y: 2.18, w: 2.5, h: 1.3,
      fontSize: 9.5, color: C.textBody, fontFace: 'Calibri', lineSpacingMultiple: 1.15, paraSpaceAfter: 4
    });
  });

  // Bottom Unified Summary Card
  s8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 3.85, w: 8.8, h: 1.05,
    fill: { color: C.cardSubtle },
    line: { color: C.borderLight, width: 1 },
    rectRadius: 0.1
  });
  s8.addText('FixGrid & SafeProbe™ Ecosystem', {
    x: 0.85, y: 3.98, w: 5.5, h: 0.3,
    fontSize: 13, bold: true, color: C.textWhite, fontFace: 'Calibri'
  });
  s8.addText('A Unified Web & Hardware Solution for Right-to-Repair, Consumer Trust & Circular Sustainability', {
    x: 0.85, y: 4.3, w: 5.5, h: 0.45,
    fontSize: 9.5, color: C.textMuted, fontFace: 'Calibri'
  });

  s8.addText('Project FixGrid', {
    x: 6.5, y: 3.98, w: 2.7, h: 0.3,
    fontSize: 13, bold: true, color: C.cyan, align: 'right', fontFace: 'Calibri'
  });
  s8.addText('www.vytron.me', {
    x: 6.5, y: 4.3, w: 2.7, h: 0.3,
    fontSize: 10.5, bold: true, color: C.purple, align: 'right', fontFace: 'Calibri'
  });

  addSlideFooter(s8);
  s8.addNotes('Thank you. FixGrid and SafeProbe demonstrate that with frugal engineering and digital trust, we can empower local artisans, save consumers money, and protect our environment from toxic e-waste.');
}

// Write the presentation file
const outputPath = path.resolve('FixGrid_Innovation_Presentation.pptx');
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log('Presentation created successfully:', outputPath);
}).catch(err => {
  console.error('Error generating presentation:', err);
  process.exit(1);
});
