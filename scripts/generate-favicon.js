const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function createIco() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  async function renderPng(size) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const radius = Math.round(size * 0.25);
    const wrenchSize = Math.round(size * 0.625);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
          .logo-box {
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0284c7 0%, #0f3d4c 45%, #c2410c 85%, #ea580c 100%);
            border-radius: ${radius}px;
          }
          svg {
            width: ${wrenchSize}px;
            height: ${wrenchSize}px;
          }
        </style>
      </head>
      <body>
        <div class="logo-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>
      </body>
      </html>
    `;
    await page.setContent(html);
    const buf = await page.screenshot({ omitBackground: true });
    await page.close();
    return buf;
  }

  const png16 = await renderPng(16);
  const png32 = await renderPng(32);
  const png48 = await renderPng(48);
  await browser.close();

  // Save standalone PNGs for browsers requesting /icon-32.png or /icon-16.png
  fs.writeFileSync('public/icon-32.png', png32);
  fs.writeFileSync('public/icon-16.png', png16);
  fs.writeFileSync('public/icon-48.png', png48);

  // Build multi-res ICO (16x16, 32x32, 48x48)
  const images = [
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
    { size: 48, buf: png48 },
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type ICO
  header.writeUInt16LE(images.length, 4); // count

  let offset = 6 + (16 * images.length);
  const entries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size, 0); // width
    entry.writeUInt8(img.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buf.length, 8); // size in bytes
    entry.writeUInt32LE(offset, 12); // file offset
    entries.push(entry);
    imageBuffers.push(img.buf);
    offset += img.buf.length;
  }

  const ico = Buffer.concat([header, ...entries, ...imageBuffers]);
  fs.writeFileSync('src/app/favicon.ico', ico);
  fs.writeFileSync('public/favicon.ico', ico);
  console.log('Successfully generated new multi-res favicon.ico! Total bytes:', ico.length);
}

createIco().catch(err => {
  console.error(err);
  process.exit(1);
});
