/**
 * Casino Winner Page Scraper v2
 * Expands winner data sources beyond Boyd Gaming to include:
 *   - Station Casinos (Red Rock, Green Valley Ranch, Palace Station, Boulder Station,
 *     Fiesta Rancho, Fiesta Henderson, Suncoast, Santa Fe, Texas Station, Sunset Station)
 *   - Golden Nugget (Las Vegas)
 *   - South Point Casino
 *   - Mystic Lake (MN) — multiple URL attempts
 *
 * Uses Playwright for JS-rendered pages. Automatically detects which URLs
 * have useful data (3+ jackpot amounts) and skips blocked/404 pages.
 *
 * ── Discovery Notes (tested 2026-03-19 in winner-page-scraper.js) ──────────
 * Station Casinos: /jackpot-winners 404 on main domain; individual property
 *   sites (redrock.sclv.com, palacestation.com) may have /play/winners format
 * Golden Nugget: 403 Forbidden on /jackpot-winners/
 * South Point: Page loads but 0 dollar amounts (content behind auth/lazy load)
 * Mystic Lake: No /jackpot-winners or /winners page found
 *
 * v2 tries more URL variants per property and uses browser stealth headers
 * to reduce 403 blocks. Sites that remain blocked are logged but not fatal.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * To run:
 *   DATABASE_URL="..." node scrapers/winner-page-scraper-v2.js
 *
 * To schedule via PM2:
 *   pm2 start scrapers/winner-page-scraper-v2.js --name "winner-scraper-v2" --cron "0 *\/4 * * *"
 *
 * Local test:
 *   node scrapers/winner-page-scraper-v2.js
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');

const isProduction = !!process.env.DATABASE_URL;
const pool = new Pool(
  isProduction
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap' }
);

// ── Candidate pages — ordered by most likely to work ─────────────────────────
// For each casino chain, we list multiple URL variants.
// The scraper tests each URL and uses the first one that yields 3+ dollar amounts.

const CANDIDATE_PAGES = [

  // ── Station Casinos ─────────────────────────────────────────────────────────
  // sclv.com is the Station Casinos loyalty/portal domain
  {
    casinoIdentifier: 'Red Rock Casino',
    casinoName: 'Red Rock Casino Resort & Spa',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.redrock.sclv.com/play/winners',
      'https://www.redrockcasino.com/play/winners',
      'https://www.redrock.sclv.com/casino/jackpot-winners',
      'https://www.stationcasinos.com/red-rock/winners',
      'https://www.redrockcasino.com/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"], .winner-card',
  },
  {
    casinoIdentifier: 'Green Valley Ranch',
    casinoName: 'Green Valley Ranch Resort Spa Casino',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.greenvalleyranch.sclv.com/play/winners',
      'https://www.greenvalleyranch.com/play/winners',
      'https://www.greenvalleyranch.sclv.com/casino/jackpot-winners',
      'https://www.greenvalleyranch.com/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"], .winner-card',
  },
  {
    casinoIdentifier: 'Palace Station',
    casinoName: 'Palace Station Hotel and Casino',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.palacestation.sclv.com/play/winners',
      'https://www.palacestation.com/play/winners',
      'https://www.palacestation.com/jackpot-winners',
      'https://www.palacestation.sclv.com/casino/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Boulder Station',
    casinoName: 'Boulder Station Hotel Casino',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.boulderstation.sclv.com/play/winners',
      'https://www.boulderstation.com/play/winners',
      'https://www.boulderstation.sclv.com/casino/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Sunset Station',
    casinoName: 'Sunset Station Hotel Casino',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.sunsetstation.sclv.com/play/winners',
      'https://www.sunsetstation.com/play/winners',
      'https://www.sunsetstation.sclv.com/casino/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Santa Fe Station',
    casinoName: 'Santa Fe Station Hotel Casino',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.santafestation.sclv.com/play/winners',
      'https://www.santafestation.com/play/winners',
      'https://www.santafestation.sclv.com/casino/jackpot-winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Texas Station',
    casinoName: 'Texas Station Gambling Hall & Hotel',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.texasstation.sclv.com/play/winners',
      'https://www.texasstation.com/play/winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Fiesta Rancho',
    casinoName: 'Fiesta Rancho Casino Hotel',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.fiestarancho.sclv.com/play/winners',
      'https://www.fiestarancho.com/play/winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    casinoIdentifier: 'Fiesta Henderson',
    casinoName: 'Fiesta Henderson Casino Hotel',
    chain: 'Station Casinos',
    state: 'NV',
    urls: [
      'https://www.fiestahenderson.sclv.com/play/winners',
      'https://www.fiestahenderson.com/play/winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },

  // ── Golden Nugget ────────────────────────────────────────────────────────────
  {
    casinoIdentifier: 'Golden Nugget Las Vegas',
    casinoName: 'Golden Nugget Las Vegas Hotel & Casino',
    chain: 'Golden Nugget',
    state: 'NV',
    urls: [
      'https://www.goldennugget.com/las-vegas/jackpot-winners/',
      'https://www.goldennugget.com/las-vegas/casino/jackpot-winners/',
      'https://www.goldennugget.com/las-vegas/winners/',
      'https://www.goldennugget.com/las-vegas/casino/winners/',
      'https://www.goldennugget.com/las-vegas/promotions/winners/',
    ],
    selector: '[class*="winner"], [class*="jackpot"], .jackpot-card',
  },

  // ── South Point Casino ────────────────────────────────────────────────────────
  {
    casinoIdentifier: 'South Point',
    casinoName: 'South Point Hotel Casino & Spa',
    chain: 'Independent',
    state: 'NV',
    urls: [
      'https://www.southpointcasino.com/jackpot-winners',
      'https://www.southpointcasino.com/casino/jackpot-winners',
      'https://www.southpointcasino.com/promotions/jackpot-winners',
      'https://www.southpointcasino.com/current-promotions',
      'https://www.southpointcasino.com/casino/winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"], .winner-list li',
  },

  // ── Mystic Lake ───────────────────────────────────────────────────────────────
  {
    casinoIdentifier: 'Mystic Lake',
    casinoName: 'Mystic Lake Casino Hotel',
    chain: 'Mystic Lake',
    state: 'MN',
    urls: [
      'https://www.mysticlake.com/casino/jackpots',
      'https://www.mysticlake.com/casino/winners',
      'https://www.mysticlake.com/promotions/jackpot-winners',
      'https://www.mysticlake.com/jackpot-winners',
      'https://www.mysticlake.com/winners',
      'https://www.mysticlake.com/casino/jackpot-winners',
    ],
    selector: '[class*="jackpot"], [class*="winner"], .winner-card',
  },

  // ── Additional NV independents worth trying ────────────────────────────────
  {
    casinoIdentifier: 'Suncoast',
    casinoName: 'Suncoast Hotel and Casino',
    chain: 'Boyd Gaming',
    state: 'NV',
    urls: [
      // Boyd is already covered in winner-page-scraper.js but let's see if
      // the non-branded subdomain works with different paths
      'https://www.suncoastcasino.com/play/winners',
      'https://www.suncoastcasino.com/jackpot-winners',
    ],
    selector: '.winner-card, [class*="winner"]',
  },
  {
    casinoIdentifier: 'Arizona Charlie',
    casinoName: "Arizona Charlie's Boulder",
    chain: 'Boyd Gaming',
    state: 'NV',
    urls: [
      'https://azcharlieboulder.boydgaming.com/play/winners',
      'https://azcharliesboulder.boydgaming.com/play/winners',
    ],
    selector: '.winner-card, [class*="winner"]',
  },

  // ── Laughlin casinos ───────────────────────────────────────────────────────
  {
    casinoIdentifier: 'Harrah Laughlin',
    casinoName: "Harrah's Laughlin Hotel Casino",
    chain: 'Caesars',
    state: 'NV',
    urls: [
      'https://www.caesars.com/harrahs-laughlin/casino/jackpot-winners',
      'https://www.harrahslaughlin.com/casino/jackpot-winners',
      'https://www.caesars.com/harrahs-laughlin/casino/winners',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },

  // ── Atlantic City ──────────────────────────────────────────────────────────
  {
    casinoIdentifier: 'Golden Nugget Atlantic City',
    casinoName: 'Golden Nugget Atlantic City',
    chain: 'Golden Nugget',
    state: 'NJ',
    urls: [
      'https://www.goldennugget.com/atlantic-city/jackpot-winners/',
      'https://www.goldennugget.com/atlantic-city/casino/jackpot-winners/',
      'https://www.goldennugget.com/atlantic-city/winners/',
    ],
    selector: '[class*="winner"], [class*="jackpot"]',
  },
];

// ── Regex parser ─────────────────────────────────────────────────────────────

const MACHINE_NAMES = [
  'Buffalo Gold', 'Buffalo Grand', 'Buffalo Stampede', 'Buffalo Chief',
  'Buffalo', 'Dragon Link', 'Lightning Link', 'IGT Megabucks', 'Megabucks',
  'Wheel of Fortune', 'Wolf Run', 'Double Diamond', 'Triple Diamond',
  'Lock It Link', 'Dancing Drums', 'Fu Dai Lian Lian',
  'Quick Hit', 'Blazing 7', 'Wild Cherry', 'Cleopatra',
  'Da Ji Da Li', 'Tiki Torch', 'More Chilli', 'Timber Wolf',
  'Zeus', 'Kronos', 'Spartacus', 'Dollar Storm', 'Lightning Cash',
  'Miss Kitty', 'Money Wheel', 'Mighty Cash', 'Dragon Cash',
  'Wild Bison', 'Indian Dreaming', 'Fire Link', 'Fire and Ice',
  'Super Times Pay', 'Reel King', 'Blood Suckers', 'Starburst',
  'Gonzo', 'Thunderstruck', 'Immortal Romance', 'Book of Dead',
  'Jackpot Party', 'Gold Fish', 'Lobstermania', 'Texas Tea',
  'Coyote Moon', 'Black Widow', 'Little Green Men', 'Renoir Riches',
  'Hexbreaker', 'White Orchid', 'Red Flag Fleet', 'Siberian Storm',
  'Pride of Persia', 'Cats', 'Davinci Diamonds', 'Enchanted Unicorn',
];
const machineRe = new RegExp(
  MACHINE_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);
const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2},?\s+\d{4})/i;

function parseWinnersWithRegex(rawText) {
  const results = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const amountRe = /\$\s*([\d,]+(?:\.\d{2})?)/g;

  let currentMachine = null;
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ctx = lines.slice(Math.max(0, i - 2), i + 3).join(' ');

    const mMatch = ctx.match(machineRe);
    if (mMatch) currentMachine = mMatch[0];

    const dMatch = ctx.match(dateRe);
    if (dMatch) {
      try {
        const d = new Date(dMatch[0]);
        if (!isNaN(d)) currentDate = d.toISOString().split('T')[0];
      } catch {}
    }

    amountRe.lastIndex = 0;
    let m;
    while ((m = amountRe.exec(line)) !== null) {
      const amount = parseFloat(m[1].replace(/,/g, ''));
      if (amount >= 1000 && amount <= 25000000) {
        results.push({
          machine_name: currentMachine || null,
          amount_dollars: amount,
          won_date: currentDate,
          machine_type: 'slot',
        });
      }
    }
  }

  // Dedup
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.machine_name}|${r.amount_dollars}|${r.won_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function findCasinoId(identifier, state) {
  // Try exact name match first
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 1`,
    [`%${identifier}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  // Try first word
  const firstWord = identifier.split(/[\s,]+/)[0];
  r = await pool.query(
    `SELECT id, name FROM casinos WHERE name ILIKE $1 ${state ? 'AND state = $2' : ''} LIMIT 1`,
    state ? [`%${firstWord}%`, state] : [`%${firstWord}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  return null;
}

async function storeJackpots(casinoId, jackpots, sourceUrl) {
  let added = 0;
  for (const j of jackpots) {
    if (!j.amount_dollars || j.amount_dollars < 1000) continue;
    try {
      const result = await pool.query(
        `INSERT INTO jackpots
           (casino_id, machine_name, machine_type, amount_cents, won_at, source, source_url, trust_score)
         VALUES ($1, $2, $3, $4, $5, 'website', $6, 7)
         ON CONFLICT (casino_id, machine_name, amount_cents)
         WHERE source = 'website' AND machine_name IS NOT NULL
         DO NOTHING`,
        [
          casinoId,
          j.machine_name || null,
          j.machine_type || 'slot',
          Math.round(j.amount_dollars * 100),
          j.won_date ? new Date(j.won_date) : null,
          sourceUrl,
        ]
      );
      if (result.rowCount > 0) added++;
    } catch (err) {
      if (!err.message.includes('unique')) {
        console.error('  DB error:', err.message);
      }
    }
  }
  return added;
}

// ── Page tester ───────────────────────────────────────────────────────────────

async function countJackpotAmounts(page) {
  const text = await page.evaluate(() => document.body?.innerText || '');
  const matches = text.match(/\$\s*[\d,]+/g) || [];
  const jackpotAmounts = matches.filter(m => {
    const val = parseFloat(m.replace(/[$,\s]/g, ''));
    return val >= 500 && val <= 25000000;
  });
  return { count: jackpotAmounts.length, text };
}

// ── Main scrape function ──────────────────────────────────────────────────────

async function scrapeConfig(browser, config) {
  const { casinoIdentifier, casinoName, state, selector, urls } = config;
  console.log(`\n🎰 ${casinoName} (${config.chain})`);

  for (const url of urls) {
    console.log(`  → Trying: ${url}`);
    const page = await browser.newPage();

    // Set realistic browser headers to reduce bot detection
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      }).catch(() => null);

      if (!response) {
        console.log(`    ✗ No response`);
        await page.close();
        continue;
      }

      const status = response.status();
      if (status >= 400) {
        console.log(`    ✗ HTTP ${status}`);
        await page.close();
        continue;
      }

      // Wait a bit for dynamic content
      await page.waitForTimeout(3000);

      const { count, text } = await countJackpotAmounts(page);
      console.log(`    ✓ HTTP ${status} — ${count} jackpot amounts found`);

      if (count < 3) {
        await page.close();
        continue;
      }

      // Page has data — extract
      let rawText = text;
      if (selector) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            const texts = await Promise.all(elements.map(el => el.innerText().catch(() => '')));
            const selectorText = texts.filter(Boolean).join('\n');
            if (selectorText.length > 50) rawText = selectorText;
          }
        } catch {}
      }

      const jackpots = parseWinnersWithRegex(rawText);
      console.log(`    Parsed ${jackpots.length} jackpot records`);

      if (jackpots.length === 0) {
        await page.close();
        continue;
      }

      const casino = await findCasinoId(casinoIdentifier, state);
      if (!casino) {
        console.log(`    ⚠️  No DB match for "${casinoIdentifier}" in ${state || 'any state'}`);
        await page.close();
        return { added: 0, found: jackpots.length, url, working: true };
      }

      const added = await storeJackpots(casino.id, jackpots, url);
      console.log(`    ✅ ${added} new jackpots → ${casino.name} (id=${casino.id})`);

      await page.close();
      return { added, found: jackpots.length, url, working: true };

    } catch (err) {
      const short = err.message.split('\n')[0].slice(0, 80);
      console.log(`    ✗ Error: ${short}`);
      await page.close();
    }

    // Polite delay between URL attempts
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`  ⛔ All URLs failed for ${casinoName}`);
  return { added: 0, found: 0, url: null, working: false };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function run() {
  console.log('🎰 Casino Winner Page Scraper v2');
  console.log(`   Mode: ${isProduction ? 'PRODUCTION' : 'local'}`);
  console.log(`   Sources: ${CANDIDATE_PAGES.length} casinos\n`);

  const startTime = Date.now();

  const browser = await chromium.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const summary = {
    working: [],
    blocked: [],
    totalAdded: 0,
  };

  for (const config of CANDIDATE_PAGES) {
    const result = await scrapeConfig(browser, config);

    if (result.working) {
      summary.working.push({
        casino: config.casinoName,
        chain: config.chain,
        added: result.added,
        found: result.found,
        url: result.url,
      });
      summary.totalAdded += result.added;
    } else {
      summary.blocked.push({ casino: config.casinoName, chain: config.chain });
    }

    // Polite delay between casinos
    await new Promise(r => setTimeout(r, 2500));
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\n✅ Working sources (${summary.working.length}):`);
  for (const w of summary.working) {
    console.log(`   ${w.casino} — ${w.added} new jackpots (${w.found} parsed)`);
    console.log(`     URL: ${w.url}`);
  }
  console.log(`\n⛔ Blocked/unavailable (${summary.blocked.length}):`);
  for (const b of summary.blocked) {
    console.log(`   ${b.casino} (${b.chain})`);
  }
  console.log(`\n💾 Total new jackpots added to DB: ${summary.totalAdded}`);
  console.log(`⏱  Elapsed: ${elapsed}s`);
  console.log('═'.repeat(60));

  // Log pipeline run
  try {
    await pool.query(
      `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
       VALUES ('winner-page-scraper-v2', $1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [
        summary.working.length > 0 ? 'success' : 'failed',
        summary.totalAdded,
        new Date(startTime),
      ]
    );
  } catch {
    // pipeline_runs table may not have ON CONFLICT — ignore
  }

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
