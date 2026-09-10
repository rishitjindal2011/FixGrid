const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function testSubmission() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test sign in and redirect on hiring portal
  console.log('Testing Hiring sign-in flow...');
  await page.goto('http://localhost:3003/login?next=/post', { waitUntil: 'networkidle2' });
  await page.type('#email', 'delhi.logicboard@fixgrid.in');
  await page.type('#password', 'TestPass123!');
  await page.click('button[type="submit"]');

  // Next.js client router push: wait for pathname to become /post
  await page.waitForFunction(() => window.location.pathname === '/post', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  console.log('Successfully signed in to Hiring! Current URL:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_post_authenticated.png'), fullPage: false });

  // Now test sign in and redirect on parts portal
  console.log('Testing Parts sign-in flow...');
  await page.goto('http://localhost:3004/login?next=/list', { waitUntil: 'networkidle2' });
  await page.type('#email', 'delhi.logicboard@fixgrid.in');
  await page.type('#password', 'TestPass123!');
  await page.click('button[type="submit"]');

  // Next.js client router push: wait for pathname to become /list
  await page.waitForFunction(() => window.location.pathname === '/list', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  console.log('Successfully signed in to Parts! Current URL:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_list_authenticated.png'), fullPage: false });

  await browser.close();
  console.log('All end-to-end authenticated portal flows verified successfully!');
}

testSubmission().catch(err => {
  console.error('Portal auth test error:', err);
  process.exit(1);
});
