/**
 * Yelp Fusion API Scraper
 * Fetches casino listings, ratings, and reviews for a given city.
 * 
 * Docs: https://docs.developer.yelp.com/reference/v3_business_search
 * Free tier: 500 calls/day
 * 
 * Usage: node yelp-scraper.js [city] [state]
 * Example: node yelp-scraper.js "Las Vegas" NV
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const YELP_BASE = 'https://api.yelp.com/v3';
const HEADERS = {
  Authorization: `Bearer ${process.env.YELP_API_KEY}`,
  'Content-Type': 'application/json',
};

async function searchCasinos(location, offset = 0) {
  const res = await axios.get(`${YELP_BASE}/businesses/search`, {
    headers: HEADERS,
    params: {
      location,
      categories: 'casinos',
      limit: 50,
      offset,
      sort_by: 'review_count',
    },
  });
  return res.data;
}

async function getBusinessDetails(yelpId) {
  const res = await axios.get(`${YELP_BASE}/businesses/${yelpId}`, {
    headers: HEADERS,
  });
  return res.data;
}

async function upsertCasino(biz) {
  const client = await pool.connect();
  try {
    // Upsert casino record
    const result = await client.query(
      `INSERT INTO casinos (name, slug, address, city, state, zip, lat, lng, phone, website, yelp_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (yelp_id) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         phone = EXCLUDED.phone,
         updated_at = NOW()
       RETURNING id`,
      [
        biz.name,
        slugify(biz.name),
        biz.location?.display_address?.join(', '),
        biz.location?.city,
        biz.location?.state,
        biz.location?.zip_code,
        biz.coordinates?.latitude,
        biz.coordinates?.longitude,
        biz.phone,
        biz.url,
        biz.id,
      ]
    );

    const casinoId = result.rows[0].id;

    // Upsert review snapshot
    await client.query(
      `INSERT INTO reviews (casino_id, source, rating, review_count, fetched_at)
       VALUES ($1, 'yelp', $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [casinoId, biz.rating, biz.review_count]
    );

    console.log(`✓ Upserted: ${biz.name} (id: ${casinoId})`);
    return casinoId;
  } finally {
    client.release();
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function run() {
  const location = process.argv[2] ? `${process.argv[2]}, ${process.argv[3] || ''}` : 'Las Vegas, NV';
  console.log(`\n🎰 JackpotMap Yelp Scraper — ${location}\n`);

  let offset = 0;
  let total = 0;
  let added = 0;

  do {
    console.log(`Fetching offset ${offset}...`);
    const data = await searchCasinos(location, offset);
    total = data.total;

    for (const biz of data.businesses) {
      // Get full details for each (phone, website, etc.)
      try {
        const details = await getBusinessDetails(biz.id);
        await upsertCasino(details);
        added++;
        // Respect rate limits — 500/day, ~1 per 175ms
        await sleep(400);
      } catch (err) {
        console.error(`  ✗ Error on ${biz.name}: ${err.message}`);
      }
    }

    offset += 50;
  } while (offset < Math.min(total, 200)); // Yelp caps search at offset 200

  console.log(`\n✅ Done! Processed ${added} casinos in ${location}`);
  await pool.end();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
