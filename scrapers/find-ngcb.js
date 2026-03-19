const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://gaming.nv.gov/stats-and-reports/gaming-revenue-reports/', { waitUntil: 'networkidle', timeout: 25000 });
  } catch(e) {
    console.log('Nav error:', e.message);
  }
  const url = page.url();
  console.log('Final URL:', url);
  const content = await page.content();
  // Find PDF links
  const pdfMatches = content.match(/https?[^"']*\.pdf[^"']*/gi) || [];
  const uploadMatches = content.match(/href="([^"]*(?:revenue|Revenue|report|Report|gaming|Gaming)[^"]*)"/gi) || [];
  console.log('PDF links found:', pdfMatches.slice(0, 10));
  console.log('Revenue links:', uploadMatches.slice(0, 10));
  await browser.close();
})();
