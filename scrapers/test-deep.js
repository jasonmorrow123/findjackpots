/**
 * Deep test for pages that returned 200 but 0 dollar amounts
 * Also checks Boyd Gaming pages (existing sources)
 */
require('dotenv').config();
const { chromium } = require('playwright');
const axios = require('axios');

async function testPageDeep(browser, url, label) {
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = resp ? resp.status() : 0;
    
    await page.waitForTimeout(5000);
    
    const text = await page.evaluate(() => document.body.innerText);
    const dollars = text.match(/\$\s*[\d,]{4,}/g) || [];
    const finalUrl = page.url();
    
    console.log(`\n[${label}] ${url}`);
    console.log(`  Status: ${status}, Final URL: ${finalUrl.slice(0, 80)}`);
    console.log(`  Dollar amounts found: ${dollars.length}`);
    if (dollars.length > 0) {
      console.log(`  Amounts: ${dollars.slice(0, 10).join(', ')}`);
    }
    console.log(`  Page text preview (first 500 chars):`);
    console.log(`  ${text.replace(/\s+/g, ' ').trim().slice(0, 500)}`);
    
    // Check for API calls - look at network requests
    return { status, dollars: dollars.length, text: text.slice(0, 2000) };
  } catch (e) {
    console.log(`\n[${label}] ${url}`);
    console.log(`  ERROR: ${e.message.slice(0, 150)}`);
    return { status: 0, dollars: 0, error: e.message };
  } finally {
    await page.close();
  }
}

async function testAxiosRSS(url) {
  try {
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'JackpotMap/1.0' },
      timeout: 10000,
    });
    const text = resp.data;
    const items = (text.match(/<item>/g) || []).length;
    const dollars = (text.match(/\$[\d,]+/g) || []);
    // Extract titles
    const titles = [];
    const titleMatches = text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
    for (const m of titleMatches) titles.push(m[1]);
    
    console.log(`\nRSS: ${url.slice(0, 70)}`);
    console.log(`  Status: ${resp.status}, Items: ${items}, Dollars: ${dollars.length}`);
    console.log(`  First 5 titles:`);
    titles.slice(0, 5).forEach(t => console.log(`    - ${t}`));
    return { status: resp.status, items, dollars: dollars.length };
  } catch(e) {
    console.log(`  RSS ERROR: ${e.message}`);
    return { status: 0 };
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  console.log('=== DEEP TEST: Caesars Pages ===');
  await testPageDeep(browser, 'https://www.caesars.com/caesars-palace/casino/big-wins', 'Caesars Palace');
  await testPageDeep(browser, 'https://www.caesars.com/harrahs-las-vegas/casino/big-wins', 'Harrahs LV');
  
  console.log('\n=== DEEP TEST: South Point ===');
  await testPageDeep(browser, 'https://www.southpointcasino.com/casino/jackpot-winners', 'South Point');
  await testPageDeep(browser, 'https://www.southpointcasino.com/current-promotions', 'South Point Promos');
  
  console.log('\n=== DEEP TEST: Boyd Gaming (existing working sources) ===');
  await testPageDeep(browser, 'https://suncoast.boydgaming.com/play/winners', 'Boyd Suncoast');
  await testPageDeep(browser, 'https://goldcoast.boydgaming.com/play/winners', 'Boyd Gold Coast');
  
  console.log('\n=== DEEP TEST: Station Casinos main site ===');
  await testPageDeep(browser, 'https://www.palacestation.com/', 'Palace Station Home');
  await testPageDeep(browser, 'https://stationcasinos.com/', 'Station Casinos Home');
  
  await browser.close();
  
  console.log('\n=== RSS FEED TESTS ===');
  await testAxiosRSS('https://news.google.com/rss/search?q=las+vegas+jackpot+winner&hl=en-US&gl=US&ceid=US:en');
  await testAxiosRSS('https://news.google.com/rss/search?q=casino+jackpot+%22las+vegas%22+million&hl=en-US&gl=US&ceid=US:en');
  await testAxiosRSS('https://news.google.com/rss/search?q=megabucks+winner+nevada&hl=en-US&gl=US&ceid=US:en');
  await testAxiosRSS('https://news.google.com/rss/search?q=slot+machine+jackpot+%22Las+Vegas%22&hl=en-US&gl=US&ceid=US:en');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
