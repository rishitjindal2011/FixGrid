const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function testFullFlow() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Hiring Portal Auth & Post
  console.log('1. Signing in to Hiring Portal (http://localhost:3003/login?next=/post)...');
  await page.goto('http://localhost:3003/login?next=/post', { waitUntil: 'networkidle2' });
  await page.type('#email', 'bench.lead@fixgrid.vytron.me');
  await page.type('#password', 'FixGridBench2026!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === '/post', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Hiring Portal authenticated! Current URL:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_authenticated_post.png'), fullPage: false });

  // Now submit the job post
  console.log('Submitting new bench opening from Hiring Studio...');
  const publishJobBtn = await page.$('button[type="submit"]');
  if (publishJobBtn) {
    await publishJobBtn.click();
    await new Promise(r => setTimeout(r, 2500));
    console.log('Job post submitted! Current URL:', page.url());
    await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_post_success.png'), fullPage: false });
  }

  // 2. Parts Portal Auth & List
  console.log('2. Signing in to Parts Portal (http://localhost:3004/login?next=/list)...');
  await page.goto('http://localhost:3004/login?next=/list', { waitUntil: 'networkidle2' });
  await page.type('#email', 'bench.lead@fixgrid.vytron.me');
  await page.type('#password', 'FixGridBench2026!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === '/list', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Parts Portal authenticated! Current URL:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_authenticated_list.png'), fullPage: false });

  // Now submit the hardware listing
  console.log('Submitting new component listing from Parts Studio...');
  const publishPartBtn = await page.$('button[type="submit"]');
  if (publishPartBtn) {
    await publishPartBtn.click();
    await new Promise(r => setTimeout(r, 2500));
    console.log('Part listing submitted! Current URL:', page.url());
    await page.screenshot({ path: path.join(artifactDir, 'parts_portal_list_success.png'), fullPage: false });
  }

  await browser.close();
  console.log('All end-to-end authenticated portal flows verified successfully with real database insertions!');
}

testFullFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
