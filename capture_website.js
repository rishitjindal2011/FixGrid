const puppeteer = require('puppeteer-core');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 1. Capture Desktop View of www.vytron.me
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  console.log('Navigating to https://www.vytron.me ...');
  await page.goto('https://www.vytron.me', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const desktopScreenshot = path.resolve('fixgrid_website_desktop.png');
  await page.screenshot({ path: desktopScreenshot, clip: { x: 0, y: 0, width: 1440, height: 850 } });
  console.log('Desktop screenshot saved to:', desktopScreenshot);
  
  // 2. Capture Mobile / Search View
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.goto('https://www.vytron.me/search', { waitUntil: 'networkidle2', timeout: 30000 });
  const mobileScreenshot = path.resolve('fixgrid_website_mobile.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log('Mobile screenshot saved to:', mobileScreenshot);

  await browser.close();
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
