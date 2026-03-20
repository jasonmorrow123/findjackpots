/**
 * Fetch Yelp image URLs for casinos that have a yelp_id but no image_url.
 * Uses the Yelp business detail endpoint.
 */
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const HEADERS = { Authorization: `Bearer ${process.env.YELP_API_KEY}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  // Get casinos with yelp_id but no image
  const result = await pool.query(`
    SELECT id, name, yelp_id FROM casinos
    WHERE yelp_id IS NOT NULL AND (image_url IS NULL OR image_url = '')
    ORDER BY id LIMIT 200
  `);
  console.log(`Fetching images for ${result.rows.length} casinos...`);

  let updated = 0;
  for (const casino of result.rows) {
    try {
      const r = await axios.get(`https://api.yelp.com/v3/businesses/${casino.yelp_id}`, {
        headers: HEADERS, timeout: 8000
      });
      const imageUrl = r.data.image_url;
      if (imageUrl) {
        await pool.query('UPDATE casinos SET image_url = $1 WHERE id = $2', [imageUrl, casino.id]);
        updated++;
        process.stdout.write(`\r  Updated: ${updated}/${result.rows.length} — ${casino.name.substring(0, 40)}`);
      }
      await sleep(250); // ~4 req/sec, well under Yelp's 500/day free limit
    } catch (e) {
      // 429 = rate limited, 404 = business not found
      if (e.response?.status === 429) {
        console.log('\n  Rate limited — stopping. Run again tomorrow for remaining images.');
        break;
      }
    }
  }

  console.log(`\n\n✅ Done — ${updated} casino images fetched`);

  // Check how many have images now
  const countResult = await pool.query('SELECT COUNT(*) FROM casinos WHERE image_url IS NOT NULL');
  console.log(`Total casinos with images: ${countResult.rows[0].count}`);

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
