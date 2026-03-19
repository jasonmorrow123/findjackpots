/**
 * URL Discovery Test — checks which casino winner pages have real jackpot data
 */
require('dotenv').config();
const { chromium } = require('playwright');
const axios = require('axios');

const CASINO_URLS = [
  // MGM Resorts
  { url: 'https://www.mgmgrand.com/en/casino/winners.html', group: 'MGM' },
  { url: 'https://www.bellagio.com/en/casino/winners.html', group: 'MGM' },
  { url: 'https://www.mgmresorts.com/en/casino/jackpots.html', group: 'MGM' },
  { url: 'https://aria.mgmresorts.com/en/casino/winners.html', group: 'MGM' },
  // Caesars
  { url: 'https://www.caesars.com/caesars-palace/casino/big-wins', group: 'Caesars' },
  { url: 'https://www.caesars.com/harrahs-las-vegas/casino/big-wins', group: 'Caesars' },
  { url: 'https://www.caesars.com/paris-las-vegas/casino/big-wins', group: 'Caesars' },
  // Station Casinos
  { url: 'https://www.palacestation.com/play/winners', group: 'Station' },
  { url: 'https://www.redrock.sclv.com/play/winners', group: 'Station' },
  { url: 'https://www.palacestation.com/casino/jackpots', group: 'Station' },
  { url: 'https://www.greenvalleyranch.sclv.com/play/winners', group: 'Station' },
  { url: 'https://www.sunsetstation.sclv.com/play/winners', group: 'Station' },
  { url: 'https://stationcasinos.com/play/winners', group: 'Station' },
  // Wynn
  { url: 'https://www.wynnlasvegas.com/casino/jackpots', group: 'Wynn' },
  { url: 'https://www.wynnlasvegas.com/casino/winners', group: 'Wynn' },
  // Golden Nugget
  { url: 'https://www.goldennugget.com/las-vegas/casino/winners', group: 'GoldenNugget' },
  { url: 'https://www.goldennugget.com/las-vegas/promotions/winners', group: 'GoldenNugget' },
  // South Point
  { url: 'https://www.southpointcasino.com/casino/jackpot-winners', group: 'SouthPoint' },
  { url: 'https://www.southpointcasino.com/play/winners', group: 'SouthPoint' },
  // Other independents
  { url: 'https://www.suncoastcasino.com/play/winners', group: 'Independent' },
  { url: 'https://www.theD.com/play/winners', group: 'Independent' },
  { url: 'https://eldoradoresort.com/play/winners', group: 'Independent' },
  { url: 'https://www.circacasino.com/play/winners', group: 'Independent' },
];

const RSS_URLS = [
  'https://news.google.com/rss/search?q=las+vegas+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=casino+jackpot+%22las+vegas%22&hl=en-US&gl=US&ceid=US:en',
];

const DOLLAR_RE = /\$\s*[\d,]{4,}/g;

async function testWithPlaywright(browser, url) {
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = resp ? resp.status() : 0;
    
    // Wait a bit for JS to render
    await page.waitForTimeout(3000);
    
    const text = await page.evaluate(() => document.body.innerText.slice(0, 5000));
    const matches = text.match(DOLLAR_RE) || [];
    
    return {
      url,
      status,
      dollarCount: matches.length,
      preview: text.replace(/\s+/g, ' ').trim().slice(0, 300),
      finalUrl: page.url(),
    };
  } catch (e) {
    return { url, status: 0, dollarCount: 0, preview: '', error: e.message.slice(0, 100) };
  } finally {
    await page.close();
  }
}

async function testRSS(url) {
  try {
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'JackpotMap/1.0 (research; contact: data@jackpotmap.com)' },
      timeout: 10000,
    });
    const text = resp.data;
    const matches = text.match(DOLLAR_RE) || [];
    const itemCount = (text.match(/<item>/g) || []).length;
    return {
      url,
      status: resp.status,
      dollarCount: matches.length,
      itemCount,
      preview: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
    };
  } catch (e) {
    return { url, status: 0, dollarCount: 0, error: e.message.slice(0, 100) };
  }
}

async function run() {
  console.log('🔍 Casino Winner Page URL Discovery Test\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const working = [];

  for (const entry of CASINO_URLS) {
    process.stdout.write(`Testing: ${entry.url.slice(0, 70)}...`);
    const result = await testWithPlaywright(browser, entry.url);
    
    if (result.error) {
      console.log(` ❌ ERROR: ${result.error}`);
    } else if (result.status !== 200) {
      console.log(` ⚠️  Status: ${result.status} (${result.finalUrl !== entry.url ? 'redirected to ' + result.finalUrl.slice(0, 50) : 'no redirect'})`);
    } else if (result.dollarCount > 3) {
      console.log(` ✅ WORKING! Status: ${result.status}, $amounts: ${result.dollarCount}`);
      console.log(`   Preview: ${result.preview.slice(0, 200)}`);
      working.push({ ...entry, ...result });
    } else {
      console.log(` 🔸 Status: ${result.status}, $amounts: ${result.dollarCount} (too few)`);
      if (result.dollarCount > 0) console.log(`   Preview: ${result.preview.slice(0, 150)}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📡 Testing Google News RSS feeds...\n');

  for (const url of RSS_URLS) {
    process.stdout.write(`Testing: ${url.slice(0, 70)}...`);
    const result = await testRSS(url);
    if (result.error) {
      console.log(` ❌ ERROR: ${result.error}`);
    } else {
      console.log(` Status: ${result.status}, items: ${result.itemCount}, $amounts: ${result.dollarCount}`);
      if (result.dollarCount > 3) {
        console.log(`  ✅ RSS WORKING`);
        console.log(`  Preview: ${result.preview.slice(0, 200)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY: ${working.length} casino pages with jackpot data:\n`);
  for (const w of working) {
    console.log(`  ✅ ${w.url}`);
    console.log(`     Group: ${w.group}, $amounts: ${w.dollarCount}`);
  }
  
  // Output machine-readable summary for next steps
  const fs = require('fs');
  fs.writeFileSync('/tmp/working-casino-urls.json', JSON.stringify(working, null, 2));
  console.log('\nResults written to /tmp/working-casino-urls.json');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
