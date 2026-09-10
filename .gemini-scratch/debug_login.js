const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function debugLogin() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:3003/login?next=/post', { waitUntil: 'networkidle2' });
  await page.type('#email', 'delhi.logicboard@fixgrid.in');
  await page.type('#password', 'TestPass123!');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 4000));
  const url = page.url();
  console.log('Current URL after 4s:', url);

  const errorText = await page.evaluate(() => {
    const alert = document.querySelector('[role="alert"]');
    const status = document.querySelector('[role="status"]');
    return {
      alert: alert ? alert.innerText : null,
      status: status ? status.innerText : null
    };
  });
  console.log('Error/Status on page:', errorText);

  await browser.close();
}

debugLogin().catch(console.error);
