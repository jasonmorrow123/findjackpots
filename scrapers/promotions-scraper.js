#!/usr/bin/env node
/**
 * Casino Promotions Scraper
 * Scrapes active promotions from casino websites and stores in casino_promotions table.
 */

const https = require('https');
const http = require('http');
const { Pool } = require('pg');
const { URL } = require('url');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const PROMO_PAGES = [
  { casinoName: 'Mystic Lake Casino Hotel', url: 'https://www.mysticlake.com/promotions' },
  { casinoName: 'Grand Casino Hinckley', url: 'https://www.grandcasinos.com/hinckley/promotions' },
  { casinoName: 'Black Bear Casino Resort', url: 'https://www.blackbearcasinoresort.com/promotions' },
  { casinoName: 'Treasure Island Resort & Casino', url: 'https://www.ticasino.com/promotions' },
  { casinoName: 'Palace Station Hotel and Casino', url: 'https://www.palacestation.com/promotions' },
  { casinoName: 'Red Rock Casino Resort & Spa', url: 'https://www.redrock.com/promotions' },
  { casinoName: 'Green Valley Ranch Race & Sports Book', url: 'https://www.greenvalleyranch.com/promotions' },
  { casinoName: 'South Point Hotel, Casino & Spa', url: 'https://www.southpointcasino.com/promotions' },
  { casinoName: 'Golden Nugget Las Vegas', url: 'https://www.goldennugget.com/las-vegas/promotions' },
  { casinoName: 'Potawatomi Casino', url: 'https://www.paysbig.com/promotions' },
  { casinoName: 'Soaring Eagle Casino & Resort', url: 'https://www.soaringeaglecasino.com/promotions' },
  { casinoName: 'Four Winds Casino New Buffalo', url: 'https://www.fourwindscasino.com/promotions' },
  { casinoName: 'Rivers Casino', url: 'https://www.riverscasino.com/pittsburgh/promotions' },
  { casinoName: 'Hollywood Casino Aurora', url: 'https://www.hollywoodcasinoaurora.com/promotions' },
];

// ── HTTP fetch with redirect following ───────────────────────────────────────
function fetchUrl(urlStr, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(urlStr); } catch(e) { return reject(e); }
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      rejectUnauthorized: false,
      timeout: 15000,
    };
    const req = lib.request(options, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        res.resume();
        return resolve(fetchUrl(loc, redirectCount + 1));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), url: urlStr }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

// ── Classify promo type from text ────────────────────────────────────────────
function classifyPromoType(text) {
  const t = text.toLowerCase();
  if (/free\s*play|freeplay|\$\d+.*free|free.*slot/.test(t)) return 'free_play';
  if (/tournament|tourney/.test(t)) return 'tournament';
  if (/drawing|drawing|raffle|giveaway/.test(t)) return 'drawing';
  if (/concert|entertain|show|perform|music|comedy|live/.test(t)) return 'concert';
  if (/buffet|dining|restaurant|food|brunch|dinner|lunch|breakfast/.test(t)) return 'food';
  if (/bonus|match|deposit|cashback|cash back|reward|rebate/.test(t)) return 'bonus';
  return 'bonus';
}

// ── Extract dates from text ───────────────────────────────────────────────────
function extractDate(text) {
  // Try patterns like: "March 1", "3/15/2025", "March 1 - March 31", "through April 30", "expires April 15"
  const patterns = [
    /(?:through|until|expires?|valid through|ends?|thru)\s+([A-Za-z]+\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:through|until|expires?|valid through|ends?|thru)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
    /\b([A-Za-z]+\.?\s+\d{1,2},?\s*\d{4})\b/,
    /\b([A-Za-z]+\.?\s+\d{1,2})\b/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const raw = m[1].trim();
      const parsed = new Date(raw);
      if (!isNaN(parsed)) {
        // If no year in string, assign current or next year
        if (!raw.match(/\d{4}/)) {
          const now = new Date();
          if (parsed.getMonth() < now.getMonth()) parsed.setFullYear(now.getFullYear() + 1);
          else parsed.setFullYear(now.getFullYear());
        }
        return parsed.toISOString().split('T')[0];
      }
    }
  }
  return null;
}

// ── Strip HTML tags ────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Parse promotions from HTML ────────────────────────────────────────────────
function parsePromotions(html, pageUrl) {
  const promotions = [];

  // Find promo card blocks — look for repeating article/section/div patterns
  // Strategy: extract h2/h3/h4 headings that look like promo titles, then grab nearby context

  // Remove nav/footer/header noise
  const bodyHtml = html
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '');

  // Extract heading + nearby paragraph as promo candidates
  const headingRe = /<(?:h[2-4]|strong)[^>]*>([\s\S]{3,200}?)<\/(?:h[2-4]|strong)>/gi;
  let m;
  const seenTitles = new Set();

  while ((m = headingRe.exec(bodyHtml)) !== null) {
    const rawTitle = stripHtml(m[1]).trim();
    if (!rawTitle || rawTitle.length < 4 || rawTitle.length > 150) continue;

    // Skip navigation / generic headings
    if (/^(menu|search|home|about|contact|follow|sign in|log in|register|newsletter|subscribe|promotions|deals|offers|events|close|click|skip|more|view all|see all|learn more|get started|play now|join now|rewards|loyalty|dining|casino|hotel|entertainment|sports|gaming|poker)$/i.test(rawTitle)) continue;

    if (seenTitles.has(rawTitle.toLowerCase())) continue;
    seenTitles.add(rawTitle.toLowerCase());

    // Grab context around this heading (500 chars after)
    const ctxStart = m.index;
    const ctxEnd = Math.min(ctxStart + 700, bodyHtml.length);
    const context = stripHtml(bodyHtml.slice(ctxStart, ctxEnd));

    const endDate = extractDate(context);
    const promoType = classifyPromoType(rawTitle + ' ' + context);

    // Description: first meaningful sentence or paragraph snippet after the title
    const descMatch = context.replace(rawTitle, '').match(/([A-Z][^.!?]{15,200}[.!?])/);
    const description = descMatch ? descMatch[1].trim().substring(0, 300) : context.substring(0, 200).trim();

    // Skip if description is just navigation noise
    if (/sign in|log in|register|subscribe|follow us/i.test(rawTitle)) continue;

    promotions.push({
      title: rawTitle,
      description: description || null,
      promo_type: promoType,
      end_date: endDate,
      url: pageUrl,
    });

    if (promotions.length >= 20) break; // cap per casino
  }

  return promotions;
}

// ── Look up casino_id by name ─────────────────────────────────────────────────
async function findCasinoId(casinoName) {
  // Try exact match first
  let res = await pool.query('SELECT id FROM casinos WHERE name = $1 LIMIT 1', [casinoName]);
  if (res.rows.length) return res.rows[0].id;

  // Try ILIKE partial match
  const words = casinoName.split(/\s+/).slice(0, 3).join('%');
  res = await pool.query('SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 3', [`%${words}%`]);
  if (res.rows.length) {
    console.log(`  → Matched "${casinoName}" to "${res.rows[0].name}" (id=${res.rows[0].id})`);
    return res.rows[0].id;
  }

  // Try first two significant words
  const firstTwo = casinoName.split(/\s+/).filter(w => w.length > 2).slice(0, 2).join(' ');
  res = await pool.query('SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 1', [`%${firstTwo}%`]);
  if (res.rows.length) {
    console.log(`  → Matched "${casinoName}" to "${res.rows[0].name}" (id=${res.rows[0].id}) via "${firstTwo}"`);
    return res.rows[0].id;
  }

  return null;
}

// ── Insert promotions into DB ─────────────────────────────────────────────────
async function insertPromotions(casinoId, promotions) {
  let inserted = 0;
  for (const p of promotions) {
    try {
      const res = await pool.query(`
        INSERT INTO casino_promotions (casino_id, title, description, promo_type, end_date, url, source, active)
        VALUES ($1, $2, $3, $4, $5, $6, 'website', true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [casinoId, p.title, p.description, p.promo_type, p.end_date, p.url]);
      if (res.rows.length) inserted++;
    } catch (err) {
      console.error('  Insert error:', err.message);
    }
  }
  return inserted;
}

// ── Mark stale promotions inactive ────────────────────────────────────────────
async function deactivateStale() {
  const res = await pool.query(`
    UPDATE casino_promotions
    SET active = false
    WHERE active = true
      AND created_at < NOW() - INTERVAL '30 days'
      AND (end_date IS NULL OR end_date < CURRENT_DATE)
    RETURNING id
  `);
  return res.rowCount;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎰 Casino Promotions Scraper');
  console.log('='.repeat(50));

  const summary = [];

  for (const page of PROMO_PAGES) {
    console.log(`\n📡 ${page.casinoName}`);
    console.log(`   URL: ${page.url}`);

    let fetched, promotions = [];

    try {
      fetched = await fetchUrl(page.url);
      console.log(`   HTTP ${fetched.statusCode} (${fetched.body.length} bytes)`);
    } catch (err) {
      console.log(`   ❌ Fetch error: ${err.message}`);
      summary.push({ casino: page.casinoName, fetched: false, found: 0, inserted: 0 });
      continue;
    }

    if (fetched.statusCode !== 200) {
      console.log(`   ⚠️  Non-200 status`);
      summary.push({ casino: page.casinoName, fetched: false, found: 0, inserted: 0 });
      continue;
    }

    promotions = parsePromotions(fetched.body, page.url);
    console.log(`   Found ${promotions.length} promotion candidates`);

    if (promotions.length === 0) {
      summary.push({ casino: page.casinoName, fetched: true, found: 0, inserted: 0 });
      continue;
    }

    // Look up casino_id
    const casinoId = await findCasinoId(page.casinoName);
    if (!casinoId) {
      console.log(`   ⚠️  Casino not found in DB — skipping insert`);
      summary.push({ casino: page.casinoName, fetched: true, found: promotions.length, inserted: 0, noDb: true });
      continue;
    }

    const inserted = await insertPromotions(casinoId, promotions);
    console.log(`   ✅ Inserted ${inserted} new promotions (casino_id=${casinoId})`);

    // Print titles
    promotions.slice(0, 5).forEach(p => {
      console.log(`      • [${p.promo_type}] ${p.title.substring(0, 70)}${p.end_date ? ` (ends ${p.end_date})` : ''}`);
    });

    summary.push({ casino: page.casinoName, fetched: true, found: promotions.length, inserted });
  }

  // Deactivate stale
  const staleCount = await deactivateStale();
  if (staleCount) console.log(`\n🗑️  Deactivated ${staleCount} stale promotions`);

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  for (const s of summary) {
    const status = !s.fetched ? '❌' : s.noDb ? '⚠️ ' : '✅';
    console.log(`${status} ${s.casino.padEnd(40)} found: ${s.found} | inserted: ${s.inserted}`);
  }

  const totalFound = summary.reduce((a, s) => a + s.found, 0);
  const totalInserted = summary.reduce((a, s) => a + s.inserted, 0);
  console.log(`\nTotal: ${totalFound} promotions found, ${totalInserted} inserted`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
