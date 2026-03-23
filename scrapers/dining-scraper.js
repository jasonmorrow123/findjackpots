/**
 * Casino Website Dining Scraper — FindJackpots
 * Scrapes restaurant names directly from casino websites (more accurate than Yelp).
 *
 * Usage: node scrapers/dining-scraper.js
 */

require('dotenv').config({ path: __dirname + '/.env' });

const https = require('https');
const http = require('http');
const { Pool } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ─── DB POOLS ─────────────────────────────────────────────────────────────────

const localPool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: false,
});

const prodPool = new Pool({
  host: process.env.PROD_DB_HOST || 'app-4de65bbd-1f1c-4198-bb13-4d77de20bbfd-do-user-34822266-0.g.db.ondigitalocean.com',
  port: parseInt(process.env.PROD_DB_PORT || '25060'),
  database: process.env.PROD_DB_NAME || 'findjackpots-db',
  user: process.env.PROD_DB_USER || 'findjackpots-db',
  password: process.env.PROD_DB_PASS,
  ssl: { rejectUnauthorized: false },
});

// ─── CASINO DINING PAGES ──────────────────────────────────────────────────────

const CASINO_DINING_PAGES = [
  // Las Vegas
  { casinoName: 'Bellagio', url: 'https://bellagio.mgmresorts.com/en/restaurants.html' },
  { casinoName: 'MGM Grand', url: 'https://mgmgrand.mgmresorts.com/en/restaurants.html' },
  { casinoName: 'Aria Resort & Casino', url: 'https://aria.mgmresorts.com/en/restaurants.html' },
  { casinoName: 'Wynn Las Vegas', url: 'https://www.wynnlasvegas.com/dining' },
  { casinoName: 'Caesars Palace', url: 'https://www.caesars.com/caesars-palace/restaurants' },
  { casinoName: 'The Venetian', url: 'https://www.venetianlasvegas.com/restaurants.html' },
  { casinoName: 'Mandalay Bay', url: 'https://mandalaybay.mgmresorts.com/en/restaurants.html' },
  { casinoName: 'Paris Las Vegas', url: 'https://www.caesars.com/paris-las-vegas/restaurants' },
  { casinoName: 'Horseshoe Las Vegas', url: 'https://www.caesars.com/horseshoe-las-vegas/restaurants' },
  { casinoName: 'El Cortez Hotel & Casino', url: 'https://elcortezhotelcasino.com/dining/' },
  { casinoName: 'Golden Nugget Las Vegas', url: 'https://www.goldennugget.com/las-vegas/restaurants/' },
  // Midwest
  { casinoName: 'Mystic Lake Casino Hotel', url: 'https://www.mysticlake.com/food-and-drink' },
  { casinoName: 'Grand Casino Hinckley', url: 'https://www.grandcasinos.com/hinckley/dining' },
  { casinoName: 'Black Bear Casino Resort', url: 'https://www.blackbearcasinoresort.com/dining' },
  { casinoName: 'Treasure Island Resort & Casino', url: 'https://www.ticasino.com/dining' },
  { casinoName: 'Potawatomi Casino', url: 'https://www.paysbig.com/dining' },
  { casinoName: 'Rivers Casino', url: 'https://www.riverscasino.com/pittsburgh/restaurants/' },
  { casinoName: 'Hollywood Casino Aurora', url: 'https://www.hollywoodcasinoaurora.com/dining' },
  { casinoName: 'Soaring Eagle Casino', url: 'https://www.soaringeaglecasino.com/dining' },
  { casinoName: 'FireKeepers Casino', url: 'https://www.firekeeperscasino.com/dining' },
  { casinoName: 'Gun Lake Casino', url: 'https://www.gunlakecasino.com/dining' },
  { casinoName: 'Four Winds Casino', url: 'https://www.fourwindscasino.com/dining' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a URL with a timeout, following redirects. Returns HTML string or null.
 */
function fetchPage(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
      },
      (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.origin}${res.headers.location}`;
          resolve(fetchPage(redirectUrl, maxRedirects - 1));
          return;
        }

        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', () => resolve(null));
      }
    );

    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/**
 * Extract restaurant names from raw HTML.
 * Tries multiple strategies and deduplicates results.
 */
function extractRestaurantNames(html) {
  const names = new Set();

  // Strategy 1: Elements with dining-related class names
  const classPatterns = [
    /class="[^"]*(?:restaurant|dining|venue|outlet|eatery|food)[^"]*"[^>]*>\s*([^<]{3,60})/gi,
    /class="[^"]*(?:name|title)[^"]*"[^>]*>\s*([^<]{3,60})/gi,
  ];

  // Strategy 2: Heading tags (h2, h3, h4) — restaurants commonly listed under headings
  const headingRegex = /<h[234][^>]*>\s*([^<]{3,80})\s*<\/h[234]>/gi;

  // Strategy 3: JSON-LD structured data
  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;

  // Strategy 4: aria-label or title attributes on links
  const ariaRegex = /(?:aria-label|title)="([^"]{3,60})"/gi;

  // Run heading extraction
  let m;
  const headingRe = /<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi;
  while ((m = headingRe.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (isLikelyRestaurantName(text)) names.add(text);
  }

  // Extract from JSON-LD
  const jsonLdRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Restaurant' && item.name) names.add(item.name.trim());
        if (item.hasMenuItem || item.servesCuisine) {
          if (item.name) names.add(item.name.trim());
        }
        // itemList
        if (item.itemListElement) {
          for (const el of item.itemListElement) {
            if (el.name) names.add(el.name.trim());
            if (el.item && el.item.name) names.add(el.item.name.trim());
          }
        }
      }
    } catch (_) {}
  }

  // Class-based extraction for common patterns
  const classRe = /class="[^"]*(?:restaurant-name|dining-name|venue-name|outlet-name|restaurant__name|venue__name|dining__name|card-title|card__title)[^"]*"[^>]*>\s*([\s\S]*?)<\//gi;
  while ((m = classRe.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (isLikelyRestaurantName(text)) names.add(text);
  }

  // Meta og:title can hint at page structure — skip, too noisy

  // Look for data attributes
  const dataNameRe = /data-(?:restaurant|venue|dining|outlet)-name="([^"]{3,80})"/gi;
  while ((m = dataNameRe.exec(html)) !== null) {
    const text = m[1].trim();
    if (isLikelyRestaurantName(text)) names.add(text);
  }

  // Decode HTML entities before returning
  return [...names].map(decodeEntities).filter(isLikelyRestaurantName).slice(0, 50);
}

/** Strip HTML tags from a string */
function stripTags(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Decode common HTML entities */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/&#x[0-9a-fA-F]+;/g, '')
    .replace(/&[a-z]+;/g, '')
    .trim();
}

// Words that suggest navigation/UI elements, not restaurant names
const NOISE_WORDS = new Set([
  'menu', 'view', 'learn more', 'click here', 'read more', 'see all', 'back to top',
  'home', 'casino', 'hotel', 'resort', 'contact', 'about', 'shop', 'play', 'stay',
  'dining', 'restaurants', 'food', 'drink', 'entertainment', 'events', 'offers',
  'promotions', 'rewards', 'sign in', 'login', 'register', 'search', 'book now',
  'reservations', 'reserve', 'skip to', 'navigation', 'cookie', 'privacy', 'terms',
  'copyright', 'all rights', 'follow us', 'social media', 'subscribe', 'newsletter',
  'loading', 'please wait', 'javascript', 'enabled', 'browser', 'update',
  'hours', 'location', 'directions', 'map', 'parking', 'accessibility',
  'bars', 'nightlife', 'pools', 'spa', 'golf', 'shows', 'concerts',
  'gift', 'shop', 'retail', 'wedding', 'meetings', 'groups',
  'please stand by', 'post navigation', 'reserve a table',
  'group dining', 'in-room dining', 'fine dining', 'casual dining',
  'about us', 'get connected', 'gift cards', 'guest relations', 'community',
  'unlock the best dining during your stay', 'great dining options',
  'flavors worth savoring', 'food to dine for', 'feast on the flavors of paris',
  'like a caesar', 'dine with us at wynn & encore',
  'restaurant frequently asked questions',
  'is there a dress code for the restaurants?',
  'are children welcome in all of the restaurants?',
  'can you accommodate large parties or group dining?',
  'caesars rewards perks', 'caesars rewards visa® credit cards', 'caesars rewards air®',
  'restaurant menus', 'sportsbook dining', 'bars & lounges', 'bars &amp; lounges',
  'brunch', 'late night', 'celebration cakes', 'espresso', 'open 24 hours',
  "we're proud to call wisconsin home.", 'treasure island resort & casino',
  'potawatomi sportsbook', 'parlay: live music & sports',
]);

// Patterns that indicate non-restaurant content
const NOISE_PATTERNS = [
  /^\d+$/, // pure numbers
  /^[\s\W]+$/, // whitespace/punctuation only
  /^.{1,2}$/, // too short (< 3 chars, already filtered above but belt+suspenders)
  /^.{61,}$/, // too long (> 60 chars)
  /https?:\/\//i, // URLs
  /^\d{1,2}[:\-\/]\d{2}/, // time/date patterns
  /copyright|©|\bLLC\b|\bInc\b|\bCorp\b/i,
  /^\s*[\[\(]/, // starts with bracket
  /follow\s+us|sign\s+up|log\s+in|book\s+now|view\s+all/i,
  /\bCDN\b|\bAPI\b|\bJSON\b/i,
  /\$\d+|\d+%/, // prices/percentages
  /^(Las Vegas|Nevada|Illinois|Michigan|Minnesota|Wisconsin|Pennsylvania|Chicago|Aurora)$/i, // city/state names
  /sunday|monday|tuesday|wednesday|thursday|friday|saturday/i, // day names = hours text
  /\bam\b|\bpm\b/i, // hours
  /^\s*nbsp\s*$/, // HTML entity noise
  /we['']re proud/i, // marketing fluff
  /please stand by/i,
  /post navigation/i,
  /^date$/i, // "Date" from Wynn filter category, not a restaurant
  /^&nbsp;$/, // raw HTML entity
  /we.re proud/i, // marketing fluff
  /^\s*$/, // whitespace only after entity decode
];

function isLikelyRestaurantName(text) {
  if (!text || text.length < 3 || text.length > 80) return false;

  const lower = text.toLowerCase().trim();

  // Reject pure noise words
  if (NOISE_WORDS.has(lower)) return false;

  // Reject noise patterns
  if (NOISE_PATTERNS.some((p) => p.test(text))) return false;

  // Must have at least one letter
  if (!/[a-zA-Z]/.test(text)) return false;

  // Reject if it looks like a full sentence (too many spaces = likely a description)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 8) return false;

  return true;
}

// ─── DB OPERATIONS ────────────────────────────────────────────────────────────

async function ensureSourceColumn(pool, label) {
  try {
    await pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'yelp'`);
    await pool.query(`UPDATE restaurants SET source = 'yelp' WHERE source IS NULL`);
    console.log(`[${label}] ✓ source column ready`);
  } catch (err) {
    console.error(`[${label}] Error ensuring source column:`, err.message);
  }
}

async function findCasino(pool, name) {
  // Try exact match first
  let result = await pool.query(
    `SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 1`,
    [name]
  );
  if (result.rows.length) return result.rows[0];

  // Try partial match — strip common words
  const stripped = name.replace(/\b(casino|hotel|resort|the|and|&)\b/gi, '').trim();
  result = await pool.query(
    `SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 1`,
    [`%${stripped}%`]
  );
  if (result.rows.length) return result.rows[0];

  // Try each significant word
  const words = stripped.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    result = await pool.query(
      `SELECT id, name FROM casinos WHERE name ILIKE $1 LIMIT 1`,
      [`%${word}%`]
    );
    if (result.rows.length) return result.rows[0];
  }

  return null;
}

async function upsertRestaurant(pool, { casinoId, name, pageUrl }) {
  // Check if exists
  const existing = await pool.query(
    `SELECT id FROM restaurants WHERE casino_id = $1 AND name ILIKE $2`,
    [casinoId, name]
  );
  if (existing.rows.length) return { inserted: false, id: existing.rows[0].id };

  const result = await pool.query(
    `INSERT INTO restaurants (casino_id, name, yelp_url, source)
     VALUES ($1, $2, $3, 'website')
     ON CONFLICT (casino_id, name) DO NOTHING
     RETURNING id`,
    [casinoId, name, pageUrl]
  );

  if (result.rows.length) return { inserted: true, id: result.rows[0].id };
  return { inserted: false };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function processCasino(pool, poolLabel, entry) {
  const { casinoName, url } = entry;

  console.log(`\n[${poolLabel}] 🎰 ${casinoName}`);
  console.log(`  → Fetching: ${url}`);

  // Find casino in DB
  const casino = await findCasino(pool, casinoName);
  if (!casino) {
    console.log(`  ⚠️  Casino not found in DB: "${casinoName}" — skipping`);
    return { found: 0, inserted: 0 };
  }
  console.log(`  ✓ Matched DB casino: "${casino.name}" (id=${casino.id})`);

  // Fetch the page
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.log(`  ❌ Fetch error: ${err.message}`);
    return { found: 0, inserted: 0 };
  }

  if (!html) {
    console.log(`  ❌ No content returned (blocked or JS-rendered)`);
    return { found: 0, inserted: 0 };
  }

  if (html.length < 500) {
    console.log(`  ⚠️  Very short response (${html.length} chars) — likely blocked`);
    return { found: 0, inserted: 0 };
  }

  // Extract restaurant names
  const names = extractRestaurantNames(html);

  if (names.length === 0) {
    console.log(`  ⚠️  No restaurant names found (likely JS-rendered SPA)`);
    return { found: 0, inserted: 0 };
  }

  console.log(`  📋 Found ${names.length} potential restaurant names: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''}`);

  // Insert new restaurants
  let insertedCount = 0;
  for (const name of names) {
    try {
      const { inserted } = await upsertRestaurant(pool, { casinoId: casino.id, name, pageUrl: url });
      if (inserted) {
        console.log(`  ✅ Inserted: "${name}"`);
        insertedCount++;
      }
    } catch (err) {
      console.log(`  ⚠️  DB error for "${name}": ${err.message}`);
    }
  }

  console.log(`  → ${insertedCount} new restaurants inserted (${names.length - insertedCount} already existed)`);
  return { found: names.length, inserted: insertedCount };
}

async function runForPool(pool, label) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Running against: ${label}`);
  console.log('═'.repeat(60));

  await ensureSourceColumn(pool, label);

  const totals = { found: 0, inserted: 0, casinos: 0 };
  const summary = [];

  for (const entry of CASINO_DINING_PAGES) {
    const result = await processCasino(pool, label, entry);
    totals.found += result.found;
    totals.inserted += result.inserted;
    if (result.found > 0) totals.casinos++;
    summary.push({ casino: entry.casinoName, ...result });

    // Polite delay between requests
    await sleep(1500 + Math.random() * 500);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${label}] SUMMARY`);
  console.log('─'.repeat(60));
  for (const row of summary) {
    const status = row.found === 0 ? '⚠️  blocked/no content' : `${row.inserted} inserted / ${row.found} found`;
    console.log(`  ${row.casino.padEnd(35)} ${status}`);
  }
  console.log('─'.repeat(60));
  console.log(`  Total: ${totals.inserted} restaurants inserted across ${totals.casinos} casinos`);

  return totals;
}

async function main() {
  console.log('🍽️  Casino Website Dining Scraper — FindJackpots');
  console.log(`   ${new Date().toISOString()}\n`);

  // Run local first
  let localTotals = { found: 0, inserted: 0 };
  try {
    localTotals = await runForPool(localPool, 'LOCAL');
  } catch (err) {
    console.error('Local DB error:', err.message);
  } finally {
    await localPool.end().catch(() => {});
  }

  // Run production
  let prodTotals = { found: 0, inserted: 0 };
  try {
    prodTotals = await runForPool(prodPool, 'PRODUCTION');
  } catch (err) {
    console.error('Production DB error:', err.message);
  } finally {
    await prodPool.end().catch(() => {});
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('FINAL TOTALS');
  console.log('═'.repeat(60));
  console.log(`  LOCAL:      ${localTotals.inserted} inserted / ${localTotals.found} found`);
  console.log(`  PRODUCTION: ${prodTotals.inserted} inserted / ${prodTotals.found} found`);
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
