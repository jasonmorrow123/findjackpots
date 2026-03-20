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
  
  // Black Bear - Épique Rewards
  console.log('\n=== BLACK BEAR - Épique Rewards ===');
  const bbText = await fetchPage(browser, 'https://www.blackbearcasinoresort.com/epiquerewards.html', { wait: 4000 });
  console.log(bbText);
  
  // Jackpot Junction - try alternate URL formats 
  console.log('\n=== JACKPOT JUNCTION ===');
  // DNS resolution failed for jackpotjunction.com. Let's try fetching via IP with Host header
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0',
    'Host': 'www.jackpotjunction.com'
  });
  try {
    await page.goto('http://192.124.249.110/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    console.log(text.substring(0, 3000));
  } catch(e) {
    console.log('IP attempt error:', e.message);
  }
  await ctx.close();
  
  // Shooting Star - try curl approach for DNS
  console.log('\n=== SHOOTING STAR - checking site ===');
  const ssText = await fetchPage(browser, 'https://45.77.75.133/', { wait: 2000 });
  console.log('IP direct:', ssText.substring(0, 500));
  
  await browser.close();
}

main().catch(console.error);
