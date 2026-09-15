const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 1. PARTS CATALOG: VERIFY FIXED CARD LAYOUT (NO OVERFLOW)
  console.log('1. Checking Part Card layout on parts.vytron.me (Port 3004)...');
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollBy(0, 950));
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'part_card_fixed_layout.png'), fullPage: false });

  // 2. HIRING: SIGN IN WITH GOOGLE
  console.log('2. Checking Hiring Sign In with Google (Port 3003)...');
  await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'hiring_login_with_google.png'), fullPage: false });

  // 3. HIRING: SIGN UP (CLIENT DEFAULT)
  console.log('3. Checking Hiring Sign Up - Client Default...');
  await page.goto('http://localhost:3003/signup', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'hiring_signup_client_default.png'), fullPage: false });

  // 4. HIRING: SIGN UP (WORKSHOP FORM)
  console.log('4. Checking Hiring Sign Up - Workshop Form...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const workshopBtn = btns.find(b => b.textContent.includes('Workshop / Shop'));
    if (workshopBtn) workshopBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactDir, 'hiring_signup_workshop_form.png'), fullPage: false });

  // 5. PARTS: SIGN IN WITH GOOGLE
  console.log('5. Checking Parts Sign In with Google (Port 3004)...');
  await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'parts_login_with_google.png'), fullPage: false });

  // 6. PARTS: SIGN UP (CLIENT DEFAULT)
  console.log('6. Checking Parts Sign Up - Client Default...');
  await page.goto('http://localhost:3004/signup', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'parts_signup_client_default.png'), fullPage: false });

  // 7. PARTS: SIGN UP (WORKSHOP FORM)
  console.log('7. Checking Parts Sign Up - Workshop Form...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const workshopBtn = btns.find(b => b.textContent.includes('Workshop / Supplier'));
    if (workshopBtn) workshopBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactDir, 'parts_signup_workshop_form.png'), fullPage: false });

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

verify().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
