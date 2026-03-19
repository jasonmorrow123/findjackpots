const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.gaming.nv.gov/about-us/statistics-and-publications/', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('URL:', page.url());
  const links = await page.$$eval('a', els => els.map(e => ({ text: e.textContent.trim().substring(0,80), href: e.href })).filter(l => l.href && l.text && (l.href.includes('.pdf') || l.text.toLowerCase().includes('revenue') || l.text.toLowerCase().includes('gaming revenue'))));
  console.log('PDF/Revenue links:', JSON.stringify(links.slice(0, 20), null, 2));
  await browser.close();
})();
