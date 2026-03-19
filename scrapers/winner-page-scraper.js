/**
 * Casino Winner Page Scraper
 * Uses Playwright to scrape jackpot winner pages from casino websites.
 * Handles JavaScript-rendered pages that Cheerio can't reach.
 *
 * Run: node winner-page-scraper.js
 * Schedule: every 6 hours via cron
 *
 * ── Source Discovery Notes (tested 2026-03-19) ────────────────────────────
 * WORKING (dollar amounts confirmed):
 *   Boyd Gaming: suncoast.boydgaming.com, goldcoast.boydgaming.com,
 *                mainstreet.boydgaming.com, thecal.boydgaming.com,
 *                fremontcasino.boydgaming.com, samstownlv.boydgaming.com
 *
 * NOT WORKING (as of discovery run):
 *   MGM Resorts (mgmgrand, bellagio, aria) — HTTP2 protocol errors (bot block)
 *   Caesars Entertainment — pages load but return 0 dollar amounts (lazy load / auth wall)
 *   Station Casinos (palacestation.com, redrock.sclv.com, etc.) — 404 or timeout
 *   Wynn Las Vegas — 404 on /casino/jackpots and /casino/winners
 *   Golden Nugget — 403 Forbidden
 *   South Point — page loads but 0 dollar amounts (content not public)
 *   The D, Eldorado, Circa — 404 or timeout
 *
 * For Strip/major casino jackpots, use news-monitor.js (Google News RSS)
 * which captures high-profile wins from news coverage.
 * ──────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Casino winner pages to scrape.
 * Each entry has:
 *   - casinoSlug: matches slug in casinos table
 *   - url: winner/jackpot page URL
 *   - selector: CSS selector for the winner entries (best guess; tune per site)
 */
const WINNER_PAGES = [
  // ── Boyd Gaming (confirmed working) ──────────────────────────────────────
  {
    casinoSlug: 'suncoast-hotel-casino',
    url: 'https://suncoast.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"], .jackpot',
    chain: 'Boyd Gaming',
  },
  {
    casinoSlug: 'gold-coast-hotel-casino',
    url: 'https://goldcoast.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"]',
    chain: 'Boyd Gaming',
  },
  {
    casinoSlug: 'main-street-station-casino-brewery-hotel',
    url: 'https://mainstreet.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"]',
    chain: 'Boyd Gaming',
  },
  {
    casinoSlug: 'california-hotel-casino',
    url: 'https://thecal.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"]',
    chain: 'Boyd Gaming',
  },
  {
    casinoSlug: 'fremont-hotel-casino',
    url: 'https://fremontcasino.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"]',
    chain: 'Boyd Gaming',
  },
  {
    casinoSlug: 'sam-s-town-hotel-gambling-hall',
    url: 'https://samstownlv.boydgaming.com/play/winners',
    selector: '.winner-card, [class*="winner"]',
    chain: 'Boyd Gaming',
  },
  // ── Station Casinos (check gaming promotions page) ────────────────────────
  {
    casinoSlug: 'palace-station-hotel-and-casino',
    url: 'https://stationcasinos.com/play/gaming-promotions/',
    selector: '[class*="winner"], [class*="jackpot"], .promo-item',
    chain: 'Station Casinos',
  },
  // ── Independents ──────────────────────────────────────────────────────────
  {
    casinoSlug: 'south-point-hotel-casino-spa',
    url: 'https://www.southpointcasino.com/current-promotions',
    selector: '[class*="winner"], [class*="jackpot"], .promo',
    chain: 'Independent',
  },
];

/**
 * Use GPT-4o-mini to parse raw page text into structured jackpot records.
 * Falls back to regex if no OpenAI key is set.
 */
async function parseWinnersFromText(rawText, casinoName) {
  if (!rawText || rawText.length < 50) return [];

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    return parseWinnersWithLLM(rawText, casinoName);
  }
  return parseWinnersWithRegex(rawText);
}

async function parseWinnersWithLLM(rawText, casinoName) {
  const prompt = `You are parsing a casino jackpot winners page.
Extract all jackpot wins from this text. Return a JSON array.
If no jackpots found, return [].

Casino: ${casinoName}
Page text (first 3000 chars):
${rawText.slice(0, 3000)}

Return array of objects:
[{
  "machine_name": "Buffalo Gold",
  "amount_dollars": 125430,
  "won_date": "2024-01-15",
  "machine_type": "slot"
}]

Only include entries with a dollar amount. Never include player names.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 1000,
  });

  try {
    const content = response.choices[0].message.content.trim();
    const json = content.match(/\[[\s\S]*\]/)?.[0];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Regex-based fallback parser for casino winner pages.
 * Looks for dollar amounts with context (machine name nearby).
 */
function parseWinnersWithRegex(rawText) {
  const results = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Slot machine name patterns
  const MACHINE_NAMES = [
    'Buffalo', 'Dragon Link', 'Lightning Link', 'IGT Megabucks', 'Megabucks',
    'Wheel of Fortune', 'Wolf Run', 'Double Diamond', 'Triple Diamond',
    'Lock It Link', 'Dancing Drums', 'Fu Dai Lian Lian', 'Konami',
    'Aristocrat', 'Quick Hit', 'Blazing 7', 'Wild Cherry', 'Cleopatra',
    'Da Ji Da Li', 'Tiki Torch', 'More Chilli', 'Timber Wolf',
    'Zeus', 'Kronos', 'Spartacus', 'Dollar Storm', 'Buffalo Gold',
    'Buffalo Grand', 'Buffalo Stampede', 'Lightning Cash',
  ];
  const machineRe = new RegExp(MACHINE_NAMES.join('|'), 'i');

  // Date patterns
  const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2},?\s+\d{4})/i;

  // Dollar amount patterns — $1,000+ jackpots only
  const amountRe = /\$\s*([\d,]+(?:\.\d{2})?)/g;

  let currentMachine = null;
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const window = lines.slice(Math.max(0, i-2), i+3).join(' ');

    // Extract machine name from context
    const machineMatch = window.match(machineRe);
    if (machineMatch) currentMachine = machineMatch[0];

    // Extract date from context
    const dateMatch = window.match(dateRe);
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[0]);
        if (!isNaN(d)) currentDate = d.toISOString().split('T')[0];
      } catch {}
    }

    // Find dollar amounts on this line
    let amountMatch;
    while ((amountMatch = amountRe.exec(line)) !== null) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      // Filter to jackpot range: $1,000 to $25,000,000
      if (amount >= 1000 && amount <= 25000000) {
        results.push({
          machine_name: currentMachine || 'Unknown',
          amount_dollars: amount,
          won_date: currentDate,
          machine_type: 'slot',
        });
      }
    }
    amountRe.lastIndex = 0;
  }

  // Deduplicate by amount+machine
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.machine_name}|${r.amount_dollars}|${r.won_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get casino_id from slug
 */
async function getCasinoId(slug) {
  const r = await pool.query('SELECT id FROM casinos WHERE slug = $1', [slug]);
  return r.rows[0]?.id || null;
}

/**
 * Store jackpot records from scrape
 */
async function storeJackpots(casinoId, jackpots, sourceUrl) {
  let added = 0;
  for (const j of jackpots) {
    if (!j.amount_dollars || j.amount_dollars < 1000) continue;
    try {
      // Dedup on casino + machine + amount — Boyd pages have no unique IDs per win
      const result = await pool.query(
        `INSERT INTO jackpots
           (casino_id, machine_name, machine_type, amount_cents, won_at, source, source_url, trust_score)
         VALUES ($1, $2, $3, $4, $5, 'website', $6, 7)
         ON CONFLICT (casino_id, machine_name, amount_cents) WHERE source = 'website' AND machine_name IS NOT NULL
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
      console.error('  DB error:', err.message);
    }
  }
  return added;
}

/**
 * Scrape a single winner page
 */
async function scrapePage(browser, config) {
  const { casinoSlug, url, selector, chain } = config;
  console.log(`\n📄 Scraping: ${url}`);

  const page = await browser.newPage();
  let rawText = '';

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Boyd Gaming sites have a consistent structured format — extract directly
    let structuredJackpots = [];
    if (url.includes('boydgaming.com')) {
      structuredJackpots = await page.evaluate(() => {
        const results = [];
        // Boyd winner cards: amount | machine | casino | winner name
        // Look for dollar amounts paired with machine names
        const allText = document.body.innerText;
        const blocks = allText.split('Browse').pop(); // skip nav
        const lines = blocks.split('\n').map(l => l.trim()).filter(Boolean);
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          // Dollar amount line
          const amtMatch = line.match(/^\$([\d,]+)$/);
          if (amtMatch) {
            const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
            const machineName = lines[i+1] || null;
            if (amount >= 500 && amount <= 25000000 && machineName && machineName.length < 60) {
              results.push({
                machine_name: machineName,
                amount_dollars: amount,
                won_date: null,
                machine_type: 'slot',
              });
            }
          }
          i++;
        }
        return results;
      });
      if (structuredJackpots.length > 0) {
        console.log(`  Boyd structured parse: ${structuredJackpots.length} winners`);
      }
    }

    // Try targeted selector first
    if (selector && structuredJackpots.length === 0) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        rawText = await Promise.all(elements.map((el) => el.innerText()))
          .then((texts) => texts.join('\n'));
        console.log(`  Found ${elements.length} matching elements via selector`);
      }
    }

    // Fallback: grab full page text (LLM will filter)
    if (!rawText && structuredJackpots.length === 0) {
      rawText = await page.evaluate(() => document.body.innerText);
      console.log(`  Falling back to full page text (${rawText.length} chars)`);
    }

    // Get casino name for context
    const title = await page.title();
    const casinoName = title.split('|')[0].trim();

    // Use structured data if available, otherwise parse text
    const jackpots = structuredJackpots.length > 0
      ? structuredJackpots
      : await parseWinnersFromText(rawText, casinoName);
    console.log(`  Parsed ${jackpots.length} jackpot records`);

    const casinoId = await getCasinoId(casinoSlug);
    if (!casinoId) {
      console.warn(`  ⚠️  No DB record for slug "${casinoSlug}" — skipping store`);
      return { added: 0, skipped: jackpots.length };
    }

    const added = await storeJackpots(casinoId, jackpots, url);
    console.log(`  ✅ ${added} new jackpots added`);
    return { added, skipped: jackpots.length - added };

  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return { added: 0, skipped: 0, error: err.message };
  } finally {
    await page.close();
  }
}

/**
 * Main runner
 */
async function run() {
  console.log('🎰 JackpotMap Winner Page Scraper\n');
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true });
  let totalAdded = 0;
  let totalErrors = 0;

  for (const config of WINNER_PAGES) {
    const result = await scrapePage(browser, config);
    totalAdded += result.added;
    if (result.error) totalErrors++;
    // Be polite — wait between sites
    await new Promise((r) => setTimeout(r, 2000));
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s — ${totalAdded} new jackpots added, ${totalErrors} errors`);

  // Log pipeline run
  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('winner-page-scraper', $1, $2, $3)`,
    [totalErrors > 0 ? 'partial' : 'success', totalAdded, new Date(startTime)]
  );

  await pool.end();
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
