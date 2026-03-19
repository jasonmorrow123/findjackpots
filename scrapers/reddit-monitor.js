/**
 * Reddit Jackpot Monitor — RSS/JSON feed version (no API key required)
 *
 * Reddit exposes public JSON feeds at:
 *   https://www.reddit.com/r/<sub>/new.json
 *   https://www.reddit.com/r/<sub>/search.json?q=jackpot&sort=new
 *
 * No auth needed. Rate limit: ~1 req/sec with a proper User-Agent.
 * Deduplication via source_post_id — safe to run repeatedly.
 *
 * Run: node reddit-monitor.js
 * Schedule: every 2 hours
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// User-Agent required by Reddit to avoid 429s
const UA = 'JackpotMap/1.0 (research; contact: data@jackpotmap.com)';

const SUBREDDITS = [
  'gambling',
  'LasVegas',
  'vegaslocals',
  'slotmachines',
  'Reno',
];

// Keywords that strongly suggest a jackpot win post
const JACKPOT_KEYWORDS = [
  'jackpot', 'handpay', 'hand pay', 'hand-pay',
  'hit for', 'won', 'big win', 'hit a', 'i hit',
  'just hit', 'just won', 'i won', 'mega', 'progressive',
  'grand jackpot', 'major jackpot', 'minor jackpot',
];

// Machine name patterns to extract from text
const MACHINE_PATTERNS = [
  /buffalo\s+(?:gold|grand|stampede|diamond|chief|link|extreme)/i,
  /dragon\s+(?:link|cash|spin)/i,
  /lightning\s+(?:link|cash)/i,
  /lock\s+it\s+link/i,
  /dancing\s+drums/i,
  /wheel\s+of\s+fortune/i,
  /megabucks/i,
  /igt\s+megabucks/i,
  /wolf\s+run/i,
  /double\s+diamond/i,
  /triple\s+diamond/i,
  /blazing\s+7/i,
  /fu\s+dai/i,
  /mighty\s+cash/i,
  /wonder\s+4/i,
  /fire\s+&?\s*water/i,
  /dollar\s+storm/i,
  /tiki\s+torch/i,
  /more\s+chilli/i,
  /timber\s+wolf/i,
  /quick\s+hit/i,
  /cleopatra/i,
  /zeus/i,
  /kronos/i,
];

// Casino name patterns
const CASINO_PATTERNS = [
  /\b(bellagio|mgm\s+grand?|caesars|palace\s+station|green\s+valley\s+ranch|south\s+point|golden\s+nugget|wynn|encore|venetian|palazzo|aria|cosmopolitan|mandalay\s+bay|excalibur|luxor|mirage|hard\s+rock|circus\s+circus|stratosphere|strat|el\s+cortez|downtown\s+grand|d\s+las\s+vegas|fremont|binion|four\s+queens|horseshoe|flamingo|harrah|paris|linq|bally|suncoast|orleans|gold\s+coast|sam.?s\s+town|main\s+street\s+station|california\s+hotel|cannery|aliante|santa\s+fe\s+station|sunset\s+station|boulder\s+station|red\s+rock)\b/i,
];

// Dollar amount extraction
const AMOUNT_RE = /\$\s*([\d,]+(?:\.\d{2})?)\b/g;

/**
 * Fetch new posts from a subreddit without auth
 */
async function fetchPosts(subreddit, limit = 50) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
  const resp = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
  });
  return resp.data.data.children.map(c => c.data);
}

/**
 * Also search each subreddit for recent jackpot-related posts
 */
async function searchPosts(subreddit, query, limit = 25) {
  const url = `https://www.reddit.com/r/${subreddit}/search.json`;
  const resp = await axios.get(url, {
    headers: { 'User-Agent': UA },
    params: { q: query, sort: 'new', limit, restrict_sr: 1, t: 'week' },
    timeout: 15000,
  });
  return resp.data.data.children.map(c => c.data);
}

/**
 * Check if a post is likely a jackpot win
 */
function isJackpotPost(post) {
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
  return JACKPOT_KEYWORDS.some(kw => text.includes(kw)) && AMOUNT_RE.test(text);
}

/**
 * Extract jackpot info from post text using regex (no LLM needed)
 */
function extractFromPost(post) {
  const fullText = `${post.title} ${post.selftext || ''}`;
  const results = [];

  // Extract all dollar amounts
  const amounts = [];
  let match;
  AMOUNT_RE.lastIndex = 0;
  while ((match = AMOUNT_RE.exec(fullText)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (val >= 1000 && val <= 25000000) amounts.push(val);
  }
  AMOUNT_RE.lastIndex = 0;

  if (!amounts.length) return results;

  // Extract machine name
  let machineName = null;
  for (const pattern of MACHINE_PATTERNS) {
    const m = fullText.match(pattern);
    if (m) { machineName = m[0].trim(); break; }
  }

  // Extract casino name
  let casinoName = null;
  for (const pattern of CASINO_PATTERNS) {
    const m = fullText.match(pattern);
    if (m) { casinoName = m[1].trim(); break; }
  }

  // Get image URL if image post
  const imageUrl = post.url?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? post.url : null;

  // Trust score: higher if has image, higher if casino identified
  const trustScore = 3 + (imageUrl ? 2 : 0) + (casinoName ? 1 : 0);

  // Use the largest amount found (most likely the jackpot)
  const amount = Math.max(...amounts);

  results.push({
    casinoName,
    machineName,
    amountDollars: amount,
    imageUrl,
    trustScore,
    postId: post.id,
    permalink: post.permalink,
    subreddit: post.subreddit,
    rawText: fullText.slice(0, 500),
    postedAt: new Date(post.created_utc * 1000),
  });

  return results;
}

/**
 * Fuzzy match casino name to DB
 */
async function findCasinoId(casinoName) {
  if (!casinoName) return null;
  const word = casinoName.split(/\s+/)[0];
  const r = await pool.query(
    `SELECT id FROM casinos WHERE name ILIKE $1 LIMIT 1`,
    [`%${word}%`]
  );
  return r.rows[0]?.id || null;
}

/**
 * Store jackpot record
 */
async function storeJackpot(rec) {
  const casinoId = await findCasinoId(rec.casinoName);
  const result = await pool.query(
    `INSERT INTO jackpots
       (casino_id, machine_name, machine_type, amount_cents, won_at,
        source, source_url, source_post_id, trust_score, photo_url, raw_text, verified)
     VALUES ($1, $2, 'slot', $3, $4, 'reddit', $5, $6, $7, $8, $9, false)
     ON CONFLICT (source, source_post_id) DO NOTHING
     RETURNING id`,
    [
      casinoId,
      rec.machineName,
      Math.round(rec.amountDollars * 100),
      rec.postedAt,
      `https://reddit.com${rec.permalink}`,
      rec.postId,
      rec.trustScore,
      rec.imageUrl,
      rec.rawText,
    ]
  );
  return result.rowCount > 0;
}

/**
 * Main runner
 */
async function run() {
  console.log('🤖 JackpotMap Reddit Monitor (RSS/JSON — no API key)\n');
  const startTime = Date.now();
  let totalFound = 0;
  let totalStored = 0;

  // Process each subreddit
  for (const sub of SUBREDDITS) {
    console.log(`\n📡 Scanning r/${sub}...`);

    try {
      // Fetch new posts + targeted jackpot search
      const [newPosts, searchResults] = await Promise.all([
        fetchPosts(sub, 50),
        searchPosts(sub, 'jackpot win', 25),
      ]);

      // Deduplicate by post ID
      const seen = new Set();
      const allPosts = [...newPosts, ...searchResults].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      console.log(`  ${allPosts.length} posts fetched`);

      let subFound = 0;
      for (const post of allPosts) {
        if (!isJackpotPost(post)) continue;

        const records = extractFromPost(post);
        for (const rec of records) {
          totalFound++;
          subFound++;
          const stored = await storeJackpot(rec);
          if (stored) {
            totalStored++;
            const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(rec.amountDollars);
            console.log(`  💰 ${amt} — ${rec.machineName || 'unknown machine'} @ ${rec.casinoName || 'unknown casino'} (trust: ${rec.trustScore})`);
          }
        }
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`  → ${subFound} jackpot posts matched`);

    } catch (err) {
      if (err.response?.status === 429) {
        console.log(`  ⚠️  Rate limited on r/${sub} — skipping (run again in 1 hour)`);
      } else {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }

    // Be polite — 1.5s between subreddits
    await new Promise(r => setTimeout(r, 1500));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s — ${totalFound} jackpot posts found, ${totalStored} new records stored`);

  // Log pipeline run
  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('reddit-monitor', 'success', $1, $2)`,
    [totalStored, new Date(startTime)]
  ).catch(() => {});

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
