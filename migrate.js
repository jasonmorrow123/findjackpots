// One-time migration script — creates schema + seeds data from embedded JSON
// Run via: node migrate.js
// On DigitalOcean: add as a Job in App Platform, or trigger via /api/migrate

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating schema...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS casinos (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        chain TEXT,
        city TEXT,
        state TEXT,
        address TEXT,
        phone TEXT,
        website TEXT,
        lat NUMERIC,
        lng NUMERIC,
        ngcb_county TEXT,
        affiliate_url TEXT,
        affiliate_network TEXT,
        affiliate_commission_note TEXT,
        monthly_revenue_cents BIGINT,
        revenue_report_month DATE,
        revenue_source TEXT,
        loyalty_program_name TEXT,
        loyalty_tiers TEXT[],
        loyalty_benefits TEXT[],
        loyalty_website TEXT,
        loyalty_points_per_dollar TEXT,
        has_bingo BOOLEAN DEFAULT false,
        has_poker BOOLEAN DEFAULT false,
        has_sportsbook BOOLEAN DEFAULT false,
        has_hotel BOOLEAN DEFAULT false,
        has_slots BOOLEAN DEFAULT true,
        free_parking BOOLEAN DEFAULT false,
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id) ON DELETE CASCADE,
        source TEXT,
        rating NUMERIC,
        review_count INTEGER,
        url TEXT,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS jackpots (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id) ON DELETE CASCADE,
        machine_name TEXT,
        machine_type TEXT,
        amount_cents BIGINT,
        won_at TIMESTAMPTZ,
        source TEXT,
        source_url TEXT,
        trust_score INTEGER DEFAULT 5,
        photo_url TEXT,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS slot_payback (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id) ON DELETE CASCADE,
        denomination TEXT,
        payback_pct NUMERIC,
        report_month DATE,
        machine_count INTEGER
      );

      CREATE TABLE IF NOT EXISTS casino_events (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        event_type TEXT,
        event_date DATE,
        start_time TIME,
        end_time TIME,
        description TEXT,
        prize_amount_cents BIGINT,
        recurring TEXT,
        recurring_days TEXT[],
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        favorite_casinos INTEGER[],
        all_alerts BOOLEAN DEFAULT true,
        min_amount_cents BIGINT DEFAULT 1000000,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS casino_helpful_votes (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id) ON DELETE CASCADE,
        voted_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        casino_id INTEGER REFERENCES casinos(id),
        name TEXT,
        cuisine TEXT,
        rating NUMERIC(2,1),
        review_count INTEGER,
        price_range TEXT,
        yelp_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS email_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        region TEXT,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        active BOOLEAN DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_casino ON reviews(casino_id);
      CREATE INDEX IF NOT EXISTS idx_jackpots_casino ON jackpots(casino_id);
      CREATE INDEX IF NOT EXISTS idx_jackpots_date ON jackpots(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_date ON casino_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_helpful_casino ON casino_helpful_votes(casino_id);
      CREATE INDEX IF NOT EXISTS idx_casinos_state ON casinos(state);
    `);

    console.log('Schema created successfully.');
    console.log('Ready for data import.');
  } catch(e) {
    console.error('Migration error:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
