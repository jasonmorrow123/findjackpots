/**
 * Twitter/X Real-Time Jackpot Monitor
 * Uses Twitter API v2 filtered stream to capture casino jackpot posts.
 * 
 * Setup:
 *   1. Get Basic or Pro tier access at developer.twitter.com
 *   2. Create an app and get Bearer Token
 *   3. Set TWITTER_BEARER_TOKEN in .env
 * 
 * Cost: ~$100/mo for Basic (enough for this use case)
 * 
 * What it does:
 *   - Monitors casino Twitter accounts for jackpot announcements
 *   - Extracts: casino name, jackpot amount, machine name, date
 *   - Uses GPT-4o-mini to parse unstructured tweet text
 *   - Stores structured records in PostgreSQL
 */

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const twitter = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Casino Twitter accounts to monitor (add more as you find them)
const CASINO_ACCOUNTS = {
  Bellagio:           'Bellagio',
  MGMGrand:           'MGMGrand',
  PalaceStation:      'PalaceStation',
  GreenValleyRanch:   'GreenValleyRanch',
  SouthPointCasino:   'SouthPointCasino',
  GoldenNugget:       'GoldenNugget',
  HardRockLV:         'HardRockHotelLV',
  WynnLasVegas:       'WynnLasVegas',
  CaesarsLV:          'CaesarsPalace',
  TheD_LasVegas:      'TheDLasVegas',
  GoldStrike:         'GoldStrikeMiss',
  HarrahsLV:          'Harrahs',
};

// Keywords that suggest a jackpot post
const JACKPOT_KEYWORDS = [
  'jackpot', 'winner', 'wins', 'won', 'hit', 'lucky',
  'million', '000,000', 'progressive', 'megabucks',
];

/**
 * Parse tweet text using GPT-4o-mini to extract structured jackpot data
 */
async function extractJackpotData(tweetText, casinoName) {
  const prompt = `Extract jackpot win information from this casino tweet. 
Return JSON only, no explanation. If it's not about a jackpot win, return null.

Tweet: "${tweetText}"
Casino: ${casinoName}

Expected JSON format:
{
  "is_jackpot": true/false,
  "amount_dollars": 1234567,
  "machine_name": "Wheel of Fortune",
  "machine_type": "slot|video_poker|table|progressive",
  "winner_description": "A lucky guest" (never include personal names)
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 200,
  });

  try {
    const text = response.choices[0].message.content.trim();
    if (text === 'null') return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Look up casino_id by Twitter handle
 */
async function getCasinoId(twitterHandle) {
  const result = await pool.query(
    'SELECT id FROM casinos WHERE twitter_handle = $1',
    [twitterHandle]
  );
  return result.rows[0]?.id || null;
}

/**
 * Store parsed jackpot in DB
 */
async function storeJackpot({ casinoId, extracted, tweetId, tweetText, mediaUrl }) {
  if (!extracted?.is_jackpot || !extracted?.amount_dollars) return;

  await pool.query(
    `INSERT INTO jackpots 
       (casino_id, machine_name, machine_type, amount_cents, source, source_post_id, 
        trust_score, photo_url, raw_text, won_at)
     VALUES ($1, $2, $3, $4, 'twitter', $5, 6, $6, $7, NOW())
     ON CONFLICT (source, source_post_id) DO NOTHING`,
    [
      casinoId,
      extracted.machine_name,
      extracted.machine_type || 'slot',
      Math.round(extracted.amount_dollars * 100),
      tweetId,
      mediaUrl || null,
      tweetText,
    ]
  );

  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(extracted.amount_dollars);
  console.log(`💰 NEW JACKPOT: ${amount} on ${extracted.machine_name || 'unknown machine'} (tweet ${tweetId})`);
}

/**
 * Build Twitter filtered stream rules for casino accounts
 */
async function setupStreamRules() {
  const client = twitter.readOnly;

  // Delete existing rules
  const existingRules = await client.v2.streamRules();
  if (existingRules.data?.length) {
    await client.v2.updateStreamRules({
      delete: { ids: existingRules.data.map((r) => r.id) },
    });
  }

  // Build rule: (from:Account1 OR from:Account2 ...) jackpot
  const fromClauses = Object.values(CASINO_ACCOUNTS).map((h) => `from:${h}`).join(' OR ');
  const rule = `(${fromClauses}) (jackpot OR winner OR "big win") -is:retweet lang:en`;

  await client.v2.updateStreamRules({
    add: [{ value: rule, tag: 'casino-jackpots' }],
  });

  console.log('✅ Stream rules set up');
}

/**
 * Start listening to the stream
 */
async function startStream() {
  const client = twitter.readOnly;
  await setupStreamRules();

  console.log('🎰 Starting Twitter jackpot stream...\n');

  const stream = await client.v2.searchStream({
    'tweet.fields': ['created_at', 'author_id', 'attachments', 'text'],
    'media.fields': ['url', 'preview_image_url'],
    expansions: ['author_id', 'attachments.media_keys'],
  });

  stream.autoReconnect = true;

  // Handle account name → handle lookup
  const handleByAuthorId = {};
  for (const [name, handle] of Object.entries(CASINO_ACCOUNTS)) {
    // We'll populate this from stream user expansions
    handleByAuthorId[handle.toLowerCase()] = handle;
  }

  for await (const tweet of stream) {
    try {
      const text = tweet.data.text;
      const authorId = tweet.data.author_id;

      // Find which casino account sent this
      const user = tweet.includes?.users?.find((u) => u.id === authorId);
      const handle = user?.username || '';
      const casinoName = Object.entries(CASINO_ACCOUNTS)
        .find(([, h]) => h.toLowerCase() === handle.toLowerCase())?.[0] || handle;

      // Get media URL if present
      const mediaKey = tweet.data.attachments?.media_keys?.[0];
      const mediaUrl = tweet.includes?.media?.find((m) => m.media_key === mediaKey)?.url;

      console.log(`📨 Tweet from @${handle}: ${text.slice(0, 80)}...`);

      // Parse with LLM
      const extracted = await extractJackpotData(text, casinoName);

      if (extracted?.is_jackpot) {
        const casinoId = await getCasinoId(handle);
        if (casinoId) {
          await storeJackpot({
            casinoId,
            extracted,
            tweetId: tweet.data.id,
            tweetText: text,
            mediaUrl,
          });
        } else {
          console.warn(`  ⚠️  No casino_id found for @${handle} — add to DB first`);
        }
      }
    } catch (err) {
      console.error('Error processing tweet:', err.message);
    }
  }
}

startStream().catch((err) => {
  console.error('Stream error:', err);
  process.exit(1);
});
