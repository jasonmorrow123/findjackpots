/**
 * Research casino event pages - check what data is available
 */
const { chromium } = require('playwright');

const URLS = [
  { name: 'Mystic Lake Events', url: 'https://www.mysticlake.com/entertainment/events' },
  { name: 'Mystic Lake Promotions', url: 'https://www.mysticlake.com/promotions' },
  { name: 'Grand Casino Events', url: 'https://www.grandcasinomn.com/events' },
  { name: 'Black Bear Events', url: 'https://www.blackbearcasinoresort.com/entertainment/events' },
  { name: 'Treasure Island Events', url: 'https://www.treasureislandcasino.com/entertainment/events' },
  { name: 'Prairie Meadows Events', url: 'https://www.prairiemeadows.com/events' },
  { name: 'Prairie Meadows Promotions', url: 'https://www.prairiemeadows.com/promotions' },
  { name: 'South Point Events', url: 'https://www.southpointcasino.com/entertainment/events' },
  { name: 'Sun Coast Events', url: 'https://suncoast.boydgaming.com/entertainment/events' },
];

async function research() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const { name, url } of URLS) {
    console.log(`\n=== ${name} ===`);
    console.log(`URL: ${url}`);
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = response ? response.status() : 'no response';
      console.log(`Status: ${status}`);
      
      await page.waitForTimeout(2000);
      
      // Get page text
      const text = await page.evaluate(() => document.body.innerText);
      
      // Look for date patterns
      const datePattern = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?/gi;
      const timePattern = /\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/gi;
      
      const dates = [...new Set(text.match(datePattern) || [])].slice(0, 10);
      const times = [...new Set(text.match(timePattern) || [])].slice(0, 10);
      
      console.log(`Dates found: ${dates.slice(0,5).join(', ') || 'none'}`);
      console.log(`Times found: ${times.slice(0,5).join(', ') || 'none'}`);
      
      // Sample text
      const lines = text.split('\n').filter(l => l.trim().length > 5).slice(0, 30);
      console.log(`Sample content:`);
      lines.forEach(l => console.log(`  ${l.trim().substring(0, 100)}`));
      
      // Check for structured elements
      const eventCount = await page.evaluate(() => {
        const selectors = [
          '.event', '[class*="event"]', '[class*="promo"]', 
          'article', '.card', '[class*="card"]',
          'li[class]', '.listing'
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 2) return { selector: sel, count: els.length };
        }
        return null;
      });
      
      if (eventCount) {
        console.log(`Structured elements: ${eventCount.selector} (${eventCount.count} found)`);
      }
      
      results.push({ name, url, status, dates: dates.slice(0,5), times: times.slice(0,5) });
      
    } catch (err) {
      console.log(`Error: ${err.message}`);
      results.push({ name, url, status: 'error', error: err.message });
    }
    
    await context.close();
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();
  console.log('\n=== SUMMARY ===');
  results.forEach(r => {
    console.log(`${r.name}: ${r.status} | dates: ${(r.dates||[]).join(', ') || 'none'}`);
  });
}

research().catch(console.error);
