/**
 * Minnesota & Wisconsin Winner Page Scraper
 * Scrapes jackpot winner pages from MN and WI tribal casinos.
 *
 * These states have NO regulatory payback disclosure (tribal compacts),
 * so we harvest winner pages from individual casino websites instead.
 *
 * Run: node mn-wi-winner-scraper.js
 * Schedule: every 6 hours via cron
 *
 * ── Source Discovery Notes ─────────────────────────────────────────────────
 * URLs are tested at scraper startup — only those with 3+ dollar amounts
 * are added to the active scrape list. Dead/blocked URLs are skipped
 * gracefully with a log message.
 * ──────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * All MN/WI winner pages to attempt.
 * casinoIdentifier: used for DB lookup (name fragment or slug)
 * state: 'MN' or 'WI'
 */
const CANDIDATE_PAGES = [
  // ── Minnesota ──────────────────────────────────────────────────────────────
  {
    state: 'MN',
    casinoIdentifier: 'Mystic Lake',
    url: 'https://www.mysticlake.com/casino/jackpots',
    selector: '[class*="jackpot"], [class*="winner"], .winner-list li',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Mystic Lake',
    url: 'https://www.mysticlake.com/casino/winners',
    selector: '[class*="jackpot"], [class*="winner"], .winner-list li',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Grand Casino',
    url: 'https://www.grandcasinomn.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Black Bear',
    url: 'https://www.blackbearcasinohotel.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Treasure Island',
    url: 'https://www.treasureislandcasino.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Jackpot Junction',
    url: 'https://www.jackpotjunction.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'MN',
    casinoIdentifier: 'Fortune Bay',
    url: 'https://www.fortunebay.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  // ── Wisconsin ──────────────────────────────────────────────────────────────
  {
    state: 'WI',
    casinoIdentifier: 'Potawatomi',
    url: 'https://www.paysbig.com/casino/winners',
    selector: '[class*="winner"], [class*="jackpot"], .winner-card',
  },
  {
    state: 'WI',
    casinoIdentifier: 'Potawatomi',
    url: 'https://www.paysbig.com/promotions/jackpot-winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'WI',
    casinoIdentifier: 'Ho-Chunk',
    url: 'https://www.ho-chunkgaming.com/casino-winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'WI',
    casinoIdentifier: 'Northern Waters',
    url: 'https://www.northernwaterscasino.com/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
  {
    state: 'WI',
    casinoIdentifier: 'Lucky Star',
    url: 'https://www.luckystarcasino.org/winners',
    selector: '[class*="winner"], [class*="jackpot"]',
  },
];

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Regex-based jackpot parser — same pattern as winner-page-scraper.js
 */
function parseWinnersWithRegex(rawText) {
  const results = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const MACHINE_NAMES = [
    'Buffalo', 'Dragon Link', 'Lightning Link', 'IGT Megabucks', 'Megabucks',
    'Wheel of Fortune', 'Wolf Run', 'Double Diamond', 'Triple Diamond',
    'Lock It Link', 'Dancing Drums', 'Fu Dai Lian Lian',
    'Quick Hit', 'Blazing 7', 'Wild Cherry', 'Cleopatra',
    'Da Ji Da Li', 'Tiki Torch', 'More Chilli', 'Timber Wolf',
    'Zeus', 'Kronos', 'Spartacus', 'Dollar Storm', 'Buffalo Gold',
    'Buffalo Grand', 'Buffalo Stampede', 'Lightning Cash',
    'Miss Kitty', 'Money Wheel', 'Mighty Cash', 'Dragon Cash',
    'Wild Bison', 'Indian Dreaming', 'Fire and Ice', 'Fire Link',
  ];
  const machineRe = new RegExp(MACHINE_NAMES.join('|'), 'i');
  const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2},?\s+\d{4})/i;
  const amountRe = /\$\s*([\d,]+(?:\.\d{2})?)/g;

  let currentMachine = null;
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const window = lines.slice(Math.max(0, i - 2), i + 3).join(' ');

    const machineMatch = window.match(machineRe);
    if (machineMatch) currentMachine = machineMatch[0];

    const dateMatch = window.match(dateRe);
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[0]);
        if (!isNaN(d)) currentDate = d.toISOString().split('T')[0];
      } catch {}
    }

    let m;
    amountRe.lastIndex = 0;
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

  // Deduplicate
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.machine_name}|${r.amount_dollars}|${r.won_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Count dollar amounts on a page (used to verify a page has useful data)
 */
async function countDollarAmounts(page) {
  const text = await page.evaluate(() => document.body.innerText);
  const matches = text.match(/\$\s*[\d,]+/g) || [];
  const amounts = matches.filter(m => {
    const val = parseFloat(m.replace(/[$,\s]/g, ''));
    return val >= 500 && val <= 25000000;
  });
  return { count: amounts.length, text };
}

/**
 * Find casino_id by name fragment for MN or WI
 */
async function findCasinoId(identifier, state) {
  const firstWord = identifier.split(/[\s,]+/)[0];
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2`,
    [state, `%${firstWord}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  // Full phrase
  r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2`,
    [state, `%${identifier}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  return null;
}

/**
 * Store jackpots in DB
 */
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
      // Ignore constraint errors for null machine_name
      if (!err.message.includes('unique')) {
        console.error('  DB error:', err.message);
      }
    }
  }
  return added;
}

/**
 * Scrape a single page
 */
async function scrapePage(browser, config) {
  const { url, casinoIdentifier, state, selector } = config;
  const page = await browser.newPage();
  let result = { added: 0, found: 0, working: false, error: null };

  try {
    // Use 'load' instead of 'networkidle' — tribal sites often have hanging requests
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Wait a bit for dynamic content
      await page.waitForTimeout(3000);
    } catch (gotoErr) {
      // If domcontentloaded also fails, try with even lower bar
      if (!gotoErr.message.includes('ERR_NAME_NOT_RESOLVED') && !gotoErr.message.includes('ERR_CERT')) {
        await page.goto(url, { waitUntil: 'commit', timeout: 15000 });
        await page.waitForTimeout(4000);
      } else {
        throw gotoErr;
      }
    }

    const { count, text } = await countDollarAmounts(page);
    console.log(`  Dollar amounts found: ${count}`);

    if (count < 3) {
      result.error = `Only ${count} dollar amounts — skipping`;
      return result;
    }

    result.working = true;

    // Try structured extract with selector
    let rawText = '';
    if (selector) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const texts = await Promise.all(elements.map(el => el.innerText()));
          rawText = texts.join('\n');
        }
      } catch {}
    }
    if (!rawText) rawText = text;

    const jackpots = parseWinnersWithRegex(rawText);
    result.found = jackpots.length;
    console.log(`  Parsed ${jackpots.length} jackpot records`);

    const casino = await findCasinoId(casinoIdentifier, state);
    if (!casino) {
      console.log(`  ⚠️  No DB match for "${casinoIdentifier}" in ${state}`);
      return result;
    }

    result.added = await storeJackpots(casino.id, jackpots, url);
    console.log(`  ✅ ${result.added} new jackpots stored for ${casino.name}`);

  } catch (err) {
    result.error = err.message;
    console.log(`  ❌ Error: ${err.message}`);
  } finally {
    await page.close();
  }

  return result;
}

/**
 * Main
 */
async function run() {
  console.log('🌲 MN/WI Winner Page Scraper\n');
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  let totalAdded = 0;
  let workingPages = 0;
  let errorCount = 0;

  // Track which URLs per casino we've already succeeded at (skip duplicates)
  const succeededCasinos = new Set();

  for (const config of CANDIDATE_PAGES) {
    const key = `${config.state}:${config.casinoIdentifier}`;
    if (succeededCasinos.has(key)) {
      console.log(`\nSkipping ${config.url} (already got data for ${config.casinoIdentifier})`);
      continue;
    }

    console.log(`\n📄 [${config.state}] ${config.casinoIdentifier} — ${config.url}`);
    const result = await scrapePage(browser, config);

    if (result.working) {
      workingPages++;
      totalAdded += result.added;
      if (result.added > 0) succeededCasinos.add(key);
    }
    if (result.error && !result.working) {
      errorCount++;
    }

    // Polite delay between sites
    await new Promise(r => setTimeout(r, 2500));
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`   Working pages: ${workingPages}/${CANDIDATE_PAGES.length}`);
  console.log(`   Total jackpots added: ${totalAdded}`);
  console.log(`   Errors/blocked: ${errorCount}`);

  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('mn-wi-winner-scraper', $1, $2, $3)`,
    [errorCount > workingPages ? 'partial' : 'success', totalAdded, new Date(startTime)]
  );

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
