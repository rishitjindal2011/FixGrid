const puppeteer = require('puppeteer-core');
const path = require('path');

async function render() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport to high-DPI A4
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  
  const fileUrl = 'file:///' + path.resolve('fixgrid_inspire_award_dossier.html').replace(/\\/g, '/');
  console.log('Loading URL:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  // Wait for Google Fonts to be ready
  await page.evaluateHandle('document.fonts.ready');

  const outputPath = path.resolve('FixGrid_Inspire_Award_MANAK_Dossier.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });
  
  await browser.close();
  console.log('PDF rendered successfully to:', outputPath);
}

render().catch(err => {
  console.error('Error rendering PDF:', err);
  process.exit(1);
});
