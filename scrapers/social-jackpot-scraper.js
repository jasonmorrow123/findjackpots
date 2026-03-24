/**
 * FindJackpots Social Jackpot Scraper
 *
 * Twitter API free tier has no search credits, so this scraper uses:
 *   1. Google News RSS — targeted queries for casino jackpot winners
 *   2. Casino press release / newsroom pages (HTML scraping)
 *
 * It's broader than news-monitor.js (national + regional casinos)
 * and uses more aggressive queries for recent winner posts.
 *
 * Run: node social-jackpot-scraper.js
 * Source tag: 'news' (same table, different source_post_id prefix)
 *
 * NOTE: Twitter API free tier returns {"title":"CreditsDepleted"} on
 * /tweets/search/recent. Upgrade to Basic ($100/mo) to enable
 * twitter-monitor.js filtered-stream approach.
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UA = 'FindJackpots/1.0 (research; contact: data@findjackpots.com)';

// ─────────────────────────────────────────────
// Google News RSS feeds — casino jackpot queries
// ─────────────────────────────────────────────
const RSS_FEEDS = [
  // General jackpot winners (national scope)
  'https://news.google.com/rss/search?q=casino+jackpot+winner+2026&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=slot+machine+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22jackpot+winner%22+casino+million&hl=en-US&gl=US&ceid=US:en',
  // Megabucks / progressive
  'https://news.google.com/rss/search?q=megabucks+winner+casino&hl=en-US&gl=US&ceid=US:en',
  // Regional casinos that tweet but whose API we can't hit
  'https://news.google.com/rss/search?q=mystic+lake+casino+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=black+bear+casino+jackpot&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=soaring+eagle+casino+jackpot&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=four+winds+casino+jackpot&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=potawatomi+casino+jackpot&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=borgata+casino+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=ocean+resort+casino+jackpot&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=hard+rock+casino+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=station+casinos+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=golden+nugget+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
];

// ─────────────────────────────────────────────
// Casino newsroom / press release pages
// These publish jackpot announcements but rarely show up in Google News
// ─────────────────────────────────────────────
const NEWSROOM_PAGES = [
  {
    name: 'Mystic Lake Casino',
    url: 'https://www.mysticlake.com/blog/',
    casinoKeyword: 'mystic lake',
  },
  {
    name: 'Soaring Eagle Casino',
    url: 'https://www.soaringeaglecasino.com/promotions/',
    casinoKeyword: 'soaring eagle',
  },
  {
    name: 'Four Winds Casino',
    url: 'https://www.fourwindscasino.com/promotions/',
    casinoKeyword: 'four winds',
  },
];

// ─────────────────────────────────────────────
// Twitter accounts we WANT to monitor (blocked by API tier).
// Listed here for reference; manual URLs below as backup.
// ─────────────────────────────────────────────
// const CASINO_TWITTER_ACCOUNTS = [
//   'mysticlake', 'hardrocklv', 'grandcasinos', 'blackbearcasino',
//   'stationcasinos', 'goldennuggetlv', 'southpointcasino',
//   'soaringeagle', 'fourwindscasino', 'potawatomihotel',
//   'borgata', 'hardrockhrc', 'oceanresortcasino',
// ];
//
// Twitter API free tier = no search credits. Upgrade to Basic ($100/mo)
// and use twitter-monitor.js (filtered stream) to enable real-time monitoring.

// ─────────────────────────────────────────────
// Regex helpers
// ─────────────────────────────────────────────

/** Extract dollar amounts like $1,234,567 or $1.2 million */
function extractAmount(text) {
  // Match $1.2 million / $500,000 / $1,000,000.00
  const patterns = [
    /\$([\d,]+(?:\.\d+)?)\s*million/i,
    /\$([\d,]+(?:\.\d{2})?)/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      if (/million/i.test(text.slice(text.indexOf(m[0]), text.indexOf(m[0]) + m[0].length + 10))) {
        val *= 1_000_000;
      }
      return val;
    }
  }
  return null;
}

/** Match a casino name from article text */
function extractCasinoName(text) {
  const casinos = [
    // Midwest / regional
    'Mystic Lake', 'Black Bear Casino', 'Soaring Eagle', 'Four Winds',
    'Potawatomi', 'Grand Casino', 'Treasure Island', 'Ho-Chunk',
    'Prairie Meadows', 'Isle Casino', 'Ameristar', 'Harrah',
    'Horseshoe', 'Hard Rock', 'Rivers Casino',
    // Atlantic City
    'Borgata', 'Ocean Resort', 'Bally', "Resorts Casino", 'Hard Rock Atlantic City',
    'Golden Nugget Atlantic City', 'Tropicana',
    // Nevada / LV
    'Bellagio', 'MGM Grand', 'Caesars Palace', 'Wynn', 'Encore',
    'Venetian', 'Aria', 'Cosmopolitan', 'Mandalay Bay', 'Luxor',
    'Excalibur', 'Park MGM', 'Mirage', 'Flamingo', 'Paris Las Vegas',
    'Linq', 'Planet Hollywood', 'Palace Station', 'Green Valley Ranch',
    'Red Rock', 'Santa Fe Station', 'Sunset Station', 'South Point',
    'Golden Nugget', 'El Cortez', 'Circa', 'Fremont',
    'Station Casino', 'Boyd Gaming',
    // Other
    'WinStar', 'Choctaw', 'Foxwoods', 'Mohegan Sun',
  ];
  for (const name of casinos) {
    if (new RegExp(name, 'i').test(text)) return name;
  }
  return null;
}

/** Match a slot machine name */
function extractMachineName(text) {
  const machines = [
    'Megabucks', 'Wheel of Fortune', 'Buffalo Gold', 'Buffalo Grand',
    'Buffalo Stampede', 'Lightning Link', 'Dragon Link', 'Dancing Drums',
    'Fu Dai Lian Lian', 'Wolf Run', 'Quick Hit', 'Lock It Link',
    'Dollar Storm', 'Lightning Cash', 'Zeus', 'Kronos',
    'Blazing 7', 'Triple Diamond', 'Double Diamond', 'Cleopatra',
    'Da Ji Da Li', 'Dragon Cash', 'Timberwolf', 'Timber Wolf',
    'Cash Express', 'Huff N Puff', 'Huff N More Puff',
  ];
  for (const m of machines) {
    if (new RegExp(m, 'i').test(text)) return m;
  }
  return null;
}

// ─────────────────────────────────────────────
// RSS Parsing
// ─────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ||
      block.match(/<title>(.*?)<\/title>/s)?.[1]
        ?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'") || '';
    const link =
      block.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s)?.[1] ||
      block.match(/<link>(.*?)<\/link>/s)?.[1] || '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const description =
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1] ||
      block.match(/<description>(.*?)<\/description>/s)?.[1] || '';
    const descClean = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    items.push({ title: title.trim(), link: link.trim(), pubDate, description: descClean });
  }
  return items;
}

// ─────────────────────────────────────────────
// Jackpot extraction from an RSS item
// ─────────────────────────────────────────────
function extractJackpotFromItem(item, casinoHint = null) {
  const text = `${item.title} ${item.description}`;

  // Must mention jackpot/win keywords
  if (!/jackpot|winner|wins|won|hit|lucky|payout|big win/i.test(text)) return null;

  const amount = extractAmount(text);
  // Require $10k–$50M
  if (!amount || amount < 10_000 || amount > 50_000_000) return null;

  const casinoName = casinoHint || extractCasinoName(text);
  const machineName = extractMachineName(text);

  // Stable dedup key: base64 of URL (truncated)
  const postId = 'social-' + Buffer.from(item.link || item.title).toString('base64').slice(0, 48);

  return {
    casinoName,
    machineName,
    amountDollars: amount,
    sourceUrl: item.link,
    postId,
    rawText: text.slice(0, 500),
    postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    trustScore: casinoName && machineName ? 7 : casinoName ? 6 : 4,
  };
}

// ─────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────
async function findCasinoId(casinoName) {
  if (!casinoName) return null;
  const tokens = casinoName.split(/\s+/);
  for (const token of tokens) {
    if (token.length < 3) continue;
    const r = await pool.query(
      'SELECT id FROM casinos WHERE name ILIKE $1 LIMIT 1',
      [`%${token}%`]
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  return null;
}

async function storeJackpot(jackpot) {
  const casinoId = await findCasinoId(jackpot.casinoName);
  const result = await pool.query(
    `INSERT INTO jackpots
       (casino_id, machine_name, machine_type, amount_cents, won_at, source, source_url,
        source_post_id, trust_score, raw_text, verified)
     VALUES ($1, $2, 'slot', $3, $4, 'news', $5, $6, $7, $8, false)
     ON CONFLICT (source, source_post_id) DO NOTHING
     RETURNING id`,
    [
      casinoId,
      jackpot.machineName,
      Math.round(jackpot.amountDollars * 100),
      jackpot.postedAt,
      jackpot.sourceUrl,
      jackpot.postId,
      jackpot.trustScore,
      jackpot.rawText,
    ]
  );
  return result.rowCount > 0;
}

// ─────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────
async function run() {
  console.log('🎰 FindJackpots Social/RSS Jackpot Scraper\n');
  console.log('ℹ️  Twitter API free tier has no search credits.');
  console.log('   Falling back to Google News RSS + casino newsroom pages.\n');
  console.log('   To enable real-time Twitter monitoring, upgrade to Twitter');
  console.log('   API Basic ($100/mo) and run twitter-monitor.js instead.\n');

  let totalStored = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;

  // ── Google News RSS ──────────────────────────
  console.log('=== Google News RSS Feeds ===\n');

  for (const feedUrl of RSS_FEEDS) {
    const queryPart = decodeURIComponent(feedUrl).match(/q=([^&]+)/)?.[1] || feedUrl;
    console.log(`Fetching: "${queryPart}"`);
    try {
      const resp = await axios.get(feedUrl, {
        headers: { 'User-Agent': UA },
        timeout: 15000,
      });
      const items = parseRSS(resp.data);
      console.log(`  ${items.length} articles found`);

      let feedStored = 0;
      for (const item of items) {
        const jackpot = extractJackpotFromItem(item);
        if (!jackpot) continue;
        totalProcessed++;

        try {
          const stored = await storeJackpot(jackpot);
          if (stored) {
            totalStored++;
            feedStored++;
            const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(jackpot.amountDollars);
            console.log(`  💰 ${amt} at ${jackpot.casinoName || 'unknown'} — ${item.title.slice(0, 65)}`);
          } else {
            totalSkipped++;
          }
        } catch (dbErr) {
          console.error(`  DB error: ${dbErr.message}`);
        }
      }
      if (feedStored === 0) console.log('  (no new jackpots)');
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
    }
  }

  // ── Casino newsroom pages ──────────────────
  console.log('\n=== Casino Newsroom Pages ===\n');

  for (const page of NEWSROOM_PAGES) {
    console.log(`Scraping: ${page.name} — ${page.url}`);
    try {
      const resp = await axios.get(page.url, {
        headers: { 'User-Agent': UA },
        timeout: 15000,
      });
      const html = resp.data;

      // Extract text blobs that mention jackpot/winner
      const blocks = [];
      for (const m of html.matchAll(/<(?:p|h[1-6]|li|div)[^>]*>([\s\S]{20,400}?)<\/(?:p|h[1-6]|li|div)>/g)) {
        const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (/jackpot|winner|wins|won|big win/i.test(text)) blocks.push(text);
      }

      console.log(`  ${blocks.length} jackpot-related blocks found`);
      let pageStored = 0;

      for (const block of blocks) {
        const amount = extractAmount(block);
        if (!amount || amount < 10_000 || amount > 50_000_000) continue;
        totalProcessed++;

        const item = {
          title: block.slice(0, 120),
          link: page.url,
          pubDate: '',
          description: block,
        };
        const jackpot = extractJackpotFromItem(item, page.name);
        if (!jackpot) continue;

        // Unique ID per casino page + block hash
        jackpot.postId = 'newsroom-' + Buffer.from(page.url + block.slice(0, 60)).toString('base64').slice(0, 48);

        try {
          const stored = await storeJackpot(jackpot);
          if (stored) {
            totalStored++;
            pageStored++;
            const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(jackpot.amountDollars);
            console.log(`  💰 ${amt} — ${block.slice(0, 80)}`);
          } else {
            totalSkipped++;
          }
        } catch (dbErr) {
          console.error(`  DB error: ${dbErr.message}`);
        }
      }
      if (pageStored === 0) console.log('  (no new jackpots)');
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
    }
  }

  // ── Summary ──────────────────────────────────
  console.log(`\n✅ Done`);
  console.log(`   ${totalStored} new jackpots stored`);
  console.log(`   ${totalSkipped} already in DB`);
  console.log(`   ${totalProcessed} total candidates processed`);

  // Log pipeline run
  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('social-jackpot-scraper', 'success', $1, NOW())`,
    [totalStored]
  ).catch(() => {});

  await pool.end();
}

run().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
