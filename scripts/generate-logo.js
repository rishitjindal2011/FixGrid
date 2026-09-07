const puppeteer = require('puppeteer-core');
const path = require('path');

async function generate() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: 512px; height: 512px; background: transparent; overflow: hidden; }
        .logo-box {
          width: 512px;
          height: 512px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0284c7 0%, #0f3d4c 45%, #c2410c 85%, #ea580c 100%);
          border-radius: 112px;
          box-shadow: 0 20px 50px rgba(15, 61, 76, 0.35);
        }
        svg {
          width: 300px;
          height: 300px;
        }
      </style>
    </head>
    <body>
      <div class="logo-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
    </body>
    </html>
  `;
  await page.setContent(html);
  const outPath = path.join(__dirname, '..', 'public', 'logo.png');
  await page.screenshot({ path: outPath, omitBackground: true });
  await browser.close();
  console.log('Successfully generated ' + outPath);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
