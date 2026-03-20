const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  try {
    await page.goto('https://www.ticasino.com/island-passport-club', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    const buttons = await page.$$('button, summary, .accordion-toggle, [aria-expanded]');
    for (const btn of buttons) {
      try { await btn.click(); await page.waitForTimeout(300); } catch {}
    }
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').filter(l => l.trim() && /tier|classic|silver|gold|platinum|diamond|pearl|coral|emerald|passport|member|status|island|local/i.test(l));
    console.log('TI TIER LINES:', lines.join('\n'));
    console.log('\n\nFULL TEXT:', text);
  } catch(e) {
    console.log('Error:', e.message);
  }
  await browser.close();
})();
