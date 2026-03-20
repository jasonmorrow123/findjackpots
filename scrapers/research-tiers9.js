const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Black Bear - get full HTML to find tier table
  console.log('\n=== BLACK BEAR - Épique HTML ===');
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
  await page.goto('https://www.blackbearcasinoresort.com/epiquerewards.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  const html = await page.content();
  // Find tier-relevant sections
  const tierSection = html.match(/.{0,500}(tier|epique|bronze|silver|gold|platinum|diamond|ruby|obsidian|ember|flame|crystal|pearl|jade|sapphire).{0,500}/gi);
  if (tierSection) {
    console.log(tierSection.slice(0, 10).join('\n---\n'));
  }
  // Also get all img alt tags and headers
  const headers = await page.evaluate(() => {
    const h = [];
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,th,td,li,.tier,.level,.card-title').forEach(el => {
      const t = el.textContent.trim();
      if (t) h.push(`${el.tagName}: ${t.substring(0, 100)}`);
    });
    return h;
  });
  console.log('\nAll headers/cells:');
  console.log(headers.join('\n'));
  await ctx.close();
  
  // Get all images from the page
  console.log('\n=== BLACK BEAR - Images ===');
  const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true });
  const page2 = await ctx2.newPage();
  await page2.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0' });
  await page2.goto('https://www.blackbearcasinoresort.com/epiquerewards.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page2.waitForTimeout(2000);
  const imgs = await page2.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt }));
  });
  console.log(JSON.stringify(imgs, null, 2));
  await ctx2.close();
  
  // Jackpot Junction - try curl via exec
  // Shooting Star - try curl
  
  await browser.close();
}

main().catch(console.error);
