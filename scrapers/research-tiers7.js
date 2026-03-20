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
    // Expand all accordion sections
    try {
      const expandBtns = await page.$$('[aria-expanded="false"], .accordion-button, .collapsible-header, button.expand');
      for (const btn of expandBtns) {
        try { await btn.click(); await page.waitForTimeout(300); } catch {}
      }
    } catch {}
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
  
  // TI Member Benefits page
  console.log('\n=== TREASURE ISLAND - Member Benefits ===');
  const tiText = await fetchPage(browser, 'https://www.ticasino.com/island-passport-club/member-benefits', { wait: 4000 });
  if (!tiText.startsWith('ERROR') && tiText.length > 100) {
    console.log(tiText);
  } else {
    console.log('Failed:', tiText.substring(0, 200));
    // Try casino/players-club
    const ti2 = await fetchPage(browser, 'https://www.ticasino.com/casino/island-passport-club', { wait: 4000 });
    console.log('Alt:', ti2.substring(0, 2000));
  }
  
  // Grand Casino - try the grand-rewards page with full JS rendering
  console.log('\n=== GRAND CASINO REWARDS ===');
  const gcText = await fetchPage(browser, 'https://www.grandcasinomn.com/grand-rewards', { wait: 6000 });
  console.log(gcText.substring(0, 5000));
  
  // Black Bear - inspect their full homepage for links
  console.log('\n=== BLACK BEAR FULL HOMEPAGE ===');
  const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true });
  const p2 = await ctx2.newPage();
  await p2.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
  await p2.goto('https://www.blackbearcasinoresort.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p2.waitForTimeout(2000);
  const links = await p2.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ text: a.textContent.trim(), href: a.href }))
      .filter(a => a.text && a.href && !a.href.includes('#') && !a.href.includes('javascript'))
      .slice(0, 60);
  });
  console.log(JSON.stringify(links, null, 2));
  await ctx2.close();
  
  await browser.close();
}

main().catch(console.error);
