const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function renderPdf() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FixGrid Hackathon Synopsis</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
  
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 14mm 14mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1E293B;
    background-color: #FFFFFF;
    font-size: 9pt;
    line-height: 1.48;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header-card {
    background: #0F172A;
    border-radius: 10px;
    padding: 16px 20px;
    color: #FFFFFF;
    margin-bottom: 14px;
    border: 1px solid #334155;
  }

  .kicker-tag {
    display: inline-block;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #34D399;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .header-title {
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.15;
    margin-bottom: 4px;
    color: #FFFFFF;
  }

  .header-sub {
    font-size: 9.5pt;
    font-weight: 500;
    color: #94A3B8;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .header-meta {
    display: flex;
    gap: 16px;
    font-size: 8pt;
    color: #CBD5E1;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 8px;
  }

  .header-meta strong {
    color: #34D399;
  }

  .section {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }

  .section-kicker {
    font-size: 7.5pt;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 2px;
  }

  .section-title {
    font-size: 11.5pt;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.2px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .section-title::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 14px;
    background: #059669;
    border-radius: 2px;
  }

  .callout-box {
    background: #F8FAFC;
    border-left: 3.5px solid #059669;
    border-radius: 0 8px 8px 0;
    padding: 10px 14px;
    margin-bottom: 10px;
    font-size: 8.8pt;
    color: #334155;
    line-height: 1.45;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 10px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 10px;
  }

  .card {
    background: #FFFFFF;
    border-radius: 8px;
    padding: 10px 12px;
    border: 1px solid #E2E8F0;
  }

  .card-problem-red {
    background: #FEF2F2;
    border: 1px solid #FECACA;
  }
  .card-problem-amber {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
  }
  .card-problem-green {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
  }

  .card-stat {
    font-size: 16pt;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 2px;
  }
  .stat-red { color: #DC2626; }
  .stat-amber { color: #D97706; }
  .stat-green { color: #059669; }
  .stat-blue { color: #0F172A; }

  .card-stat-label {
    font-size: 7.5pt;
    font-weight: 600;
    color: #64748B;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .card-h {
    font-size: 9.5pt;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 4px;
  }

  .card-p {
    font-size: 8.2pt;
    color: #475569;
    line-height: 1.35;
  }

  .pillar-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 8px 10px;
  }

  .pillar-num {
    display: inline-block;
    font-size: 7pt;
    font-weight: 800;
    color: #059669;
    background: #ECFDF5;
    padding: 1px 5px;
    border-radius: 3px;
    margin-bottom: 3px;
  }

  .pillar-title {
    font-size: 8.8pt;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 3px;
  }

  .pillar-desc {
    font-size: 8pt;
    color: #475569;
    line-height: 1.35;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 8.2pt;
  }

  th {
    background: #0F172A;
    color: #FFFFFF;
    text-align: left;
    padding: 6px 10px;
    font-weight: 700;
    font-size: 7.8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    padding: 6px 10px;
    border-bottom: 1px solid #E2E8F0;
    vertical-align: top;
    color: #334155;
    line-height: 1.35;
  }

  tr:nth-child(even) td {
    background-color: #F8FAFC;
  }

  .live-box {
    background: #0F172A;
    border-radius: 8px;
    padding: 10px 14px;
    color: #FFFFFF;
    border: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .live-pill {
    display: inline-block;
    background: #059669;
    color: #FFFFFF;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    margin-bottom: 3px;
  }

  .page-break {
    page-break-after: always;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-card">
    <div class="kicker-tag">HACKATHON EXECUTIVE SYNOPSIS  •  CIRCULAR ECONOMY & FINTECH</div>
    <div class="header-title">FixGrid: Decentralized Trust & Warranty Infrastructure</div>
    <div class="header-sub">Rewiring the $15.2B Local Repair Economy Through Milestone Smart Escrow & Platform Guarantees</div>
    <div class="header-meta">
      <div><strong>Live Platform:</strong> www.vytron.me</div>
      <div><strong>Architecture:</strong> Next.js 16 (App Router) • Supabase PostgreSQL • Leaflet Engine</div>
      <div><strong>Mission:</strong> Right-to-Repair & Zero-Waste Circular Economy</div>
    </div>
  </div>

  <!-- 1. EXECUTIVE SUMMARY -->
  <div class="section">
    <div class="section-kicker">01. EXECUTIVE SUMMARY</div>
    <div class="section-title">Bridging Everyday Consumers with Neighborhood Repair Artisans</div>
    <div class="callout-box">
      Every year, millions of smartphones, home appliances, laptops, and wearables are discarded prematurely. Consumers spend hundreds of billions of rupees replacing items that could be repaired for less than 15% of replacement cost. This throwaway cycle is not fueled by laziness—it is driven by an acute <strong>Trust and Information Asymmetry</strong>. Consumers fear arbitrary price gouging, counterfeit parts, component swapping, and zero post-repair warranty. Simultaneously, skilled neighborhood technicians—the true frontline artisans of the circular economy—remain digitally invisible and economically marginalized.<br><br>
      <strong>FixGrid</strong> is a full-stack trust infrastructure that solves this market failure. By combining a <strong>Milestone-Based Smart Escrow Engine, a Platform-Backed 5-Day Guarantee (FixGrid Shield), and Verified Digital Storefronts with Transparent Rate Cards</strong>, FixGrid standardizes fragmented local repairs into an accountable, trustworthy service experience as dependable as buying new. Crucially, FixGrid is not an unverified concept: it is <strong>fully functional and live in production at <span style="color:#059669; font-weight:700;">www.vytron.me</span></strong>.
    </div>
  </div>

  <!-- 2. THE PROBLEM -->
  <div class="section">
    <div class="section-kicker">02. THE PROBLEM STATEMENT</div>
    <div class="section-title">The Broken Economics of Repair & The Climate Paradox</div>
    <div class="grid-3">
      <div class="card card-problem-red">
        <div class="card-stat stat-red">84%</div>
        <div class="card-stat-label">Consumer Fear</div>
        <div class="card-h">The Lemon Market Trap</div>
        <div class="card-p">Consumers avoid local repair due to fear of arbitrary price gouging, fake counterfeit components, component theft, and zero warranty recourse. They default to buying expensive new replacements.</div>
      </div>
      <div class="card card-problem-amber">
        <div class="card-stat stat-amber">92%</div>
        <div class="card-stat-label">Artisan Invisibility</div>
        <div class="card-h">The Invisible Craftsman</div>
        <div class="card-p">Master repair technicians operate &lt; 500m away, but lack any web presence, customer booking tools, or verified reputation ledger. They are starved of footfall and trapped by predatory middlemen.</div>
      </div>
      <div class="card card-problem-green">
        <div class="card-stat stat-green">1.71M+</div>
        <div class="card-stat-label">Tonnes of E-Waste / Year</div>
        <div class="card-h">The Climate Catastrophe</div>
        <div class="card-p">India is the #3 global e-waste generator. 80% of device lifetime carbon is emitted during manufacturing. Discarding repairable items causes massive toxic waste and accelerates climate breakdown.</div>
      </div>
    </div>
  </div>

  <!-- 3. THE SOLUTION (4 PILLARS) -->
  <div class="section">
    <div class="section-kicker">03. PRODUCT ARCHITECTURE</div>
    <div class="section-title">FixGrid: The 4 Pillars of Pure Software Trust</div>
    <div class="grid-2">
      <div class="pillar-card">
        <span class="pillar-num">PILLAR 1</span>
        <div class="pillar-title">Geospatial Discovery & Digital Identity</div>
        <div class="pillar-desc">Custom Leaflet-powered geospatial engine mapping verified neighborhood repair workshops. Filter by exact device model, issue category, proximity, and customer reviews with transparent rate cards.</div>
      </div>
      <div class="pillar-card">
        <span class="pillar-num">PILLAR 2</span>
        <div class="pillar-title">Milestone-Based Smart Escrow</div>
        <div class="pillar-desc">Consumer funds are locked in the FixGrid Escrow Vault at booking. Funds are never disbursed prematurely; they are released only after the customer inspects the repaired device and inputs a completion OTP.</div>
      </div>
      <div class="pillar-card">
        <span class="pillar-num">PILLAR 3</span>
        <div class="pillar-title">FixGrid Shield (Platform Warranty)</div>
        <div class="pillar-desc">Universal 5-day platform-backed warranty on workmanship + recorded merchant extended warranties (30/90/180 days). Integrated dispute arbitration protocol with 100% money-back guarantee.</div>
      </div>
      <div class="pillar-card">
        <span class="pillar-num">PILLAR 4</span>
        <div class="pillar-title">Shop Pro SaaS & 5% Cashback Rebate</div>
        <div class="pillar-desc">5% completed-bill cashback rebate incentivizes offline shops to log all walk-in jobs on FixGrid. Optional ₹999/mo SaaS tier adds cloud inventory, job ticketing, and automated WhatsApp repair progress alerts.</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 4. TECHNICAL INNOVATION -->
  <div class="section">
    <div class="section-kicker">04. ENGINEERING SPECIFICATIONS</div>
    <div class="section-title">Enterprise Web Architecture Built for Speed, Scale & Security</div>
    <table>
      <thead>
        <tr>
          <th style="width: 28%;">Component</th>
          <th>Implementation & Architectural Advantages</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Frontend & Geo-Engine</strong></td>
          <td><strong>Next.js 16 (App Router)</strong> with React Server Components (RSC), <strong>TypeScript</strong>, and <strong>Tailwind CSS</strong>. Integrated <strong>Leaflet / OpenStreetMap</strong> engine delivers sub-second proximity search without heavy third-party API costs.</td>
        </tr>
        <tr>
          <td><strong>Backend & Data Security</strong></td>
          <td><strong>Supabase (PostgreSQL)</strong> utilizing strict relational schemas and <strong>Row Level Security (RLS)</strong> for multi-tenant data isolation. Automated <strong>Database Triggers</strong> orchestrate escrow state machines and cryptographic completion OTP verification.</td>
        </tr>
        <tr>
          <td><strong>Programmatic SEO CMS</strong></td>
          <td>Dedicated <strong>/seo-admin</strong> headless CMS that programmatically synthesizes thousands of localized, long-tail keyword URLs (e.g. <em>'MacBook battery replacement in [Locality]'</em>), delivering <strong>zero-CAC organic customer acquisition</strong>.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 5. MARKET OPPORTUNITY & MONETIZATION -->
  <div class="section">
    <div class="section-kicker">05. BUSINESS ECONOMICS</div>
    <div class="section-title">Monetizing a $15.2B High-Frequency Unorganized Market</div>
    <div class="grid-3">
      <div class="card" style="background:#F8FAFC;">
        <div class="card-stat stat-blue">$15.2B</div>
        <div class="card-stat-label">Total Addressable Market</div>
        <div class="card-p">Indian unorganized repair sector across electronics, home appliances, and daily wearables (surging past $25B with Right-to-Repair mandates).</div>
      </div>
      <div class="card" style="background:#F8FAFC;">
        <div class="card-stat stat-amber">$4.8B</div>
        <div class="card-stat-label">Serviceable Market</div>
        <div class="card-p">Tier-1 and Tier-2 urban consumer electronics, smartphone, and appliance repair volume where digital payment adoption is &gt; 80%.</div>
      </div>
      <div class="card" style="background:#F8FAFC;">
        <div class="card-stat stat-green">$120M</div>
        <div class="card-stat-label">3-Year Target SOM</div>
        <div class="card-p">Addressable urban hyperlocal repair GMV captured across initial metro clusters (Delhi NCR, Bengaluru, Mumbai).</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 28%;">Revenue Stream</th>
          <th>Mechanism & Economics</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Platform Take-Rate (5% – 8%)</strong></td>
          <td>Transaction commission fee on each escrow-backed completed booking. Covers payment processing, escrow vault infrastructure, and the FixGrid Shield warranty pool.</td>
        </tr>
        <tr>
          <td><strong>Shop Pro SaaS (₹999 / Month)</strong></td>
          <td>Optional recurring subscription for busy workshops: multi-technician job ticketing, inventory alerts, automated customer WhatsApp repair status updates, and priority search placement.</td>
        </tr>
        <tr>
          <td><strong>Certified Spare Parts Logistics</strong></td>
          <td>B2B supply-chain marketplace (<strong>parts.vytron.me</strong>) connecting member shops directly with verified OEM-grade component suppliers at a 10%–18% distribution margin.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 6. TRIPLE BOTTOM LINE IMPACT -->
  <div class="section">
    <div class="section-kicker">06. MEASURABLE IMPACT (ESG)</div>
    <div class="section-title">Triple Bottom Line: People, Planet & Livelihoods</div>
    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Dimension</th>
          <th style="width: 22%;">Core Metric</th>
          <th>Societal & Planetary Significance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Economic (Consumer)</strong></td>
          <td><strong style="color:#0F172A; font-size:10pt;">60% – 80% Savings</strong></td>
          <td>Substantial cost reduction vs. buying new replacements; unlocks ~₹14,000 in annual household savings and extends product life by 2.5 to 4 years.</td>
        </tr>
        <tr>
          <td><strong>Social (Artisans)</strong></td>
          <td><strong style="color:#D97706; font-size:10pt;">+35% – 45% Income</strong></td>
          <td>Formalizes unorganized street technicians into verified micro-entrepreneurs. Immutable rating ledger unlocks access to formal microcredit and banking.</td>
        </tr>
        <tr>
          <td><strong>Ecological (Planet)</strong></td>
          <td><strong style="color:#059669; font-size:10pt;">72 kg CO₂e Saved</strong></td>
          <td>Greenhouse emissions prevented per repaired smartphone by eliminating manufacturing emissions. Diverts toxic e-waste directly from landfills.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 7. PRODUCTION STATUS & LIVE DEMO -->
  <div class="section">
    <div class="section-kicker">07. HACKATHON WINNING EDGE</div>
    <div class="section-title">Tested, Deployed & Operational in Production</div>
    <div class="live-box">
      <div>
        <div class="live-pill">● FULLY DEPLOYED IN PRODUCTION</div>
        <div style="font-size:12pt; font-weight:800; margin-bottom:2px;">Live Platform: www.vytron.me</div>
        <div style="font-size:8pt; color:#94A3B8; line-height:1.35;">
          Unlike conceptual hackathon prototypes, FixGrid is live today. Explore the Leaflet map, verified artisan storefronts, transparent rate cards, and responsive mobile/desktop UI right now.
        </div>
      </div>
      <div style="text-align:right; min-width: 140px;">
        <span style="display:inline-block; background:#059669; color:#FFFFFF; font-weight:700; font-size:8.5pt; padding:6px 12px; border-radius:6px;">Visit www.vytron.me</span>
      </div>
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.resolve('fixgrid_hackathon_synopsis.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('HTML written to:', htmlPath);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const pdfPath = path.resolve('FixGrid_Hackathon_Synopsis.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
  });

  console.log('SUCCESS: Synopsis PDF generated at:', pdfPath);
  await browser.close();

  // Clean temporary HTML
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }
}

renderPdf().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
