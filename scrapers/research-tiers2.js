const { chromium } = require('playwright');

async function fetchPage(browser, url, waitMs = 4000) {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(waitMs);
    const text = await page.evaluate(() => document.body.innerText);
    const html = await page.evaluate(() => document.body.innerHTML.substring(0, 5000));
    await page.close();
    return { text, html };
  } catch (e) {
    try {
      const text = await page.evaluate(() => document.body ? document.body.innerText : '');
      await page.close();
      return { text, html: `ERROR: ${e.message}` };
    } catch {
      await page.close();
      return { text: `ERROR: ${e.message}`, html: '' };
    }
  }
}

function findTiers(result, programName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PROGRAM: ${programName}`);
  console.log('='.repeat(60));
  const text = result.text || '';
  const tierKeywords = /tier|level|status|elite|premier|celebrity|diamond|platinum|gold|silver|bronze|black|classic|star|signature|preferred|rewards card|vip|aces|tracker|explorer|adventurer|voyager|voyager elite/i;
  const lines = text.split('\n');
  let relevant = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && tierKeywords.test(line) && line.length < 300) {
      relevant.push(line);
    }
  }
  const seen = new Set();
  const deduped = relevant.filter(l => { if (seen.has(l)) return false; seen.add(l); return true; });
  console.log(deduped.slice(0, 50).join('\n'));
  console.log('\n--- FULL TEXT (first 2000 chars) ---');
  console.log(text.substring(0, 2000));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  const sites = [
    { name: 'Shooting Star Star Rewards', url: 'https://www.shootingstarcasino.com/' },
    { name: 'Jackpot Junction Club Jackpot', url: 'https://www.jackpotjunction.com/' },
    { name: 'Black Bear Bear Rewards', url: 'https://www.blackbearcasinoresort.com/' },
    { name: 'Grand Casino Club Grand', url: 'https://www.grandcasinomn.com/' },
  ];
  
  for (const site of sites) {
    const result = await fetchPage(browser, site.url);
    findTiers(result, site.name);
  }
  
  await browser.close();
}

main().catch(console.error);
