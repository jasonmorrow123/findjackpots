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
  
  // Treasure Island - Island Passport Club
  console.log('\n=== TREASURE ISLAND - Island Passport Club ===');
  const tiUrls = [
    'https://www.ticasino.com/casino/island-passport-club',
    'https://www.ticasino.com/island-passport-club',
    'https://www.ticasino.com/promotions/island-passport-club',
    'https://www.ticasino.com/casino',
  ];
  for (const url of tiUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url);
    if (!text.startsWith('ERROR') && text.length > 200) {
      const lower = text.toLowerCase();
      if (lower.includes('tier') || lower.includes('gold') || lower.includes('silver') || lower.includes('platinum') || lower.includes('diamond') || lower.includes('classic')) {
        console.log('FOUND TIER CONTENT!');
        console.log(text.substring(0, 4000));
        break;
      } else {
        console.log('No tier info found. Length:', text.length);
        console.log(text.substring(0, 500));
      }
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Black Bear - try sitemap or navigation links
  console.log('\n=== BLACK BEAR - trying sitemap ===');
  const bbHome = await fetchPage(browser, 'https://www.blackbearcasinoresort.com/sitemap.xml', { wait: 1000 });
  if (!bbHome.startsWith('ERROR')) {
    console.log('Sitemap:', bbHome.substring(0, 3000));
  } else {
    // Try looking at their navigation structure
    const bbNav = await fetchPage(browser, 'https://www.blackbearcasinoresort.com/', { wait: 2000 });
    console.log(bbNav.substring(0, 3000));
  }
  
  // Jackpot Junction - try http
  console.log('\n=== JACKPOT JUNCTION - http ===');
  const jjUrls = [
    'http://www.jackpotjunction.com/',
    'http://jackpotjunction.com/',
  ];
  for (const url of jjUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url);
    if (!text.startsWith('ERROR') && text.length > 100) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 300));
    }
  }
  
  // Shooting Star - try http (not https)
  console.log('\n=== SHOOTING STAR - http ===');
  const ssUrls = [
    'http://www.shootingstarcasino.com/',
    'http://shootingstarcasino.com/',
    'http://www.shootingstarcasino.com/star-rewards',
    'http://www.shootingstarcasino.com/players-club',
  ];
  for (const url of ssUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, { wait: 3000 });
    if (!text.startsWith('ERROR') && text.length > 200) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 300));
    }
  }
  
  await browser.close();
}

main().catch(console.error);
