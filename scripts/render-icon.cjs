const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'build', 'icon.svg')).href);
  await page.screenshot({
    path: path.resolve(__dirname, '..', 'build', 'icon.png'),
    omitBackground: true,
  });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
