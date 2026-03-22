/**
 * Restaurant Scraper — Yelp Fusion API
 * Finds restaurants physically at casinos (matched by name) and seeds the DB.
 *
 * Usage: node restaurant-scraper.js
 * Processes up to 50 casinos that don't have restaurant data yet.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

const YELP_BASE = 'https://api.yelp.com/v3';
const YELP_API_KEY = process.env.YELP_API_KEY;

if (!YELP_API_KEY) {
  console.error('ERROR: YELP_API_KEY not set in scrapers/.env');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${YELP_API_KEY}`,
  'Content-Type': 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize a string for fuzzy matching:
 * lowercase, remove common words, collapse whitespace
 */
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\bcasino\b|\bhotel\b|\bresort\b|\bthe\b|\band\b|[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true if the restaurant name appears to be inside the casino.
 * Strategy: check if the casino's core name appears in the restaurant name,
 * or the restaurant name appears in the casino name.
 */
function isAtCasino(casinoName, restaurantName) {
  const casinoNorm = normalize(casinoName);
  const restNorm = normalize(restaurantName);

  // Split casino name into significant words (>3 chars)
  const casinoWords = casinoNorm.split(' ').filter(w => w.length > 3);

  // Check if any significant casino word appears in the restaurant name
  const casinoWordMatch = casinoWords.some(word => restNorm.includes(word));

  // Check if any significant restaurant word appears in the casino name
  const restWords = restNorm.split(' ').filter(w => w.length > 3);
  const restWordMatch = restWords.some(word => casinoNorm.includes(word));

  return casinoWordMatch || restWordMatch;
}

/**
 * Search Yelp for restaurants near a casino, return matches within casino.
 */
async function searchRestaurantsNearCasino(casino) {
  const { name, city, state, lat, lng } = casino;
  const params = {
    term: `restaurants ${name}`,
    limit: 20,
    sort_by: 'best_match',
    categories: 'restaurants',
  };

  // Use lat/lng if available, otherwise location string
  if (lat && lng) {
    params.latitude = parseFloat(lat);
    params.longitude = parseFloat(lng);
    params.radius = 200; // 200m radius — keeps it very tight around the casino
  } else {
    params.location = `${name}, ${city}, ${state}`;
  }

  try {
    const res = await axios.get(`${YELP_BASE}/businesses/search`, {
      headers: HEADERS,
      params,
    });

    const businesses = res.data.businesses || [];

    // Filter to restaurants that are plausibly inside the casino
    const matches = businesses.filter(biz => isAtCasino(name, biz.name));

    // If tight filter returns nothing but lat/lng is known, widen radius and try alias match
    if (matches.length === 0 && lat && lng) {
      const wideRes = await axios.get(`${YELP_BASE}/businesses/search`, {
        headers: HEADERS,
        params: {
          ...params,
          radius: 500,
          term: `restaurants`,
        },
      });
      const wideBiz = wideRes.data.businesses || [];
      return wideBiz.filter(biz => isAtCasino(name, biz.name)).slice(0, 5);
    }

    return matches.slice(0, 5);
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('  Rate limited by Yelp — waiting 10s...');
      await sleep(10000);
      return [];
    }
    if (err.response?.status === 400) {
      console.warn(`  Bad request for ${name}: ${err.response?.data?.error?.description}`);
      return [];
    }
    throw err;
  }
}

/**
 * Save restaurants to DB for a given casino.
 */
async function saveRestaurants(casinoId, restaurants) {
  for (const biz of restaurants) {
    const cuisine = (biz.categories || []).map(c => c.title).join(', ') || null;
    const priceRange = biz.price || null; // '$', '$$', '$$$', '$$$$'
    const yelpUrl = biz.url || null;

    await pool.query(`
      INSERT INTO restaurants (casino_id, name, cuisine, rating, review_count, price_range, yelp_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [
      casinoId,
      biz.name,
      cuisine,
      biz.rating || null,
      biz.review_count || null,
      priceRange,
      yelpUrl,
    ]);
  }
}

async function run() {
  console.log('\n🍽️  FindJackpots Restaurant Scraper\n');

  // Ensure table has a unique constraint to support ON CONFLICT DO NOTHING
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'restaurants_casino_id_name_key'
      ) THEN
        ALTER TABLE restaurants ADD CONSTRAINT restaurants_casino_id_name_key UNIQUE (casino_id, name);
      END IF;
    END;
    $$;
  `).catch(() => {}); // Ignore if already exists

  // Fetch up to 50 casinos without restaurant data, prioritize those with lat/lng
  const casinosResult = await pool.query(`
    SELECT c.id, c.name, c.city, c.state, c.lat, c.lng
    FROM casinos c
    WHERE NOT EXISTS (
      SELECT 1 FROM restaurants r WHERE r.casino_id = c.id
    )
    AND (c.lat IS NOT NULL OR c.city IS NOT NULL)
    ORDER BY c.lat IS NOT NULL DESC, c.id ASC
    LIMIT 50
  `);

  const casinos = casinosResult.rows;
  console.log(`Found ${casinos.length} casinos without restaurant data.\n`);

  let totalSaved = 0;
  let totalProcessed = 0;

  for (const casino of casinos) {
    totalProcessed++;
    console.log(`[${totalProcessed}/${casinos.length}] Searching: ${casino.name} (${casino.city}, ${casino.state?.trim()})`);

    try {
      const restaurants = await searchRestaurantsNearCasino(casino);

      if (restaurants.length === 0) {
        console.log(`  → No restaurant matches found`);
        // Insert a placeholder so we don't re-query this casino
        // (We mark with a sentinel by doing nothing — next run skips it via NOT EXISTS)
        // Actually, we need to mark it as "done" even with 0 results
        // We'll insert a dummy record to mark as processed, then delete it:
        // Better: just leave empty and skip next run by tracking separately
        // For simplicity, insert a single row to mark done:
        await pool.query(`
          INSERT INTO restaurants (casino_id, name, cuisine)
          VALUES ($1, '__no_restaurants__', NULL)
          ON CONFLICT DO NOTHING
        `, [casino.id]);
      } else {
        await saveRestaurants(casino.id, restaurants);
        totalSaved += restaurants.length;
        console.log(`  → Saved ${restaurants.length} restaurant(s): ${restaurants.map(r => r.name).join(', ')}`);
      }

      // Respect Yelp rate limits: ~500 calls/day free tier
      // With 2 searches per casino + buffer, limit to ~1 per 2s
      await sleep(2000);
    } catch (err) {
      console.error(`  ✗ Error for ${casino.name}: ${err.message}`);
      await sleep(2000);
    }
  }

  console.log(`\n✅ Done! Processed ${totalProcessed} casinos, saved ${totalSaved} restaurants.\n`);
  await pool.end();
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
