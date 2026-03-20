const { chromium } = require('playwright');

async function fetchPage(browser, url, waitMs = 3000) {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(waitMs);
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    return text;
  } catch (e) {
    await page.close();
    return `ERROR: ${e.message}`;
  }
}

function findTiers(text, programName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PROGRAM: ${programName}`);
  console.log('='.repeat(60));
  
  // Print relevant sections containing tier keywords
  const lines = text.split('\n');
  const tierKeywords = /tier|level|status|member|elite|premier|celebrity|diamond|platinum|gold|silver|bronze|black|classic|star|signature|preferred|rewards|card|vip|loyalty|aces|club/i;
  
  let relevant = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && tierKeywords.test(line) && line.length < 200) {
      relevant.push(line);
    }
  }
  
  // Deduplicate
  const seen = new Set();
  const deduped = relevant.filter(l => {
    if (seen.has(l)) return false;
    seen.add(l);
    return true;
  });
  
  console.log(deduped.slice(0, 60).join('\n'));
  console.log('\n--- FULL TEXT SAMPLE (first 3000 chars) ---');
  console.log(text.substring(0, 3000));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  const sites = [
    { name: 'Club M (Mystic Lake)', url: 'https://www.mysticlake.com/rewards/club-m' },
    { name: 'Club Grand', url: 'https://www.grandcasinomn.com/rewards' },
    { name: 'Bear Rewards', url: 'https://www.blackbearcasinoresort.com/rewards' },
    { name: 'Seven Stars Rewards', url: 'https://www.sevenclans.com/seven-stars' },
    { name: 'Ti Bucks', url: 'https://www.treasureislandcasino.com/rewards' },
    { name: 'Star Rewards', url: 'https://www.shootingstarcasino.com/star-rewards' },
    { name: 'Club Jackpot', url: 'https://www.jackpotjunction.com/club-jackpot' },
    { name: 'Fortune Club', url: 'https://www.fortunebay.com/fortune-club' },
    { name: 'Aces Rewards', url: 'https://www.runningaces.com/rewards' },
    { name: 'Canterbury Rewards', url: 'https://www.canterburypark.com/rewards' },
    { name: 'Prairie Gold Rewards', url: 'https://www.prairiemeadows.com/players-club' },
    { name: 'Wild Rose Rewards', url: 'https://www.wildrosecasinos.com/rewards' },
  ];
  
  for (const site of sites) {
    const text = await fetchPage(browser, site.url);
    findTiers(text, site.name);
  }
  
  await browser.close();
}

main().catch(console.error);
