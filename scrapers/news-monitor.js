/**
 * JackpotMap News Monitor
 * Scrapes Google News RSS for Las Vegas jackpot announcements.
 * No API key needed — public RSS feed.
 *
 * Run: node news-monitor.js
 * Schedule: every 4 hours via run-all.js
 *
 * Note: Google News RSS returns plain <title> tags (not CDATA).
 * Dollar amounts in RSS come from article titles/descriptions.
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UA = 'JackpotMap/1.0 (research; contact: data@jackpotmap.com)';

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=las+vegas+jackpot+winner&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=casino+jackpot+%22las+vegas%22+million&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=megabucks+winner+nevada&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=slot+machine+jackpot+%22Las+Vegas%22&hl=en-US&gl=US&ceid=US:en',
];

/**
 * Parse RSS XML. Google News uses plain <title> tags (no CDATA wrapper).
 * Handles both formats just in case.
 */
function parseRSS(xml) {
  const items = [];
  // Match each <item>...</item> block
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];

    // Title: try CDATA first, then plain text
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ||
      block.match(/<title>(.*?)<\/title>/s)?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'") ||
      '';

    // Link: Google News wraps in CDATA or plain
    const link =
      block.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s)?.[1] ||
      block.match(/<link>(.*?)<\/link>/s)?.[1] ||
      '';

    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

    // Description: try CDATA first, then plain
    const description =
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1] ||
      block.match(/<description>(.*?)<\/description>/s)?.[1] ||
      '';

    // Strip HTML tags from description
    const descClean = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    items.push({ title: title.trim(), link: link.trim(), pubDate, description: descClean });
  }
  return items;
}

/**
 * Extract jackpot info from a news article title/description.
 * Returns null if the article doesn't describe a specific jackpot win.
 */
function extractJackpotFromNews(item) {
  const text = `${item.title} ${item.description}`;

  // Must have a dollar amount
  const amountMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(million|M\b)?/i);
  if (!amountMatch) return null;

  let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  // Check if "million" follows the number
  const afterAmt = text.slice(text.indexOf(amountMatch[0]) + amountMatch[0].length, text.indexOf(amountMatch[0]) + amountMatch[0].length + 15);
  if (amountMatch[2] || /million/i.test(afterAmt)) {
    amount *= 1_000_000;
  }

  // Filter: jackpots between $10k and $50M
  if (amount < 10_000 || amount > 50_000_000) return null;

  // Must mention jackpot/winner keywords
  if (!/jackpot|winner|wins|won|hit|lucky|payout/i.test(text)) return null;

  // Extract casino name from well-known patterns
  const casinoPattern = /\b(Bellagio|MGM Grand|Caesars Palace|Wynn|Encore|Venetian|Palazzo|Aria|Cosmopolitan|Mandalay Bay|Luxor|Excalibur|New York.New York|Park MGM|Mirage|Hard Rock|Flamingo|Harrah(?:s|ah's)?|Paris Las Vegas|Linq|Horseshoe|Bally(?:'s)?|Cromwell|Planet Hollywood|Palace Station|Green Valley Ranch|Red Rock|Santa Fe Station|Sunset Station|Boulder Station|South Point|Golden Nugget|Binion|El Cortez|Circa|Downtown Grand|Fremont|Four Queens|Main Street Station|California Hotel|Gold Coast|Suncoast|Sun Coast|Orleans|Sam.?s Town|Aliante|Cannery|Silverton|Fiesta|Arizona Charlie(?:'s)?|Virgin Hotels|Resorts World|Virgin|Treasure Island|Palms|Rio|Sahara|Strat(?:osphere)?|Golden Gate|Plaza|Lady Luck)\b/i;

  const casinoMatch = text.match(casinoPattern);
  const casinoName = casinoMatch ? casinoMatch[1] : null;

  // Extract slot machine name
  const machinePattern = /\b(Megabucks|Buffalo(?: Gold| Grand| Stampede| Chief| Extreme)?|Lightning Link|Dragon Link|Wheel of Fortune|Dancing Drums|Fu Dai Lian Lian|Wolf Run|Quick Hit|Lock It Link|Dollar Storm|Lightning Cash|Konami|IGT|Zeus|Kronos|Blazing 7|Triple Diamond|Double Diamond|Cleopatra|Da Ji Da Li)\b/i;
  const machineMatch = text.match(machinePattern);

  // Generate a stable dedup ID from URL
  const postId = Buffer.from(item.link || item.title).toString('base64').slice(0, 50);

  return {
    casinoName,
    machineName: machineMatch ? machineMatch[1] : null,
    amountDollars: amount,
    sourceUrl: item.link,
    postId,
    rawText: text.slice(0, 500),
    postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    // Trust score: higher if we identified both casino + machine, lower if just casino, lowest if neither
    trustScore: casinoName && machineMatch ? 7 : casinoName ? 6 : 4,
  };
}

/**
 * Look up casino_id from a plain name (partial match).
 */
async function findCasinoId(casinoName) {
  if (!casinoName) return null;
  // Try first word of casino name as the search token
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

async function run() {
  console.log('📰 JackpotMap News Monitor\n');
  let totalStored = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;

  for (const feedUrl of RSS_FEEDS) {
    console.log(`\nFetching: ${feedUrl.substring(0, 80)}...`);
    try {
      const resp = await axios.get(feedUrl, {
        headers: { 'User-Agent': UA },
        timeout: 15000,
      });
      const items = parseRSS(resp.data);
      console.log(`  ${items.length} articles found`);

      for (const item of items) {
        const jackpot = extractJackpotFromNews(item);
        if (!jackpot) continue;
        totalProcessed++;

        const casinoId = await findCasinoId(jackpot.casinoName);

        try {
          const result = await pool.query(
            `INSERT INTO jackpots
               (casino_id, machine_name, machine_type, amount_cents, won_at, source, source_url, source_post_id, trust_score, raw_text, verified)
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

          if (result.rowCount > 0) {
            totalStored++;
            const amt = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(jackpot.amountDollars);
            console.log(
              `  💰 ${amt} at ${jackpot.casinoName || 'unknown casino'} — ${item.title.slice(0, 60)}`
            );
          } else {
            totalSkipped++;
          }
        } catch (dbErr) {
          console.error(`  DB error: ${dbErr.message}`);
        }
      }

      // Polite delay between feeds
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
    }
  }

  console.log(`\n✅ Done — ${totalStored} new jackpots stored, ${totalSkipped} already known, ${totalProcessed} total processed`);

  // Log pipeline run
  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('news-monitor', 'success', $1, NOW())`,
    [totalStored]
  ).catch(() => {}); // Non-fatal if table doesn't have this scraper yet

  await pool.end();
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
