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
  
  // Treasure Island - SSL cert issues, ignore
  console.log('\n=== TREASURE ISLAND (ignoring SSL) ===');
  const tiUrls = [
    'https://www.ticasino.com/',
    'https://www.ticasino.com/players-club',
    'https://www.ticasino.com/rewards',
    'https://ti.casino/',
    'https://www.treasureislandresort.com/',
  ];
  for (const url of tiUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url);
    if (!text.startsWith('ERROR') && text.length > 200) {
      console.log('SUCCESS! First 3000 chars:');
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 300));
    }
  }
  
  // Jackpot Junction
  console.log('\n=== JACKPOT JUNCTION (ignoring SSL) ===');
  const jjUrls = [
    'https://192.124.249.110/',
    'https://jackpotjunction.net/',
    'https://jackpotjunctioncasino.com/',
    'https://jackpotjunctioncasino.com/club-jackpot',
  ];
  for (const url of jjUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url);
    if (!text.startsWith('ERROR') && text.length > 200) {
      console.log('SUCCESS! First 3000 chars:');
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 300));
    }
  }
  
  // Black Bear - their nav shows "Players Club" so it exists
  console.log('\n=== BLACK BEAR (digging deeper) ===');
  const bbUrls = [
    'https://www.blackbearcasinoresort.com/players',
    'https://www.blackbearcasinoresort.com/players-card',
    'https://www.blackbearcasinoresort.com/rewards-card',
    'https://www.blackbearcasinoresort.com/gaming/players-club',
    'https://www.blackbearcasinoresort.com/gaming/rewards',
  ];
  for (const url of bbUrls) {
    console.log(`\nTrying: ${url}`);
    const text = await fetchPage(browser, url, { wait: 2000 });
    if (!text.startsWith('ERROR') && !text.includes('not found') && !text.includes('404') && text.length > 300) {
      console.log('SUCCESS! First 3000 chars:');
      console.log(text.substring(0, 3000));
      break;
    } else {
      console.log(text.substring(0, 200));
    }
  }
  
  // Shooting Star - try without www
  console.log('\n=== SHOOTING STAR (without www) ===');
  const ssText = await fetchPage(browser, 'https://shootingstarcasino.com/players-club', { wait: 3000 });
  if (ssText.length > 200 && !ssText.startsWith('ERROR')) {
    console.log(ssText.substring(0, 3000));
  } else {
    console.log('Failed:', ssText.substring(0, 300));
    // Try the IP directly
    const ssIp = await fetchPage(browser, 'http://207.246.78.75/', { wait: 2000 });
    console.log('\nIP attempt:');
    console.log(ssIp.substring(0, 1000));
  }
  
  await browser.close();
}

main().catch(console.error);
