const { chromium } = require('playwright');

async function fetchPage(browser, url, waitMs = 4000) {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(waitMs);
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    await page.close();
    return text;
  } catch (e) {
    try { await page.close(); } catch {}
    return `ERROR: ${e.message}`;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Try Black Bear specific pages
  const blackBearUrls = [
    'https://www.blackbearcasinoresort.com/casino/players-club',
    'https://www.blackbearcasinoresort.com/casino/bear-rewards',
    'https://www.blackbearcasinoresort.com/casino/rewards',
    'https://www.blackbearcasinoresort.com/players-club',
  ];
  
  console.log('=== BLACK BEAR CASINO ===');
  for (const url of blackBearUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR') && !text.includes('not found') && !text.includes('404')) {
      console.log('SUCCESS!');
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Try Jackpot Junction
  console.log('\n=== JACKPOT JUNCTION ===');
  const jjUrls = [
    'https://jackpotjunction.com/',
    'https://jackpotjunction.com/rewards',
    'https://jackpotjunction.com/club-jackpot',
  ];
  for (const url of jjUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR')) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Try Shooting Star
  console.log('\n=== SHOOTING STAR ===');
  const ssUrls = [
    'https://shootingstarcasino.com/',
    'https://shootingstarcasino.com/players-club',
    'https://shootingstarcasino.com/rewards',
  ];
  for (const url of ssUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR') && text.length > 100) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Try Grand Casino tiers page
  console.log('\n=== GRAND CASINO TIERS ===');
  const gcUrls = [
    'https://www.grandcasinomn.com/grand-rewards/tiers',
    'https://www.grandcasinomn.com/grand-rewards/tiers-and-benefits',
    'https://www.grandcasinomn.com/rewards/tiers',
  ];
  for (const url of gcUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR') && text.length > 100) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Running Aces - DNS fails, try alternate domain
  console.log('\n=== RUNNING ACES ===');
  const raUrls = [
    'https://runningacescasino.com/',
    'https://runningacescasino.com/rewards',
    'https://runningacescasino.com/players-club',
  ];
  for (const url of raUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR') && text.length > 100) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Treasure Island
  console.log('\n=== TREASURE ISLAND ===');
  const tiUrls = [
    'https://treasureislandcasino.com/',
    'https://treasureislandcasino.com/rewards',
    'https://treasureislandcasino.com/ti-bucks',
    'https://ticasino.com/',
    'https://ticasino.com/players-club',
  ];
  for (const url of tiUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, 2000);
    if (!text.startsWith('ERROR') && text.length > 100) {
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  await browser.close();
}

main().catch(console.error);
