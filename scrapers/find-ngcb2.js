const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Try the homepage first to find navigation
  await page.goto('https://www.gaming.nv.gov/', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('Homepage URL:', page.url());
  
  // Look for any stats/reports links
  const allLinks = await page.$$eval('a', els => els.map(e => ({ text: e.textContent.trim().substring(0,60), href: e.href })).filter(l => l.href && l.text));
  const statsLinks = allLinks.filter(l => 
    l.text.toLowerCase().includes('stat') || 
    l.text.toLowerCase().includes('report') || 
    l.text.toLowerCase().includes('revenue') ||
    l.href.toLowerCase().includes('stat') ||
    l.href.toLowerCase().includes('report')
  );
  console.log('Stats/report links:', JSON.stringify(statsLinks.slice(0,15), null, 2));
  
  await browser.close();
})();
