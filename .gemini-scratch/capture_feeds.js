const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rishit Jindal\\.gemini\\antigravity-ide\\brain\\2ec9d431-1b50-4cbc-8a76-dc60051e7902';

async function captureUpdatedFeeds() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Capturing Hiring Catalog with newly published bench job...');
  await page.goto('http://localhost:3003/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollBy(0, 750));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'hiring_feed_with_new_post.png'), fullPage: false });

  console.log('Capturing Parts Catalog with newly published hardware component...');
  await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollBy(0, 750));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'parts_feed_with_new_item.png'), fullPage: false });

  await browser.close();
  console.log('Feeds captured!');
}

captureUpdatedFeeds().catch(console.error);
