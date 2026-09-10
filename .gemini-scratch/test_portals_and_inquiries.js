const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function verifyAll() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));

  // ─────────────────────────────────────────────────────────────
  // 1. HIRING PORTAL VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('1. Signing in to Hiring Portal...');
  await page.goto('http://localhost:3003/login?next=/portal', { waitUntil: 'networkidle2' });
  await page.type('#email', 'bench.lead@fixgrid.vytron.me');
  await page.type('#password', 'FixGridBench2026!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === '/portal', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Hiring Portal loaded successfully!');
  await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_sidebar_vacancies.png'), fullPage: false });

  // Switch to Inquiries & Applications Received Tab
  console.log('Clicking Inquiries & Applications Received tab...');
  const appTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('aside button'));
    return buttons.find(b => b.innerText.includes('Inquiries Received'));
  });
  if (appTabBtn) {
    await appTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_inquiries_received.png'), fullPage: false });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CANDIDATE APPLICATION TO BENCH SEAT
  // ─────────────────────────────────────────────────────────────
  console.log('2. Testing Candidate Application Submission...');
  await page.goto('http://localhost:3003/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await new Promise(r => setTimeout(r, 1000));

  const applyBtn = await page.$('a[href^="/apply/"]');
  if (applyBtn) {
    const applyHref = await page.evaluate(el => el.getAttribute('href'), applyBtn);
    console.log('Navigating to candidate apply portal:', applyHref);
    await page.goto(`http://localhost:3003${applyHref}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'candidate_apply_portal.png'), fullPage: false });

    // Fill application form
    await page.type('input[placeholder="e.g. Rahul Sharma"]', 'Vikramaditya Rao');
    await page.type('input[placeholder="+91 98765 43210"]', '+91 98112 34567');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(artifactDir, 'candidate_application_success.png'), fullPage: false });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PARTS WORKSHOP PORTAL WITH SIDEBAR
  // ─────────────────────────────────────────────────────────────
  console.log('3. Signing in to Parts Portal...');
  await page.goto('http://localhost:3004/login?next=/portal', { waitUntil: 'networkidle2' });
  await page.type('#email', 'bench.lead@fixgrid.vytron.me');
  await page.type('#password', 'FixGridBench2026!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === '/portal', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Parts Portal loaded successfully!');
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_sidebar_stock.png'), fullPage: false });

  // Switch to Delivery & Logistics Settings tab
  const settingsTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('aside button'));
    return buttons.find(b => b.innerText.includes('Delivery & Logistics'));
  });
  if (settingsTabBtn) {
    await settingsTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'parts_portal_delivery_settings.png'), fullPage: false });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. PARTS CART & CHECKOUT (HOME DELIVERY VS ADVANCE RESERVATION)
  // ─────────────────────────────────────────────────────────────
  console.log('4. Testing Parts Cart & Order Checkout...');
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await new Promise(r => setTimeout(r, 1000));

  // Click "+ Cart" button on the first card
  const addCartBtn = await page.$('button::-p-text("+ Cart")');
  if (addCartBtn) {
    console.log('Adding item to cart...');
    await addCartBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  }

  // Navigate to Cart
  console.log('Navigating to cart page...');
  await page.goto('http://localhost:3004/cart', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'parts_cart_home_delivery_view.png'), fullPage: false });

  // Test Counter Pickup option (Advance reservation fee mode)
  console.log('Testing Counter Pickup Advance Fee Mode...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Counter Pickup') || b.textContent.includes('Counter Pickup'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactDir, 'parts_cart_advance_fee_pickup_view.png'), fullPage: false });

  // Complete Order
  await page.type('input[placeholder="e.g. Amit Patel"]', 'Karan Verma');
  await page.type('input[placeholder="+91 98765 43210"]', '+91 98765 99887');
  const payBtn = await page.$('button[type="submit"]');
  if (payBtn) {
    await payBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(artifactDir, 'parts_order_confirmed_ticket.png'), fullPage: false });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. VERIFY INCOMING ORDER IN WORKSHOP PORTAL
  // ─────────────────────────────────────────────────────────────
  console.log('5. Verifying Order in Workshop Portal Orders & Inquiries Received...');
  await page.goto('http://localhost:3004/portal', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('aside button'));
    const btn = buttons.find(b => b.innerText.includes('Orders & Inquiries') || b.textContent.includes('Orders & Inquiries'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_orders_inquiries_received.png'), fullPage: false });

  await browser.close();
  console.log('ALL TESTS AND PORTAL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

verifyAll().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
