const puppeteer = require('puppeteer-core');
const path = require('path');

async function render() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('test_render.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.resolve('test_render.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });
  await browser.close();
  console.log('PDF rendered successfully');
}

render().catch(err => {
  console.error('Error rendering PDF:', err);
  process.exit(1);
});
