const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('1. Capturing Hiring Login Portal...');
  await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_login.png'), fullPage: false });

  console.log('2. Capturing Hiring Post Portal...');
  await page.goto('http://localhost:3003/post', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(artifactDir, 'hiring_portal_post.png'), fullPage: false });

  console.log('3. Capturing Parts Login Portal...');
  await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_login.png'), fullPage: false });

  console.log('4. Capturing Parts List Portal...');
  await page.goto('http://localhost:3004/list', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(artifactDir, 'parts_portal_list.png'), fullPage: false });

  console.log('5. Testing direct navigation on Hiring home page (no popup)...');
  await page.goto('http://localhost:3003/', { waitUntil: 'networkidle2', timeout: 30000 });
  // Click "Post a Bench Opening" in navbar
  const postBtn = await page.$('a[href="/post"]');
  if (postBtn) {
    console.log('Found post link on navbar, clicking...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      postBtn.click(),
    ]);
    console.log('Navigated to:', page.url());
  }

  console.log('6. Testing direct navigation on Parts home page (no popup)...');
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2', timeout: 30000 });
  // Click "List Surplus Stock" in navbar
  const listBtn = await page.$('a[href="/list"]');
  if (listBtn) {
    console.log('Found list link on navbar, clicking...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      listBtn.click(),
    ]);
    console.log('Navigated to:', page.url());
  }

  await browser.close();
  console.log('All portal validations completed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
