const { chromium } = require('playwright');

async function fetchPage(browser, url, opts = {}) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(opts.wait || 3000);
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    await ctx.close();
    return text;
  } catch (e) {
    try { await ctx.close(); } catch {}
    return `ERROR: ${e.message}`;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Get more from Treasure Island page - full text
  console.log('\n=== TREASURE ISLAND - Full Page ===');
  const tiText = await fetchPage(browser, 'https://www.ticasino.com/island-passport-club', { wait: 5000 });
  console.log(tiText);
  
  await browser.close();
}

main().catch(console.error);
