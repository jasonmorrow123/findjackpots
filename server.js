const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');
const { AFFILIATE_CONFIG } = require('./affiliates');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false, ca: undefined }
    : false,
});

// Load VAPID keys — env vars in production, file locally
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else {
  vapidKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid-keys.json'), 'utf8'));
}
webpush.setVapidDetails(
  'mailto:data@findjackpots.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use(cors());
app.use(express.json());

// Region definitions
const REGIONS = {
  // ── Nevada ──────────────────────────────────────────────────────────────
  'las-vegas': { states: ['NV'], city: 'Las Vegas', label: 'Las Vegas, NV',  emoji: '🎰' },
  'reno':      { states: ['NV'], city: 'Reno',      label: 'Reno, NV',       emoji: '🎲' },
  'nevada':    { states: ['NV'], city: null,         label: 'All Nevada',     emoji: '🏜️' },
  // ── Midwest (all states) ─────────────────────────────────────────────────
  'midwest':   { states: ['MN','IA','IL','IN','MI','WI','MO','OH','ND','SD','NE','KS','KY'], city: null, label: 'Midwest (All)', emoji: '🌽' },
  'minnesota': { states: ['MN'], city: null, label: 'Minnesota',  emoji: '🌲' },
  'iowa':      { states: ['IA'], city: null, label: 'Iowa',       emoji: '🌾' },
  'illinois':  { states: ['IL'], city: null, label: 'Illinois',   emoji: '🏙️' },
  'indiana':   { states: ['IN'], city: null, label: 'Indiana',    emoji: '🏎️' },
  'michigan':  { states: ['MI'], city: null, label: 'Michigan',   emoji: '🚗' },
  'wisconsin': { states: ['WI'], city: null, label: 'Wisconsin',  emoji: '🧀' },
  'missouri':  { states: ['MO'], city: null, label: 'Missouri',   emoji: '🎵' },
  'ohio':      { states: ['OH'], city: null, label: 'Ohio',       emoji: '🌰' },
};

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve service worker
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));

// GET /api/regions — return list of available regions for the frontend picker
app.get('/api/regions', (req, res) => {
  const list = Object.entries(REGIONS).map(([id, r], i) => ({
    id,
    label: r.label,
    emoji: r.emoji,
    ...(id === 'las-vegas' ? { default: true } : {}),
  }));
  res.json(list);
});

// GET /api/casinos — rich casino data with jackpots, ratings, and query param filters
app.get('/api/casinos', async (req, res) => {
  try {
    const { region, city, chain, has_jackpots, limit = 50, offset = 0 } = req.query;
    const limitVal = Math.min(parseInt(limit) || 50, 200);
    const offsetVal = parseInt(offset) || 0;

    const conditions = [];
    const params = [];

    // Region takes priority over city; default to las-vegas if neither provided
    const regionKey = region && REGIONS[region] ? region : (!region && !city ? 'las-vegas' : null);
    const regionDef = regionKey ? REGIONS[regionKey] : null;

    if (regionDef) {
      params.push(regionDef.states);
      conditions.push(`c.state = ANY($${params.length})`);
      if (regionDef.city) {
        params.push(regionDef.city);
        conditions.push(`c.city ILIKE $${params.length}`);
      }
    } else if (city) {
      // Legacy city param (no region match)
      conditions.push(`c.state = 'NV'`);
      params.push(city);
      conditions.push(`c.city ILIKE $${params.length}`);
    } else {
      // Fallback: all NV
      conditions.push(`c.state = 'NV'`);
    }

    if (chain) {
      params.push(`%${chain}%`);
      conditions.push(`c.chain ILIKE $${params.length}`);
    }
    if (has_jackpots === 'true') {
      conditions.push(`EXISTS (SELECT 1 FROM jackpots WHERE casino_id = c.id)`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
    params.push(limitVal, offsetVal);
    const limitParam = params.length - 1;
    const offsetParam = params.length;

    const result = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.chain, c.city, c.state, c.address,
        c.ngcb_county, c.affiliate_url, c.affiliate_network, c.affiliate_commission_note,
        c.monthly_revenue_cents, c.revenue_report_month, c.revenue_source,
        c.loyalty_program_name, c.loyalty_tiers, c.loyalty_points_per_dollar,
        c.has_bingo, c.has_poker, c.has_sportsbook, c.has_hotel, c.free_parking, c.has_slots,
        c.image_url, c.lat, c.lng,
        c.phone,
        r.rating, r.review_count,
        j.machine_name AS latest_jackpot_machine,
        j.amount_cents AS latest_jackpot_cents,
        j.created_at AS latest_jackpot_date,
        top_j.amount_cents AS top_jackpot_cents
      FROM casinos c
      LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
      LEFT JOIN LATERAL (
        SELECT machine_name, amount_cents, created_at
        FROM jackpots WHERE casino_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) j ON true
      LEFT JOIN LATERAL (
        SELECT amount_cents
        FROM jackpots WHERE casino_id = c.id
        ORDER BY amount_cents DESC LIMIT 1
      ) top_j ON true
      WHERE ${whereClause}
      ORDER BY r.review_count DESC NULLS LAST, c.name ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('/api/casinos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jackpots/recent — latest 20 jackpots with casino name
app.get('/api/jackpots/recent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        j.id, j.amount_cents, j.machine_name, j.machine_type,
        j.won_at, j.source, j.source_url, j.trust_score,
        j.photo_url, j.verified, j.created_at,
        c.name AS casino_name, c.city, c.state
      FROM jackpots j
      LEFT JOIN casinos c ON c.id = j.casino_id
      ORDER BY j.created_at DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('/api/jackpots/recent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jackpots/top — top 10 jackpots by amount with casino name
app.get('/api/jackpots/top', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        j.id, j.amount_cents, j.machine_name, j.machine_type,
        j.won_at, j.source, j.source_url, j.trust_score,
        j.photo_url, j.verified, j.created_at,
        c.name AS casino_name, c.city, c.state
      FROM jackpots j
      LEFT JOIN casinos c ON c.id = j.casino_id
      ORDER BY j.amount_cents DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('/api/jackpots/top error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/casinos/:id — single casino with rich data, jackpots, payback
app.get('/api/casinos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.chain, c.city, c.state, c.address,
        c.ngcb_county, c.affiliate_url, c.affiliate_network, c.affiliate_commission_note,
        c.lat, c.lng, c.phone, c.website,
        c.has_bingo, c.has_poker, c.has_sportsbook, c.has_hotel, c.free_parking,
        c.loyalty_program_name, c.loyalty_tiers, c.loyalty_benefits,
        c.loyalty_website, c.loyalty_points_per_dollar,
        r.rating, r.review_count,
        j.machine_name AS latest_jackpot_machine,
        j.amount_cents AS latest_jackpot_cents,
        j.created_at AS latest_jackpot_date,
        top_j.amount_cents AS top_jackpot_cents
      FROM casinos c
      LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
      LEFT JOIN LATERAL (
        SELECT machine_name, amount_cents, created_at
        FROM jackpots WHERE casino_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) j ON true
      LEFT JOIN LATERAL (
        SELECT amount_cents
        FROM jackpots WHERE casino_id = c.id
        ORDER BY amount_cents DESC LIMIT 1
      ) top_j ON true
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Casino not found' });
    }

    // Enrich with affiliate config if no DB affiliate_url yet
    const casino = result.rows[0];
    if (!casino.affiliate_network && casino.chain) {
      const match = AFFILIATE_CONFIG.find(cfg =>
        cfg.chains.some(ch => casino.chain.toLowerCase().includes(ch.toLowerCase()))
      );
      if (match) {
        casino.affiliate_network = match.network;
        casino.affiliate_commission_note = match.commissionNote;
        casino.affiliate_status = match.status;
      }
    } else if (casino.affiliate_network) {
      // Look up status from config
      const match = AFFILIATE_CONFIG.find(cfg => cfg.network === casino.affiliate_network &&
        cfg.chains.some(ch => (casino.chain || '').toLowerCase().includes(ch.toLowerCase()))
      );
      casino.affiliate_status = match ? match.status : 'pending_signup';
    }

    // Fetch last 10 jackpots by amount
    const jackpotsResult = await pool.query(`
      SELECT machine_name, machine_type, amount_cents, won_at, created_at, source, verified
      FROM jackpots WHERE casino_id = $1
      ORDER BY amount_cents DESC LIMIT 10
    `, [id]);
    casino.jackpots = jackpotsResult.rows;

    // Fetch slot payback data if available
    const paybackResult = await pool.query(`
      SELECT denomination, payback_pct, report_month, machine_count
      FROM slot_payback WHERE casino_id = $1
      ORDER BY denomination ASC
    `, [id]);
    casino.slot_payback = paybackResult.rows;

    res.json(casino);
  } catch (err) {
    console.error('/api/casinos/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/affiliates/status — affiliate coverage summary
app.get('/api/affiliates/status', async (req, res) => {
  try {
    const totals = await pool.query(`
      SELECT
        COUNT(*) AS total_casinos,
        COUNT(affiliate_network) AS with_affiliate,
        COUNT(affiliate_url) AS active_count
      FROM casinos
    `);

    const { total_casinos, with_affiliate, active_count } = totals.rows[0];

    const pendingCount = parseInt(with_affiliate) - parseInt(active_count);
    const activePrograms = parseInt(active_count);

    res.json({
      total_casinos: parseInt(total_casinos),
      with_affiliate: parseInt(with_affiliate),
      pending_signup: pendingCount,
      active: activePrograms,
      estimated_monthly_revenue: activePrograms === 0
        ? '$0 (0 active programs)'
        : `~$${(activePrograms * 50).toLocaleString()} est. (${activePrograms} active program${activePrograms !== 1 ? 's' : ''})`,
    });
  } catch (err) {
    console.error('/api/affiliates/status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// PUSH NOTIFICATION ENDPOINTS
// ─────────────────────────────────────────

// GET /api/push/vapid-key — return public VAPID key for frontend subscription
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /api/push/subscribe — save push subscription to DB
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys, favoriteCasinos, minAmountCents } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription fields' });
    }

    await pool.query(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, favorite_casinos, all_alerts, min_amount_cents)
      VALUES ($1, $2, $3, $4, true, $5)
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        favorite_casinos = EXCLUDED.favorite_casinos,
        min_amount_cents = EXCLUDED.min_amount_cents
    `, [
      endpoint,
      keys.p256dh,
      keys.auth,
      favoriteCasinos || null,
      minAmountCents || 1000000,
    ]);

    res.json({ success: true, message: "You'll be notified of jackpots $10k+" });
  } catch (err) {
    console.error('/api/push/subscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/push/unsubscribe — remove subscription by endpoint
app.delete('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ success: true });
  } catch (err) {
    console.error('/api/push/unsubscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/test — send a test notification to a given endpoint
app.post('/api/push/test', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    const result = await pool.query(
      'SELECT * FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = result.rows[0];
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    const payload = JSON.stringify({
      title: '🎰 JackpotMap Test',
      body: 'Push notifications are working! You\'ll be alerted of jackpots $10k+.',
      icon: '/icon-192.png',
      data: { url: '/' },
    });

    await webpush.sendNotification(subscription, payload);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — clean up
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [req.body.endpoint]);
      return res.status(410).json({ error: 'Subscription expired, removed from DB' });
    }
    console.error('/api/push/test error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// CASINO EVENTS ENDPOINTS
// ─────────────────────────────────────────

// Helper: get day-of-week name from a Date object
function getDayName(date) {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
}

// Helper: expand recurring events into concrete dates within range
function expandRecurring(event, startDate, endDate) {
  const results = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (event.recurring === 'daily') {
    let cur = new Date(start);
    while (cur <= end) {
      results.push({ ...event, event_date: cur.toISOString().split('T')[0] });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (event.recurring === 'weekly' && event.recurring_days && event.recurring_days.length > 0) {
    let cur = new Date(start);
    while (cur <= end) {
      const dayName = getDayName(cur);
      if (event.recurring_days.includes(dayName)) {
        results.push({ ...event, event_date: cur.toISOString().split('T')[0] });
      }
      cur.setDate(cur.getDate() + 1);
    }
  } else if (event.recurring === 'monthly') {
    // Find monthly occurrences within range
    let cur = new Date(start);
    while (cur <= end) {
      results.push({ ...event, event_date: cur.toISOString().split('T')[0] });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return results;
}

// GET /api/events — events for a date range, filtered by region/casino
app.get('/api/events', async (req, res) => {
  try {
    const { date, days = 7, region, casino_id } = req.query;
    const daysVal = Math.min(parseInt(days) || 7, 60);
    const startDate = date || new Date().toISOString().split('T')[0];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysVal - 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    const regionDef = region && REGIONS[region] ? REGIONS[region] : null;

    const params = [startDate, endDateStr];
    const conditions = ['ce.event_date BETWEEN $1 AND $2'];

    if (casino_id) {
      params.push(parseInt(casino_id));
      conditions.push(`ce.casino_id = $${params.length}`);
    } else if (regionDef) {
      params.push(regionDef.states);
      conditions.push(`c.state = ANY($${params.length})`);
      if (regionDef.city) {
        params.push(regionDef.city);
        conditions.push(`c.city ILIKE $${params.length}`);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Get one-time events in range
    const oneTimeResult = await pool.query(`
      SELECT
        ce.id, ce.casino_id, ce.title, ce.event_type,
        TO_CHAR(ce.event_date, 'YYYY-MM-DD') AS event_date,
        ce.start_time::TEXT, ce.end_time::TEXT, ce.description, ce.prize_amount_cents,
        ce.recurring, ce.recurring_days, ce.source_url,
        c.name AS casino_name, c.city, c.state, c.slug AS casino_slug
      FROM casino_events ce
      JOIN casinos c ON c.id = ce.casino_id
      WHERE ${whereClause} AND ce.recurring IS NULL
      ORDER BY ce.event_date ASC, ce.start_time ASC NULLS LAST
    `, params);

    // Get recurring events and expand them
    const recurringParams = [];
    const recurringConditions = ['ce.recurring IS NOT NULL'];

    if (casino_id) {
      recurringParams.push(parseInt(casino_id));
      recurringConditions.push(`ce.casino_id = $${recurringParams.length}`);
    } else if (regionDef) {
      recurringParams.push(regionDef.states);
      recurringConditions.push(`c.state = ANY($${recurringParams.length})`);
      if (regionDef.city) {
        recurringParams.push(regionDef.city);
        recurringConditions.push(`c.city ILIKE $${recurringParams.length}`);
      }
    }

    const recurringResult = await pool.query(`
      SELECT
        ce.id, ce.casino_id, ce.title, ce.event_type,
        ce.start_time::TEXT, ce.end_time::TEXT, ce.description, ce.prize_amount_cents,
        ce.recurring, ce.recurring_days, ce.source_url,
        c.name AS casino_name, c.city, c.state, c.slug AS casino_slug
      FROM casino_events ce
      JOIN casinos c ON c.id = ce.casino_id
      WHERE ${recurringConditions.join(' AND ')}
    `, recurringParams);

    // Expand recurring events into concrete dates
    const expandedRecurring = [];
    for (const event of recurringResult.rows) {
      const expanded = expandRecurring(event, startDate, endDateStr);
      expandedRecurring.push(...expanded);
    }

    // Merge and sort
    const allEvents = [...oneTimeResult.rows, ...expandedRecurring];
    allEvents.sort((a, b) => {
      if (a.event_date < b.event_date) return -1;
      if (a.event_date > b.event_date) return 1;
      const at = a.start_time || '23:59:59';
      const bt = b.start_time || '23:59:59';
      return at < bt ? -1 : 1;
    });

    res.json(allEvents);
  } catch (err) {
    console.error('/api/events error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/upcoming — next N upcoming events in a region
app.get('/api/events/upcoming', async (req, res) => {
  try {
    const { region, casino_id, limit = 20 } = req.query;
    const limitVal = Math.min(parseInt(limit) || 20, 100);
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toISOString().split('T')[0];

    const regionDef = region && REGIONS[region] ? REGIONS[region] : null;
    const params = [today, futureStr];
    const conditions = ['ce.event_date BETWEEN $1 AND $2'];

    if (casino_id) {
      params.push(parseInt(casino_id));
      conditions.push(`ce.casino_id = $${params.length}`);
    } else if (regionDef) {
      params.push(regionDef.states);
      conditions.push(`c.state = ANY($${params.length})`);
      if (regionDef.city) {
        params.push(regionDef.city);
        conditions.push(`c.city ILIKE $${params.length}`);
      }
    }

    params.push(limitVal);
    const whereClause = conditions.join(' AND ');

    const result = await pool.query(`
      SELECT
        ce.id, ce.casino_id, ce.title, ce.event_type, ce.event_date,
        ce.start_time, ce.end_time, ce.description, ce.prize_amount_cents,
        ce.recurring, ce.source_url,
        c.name AS casino_name, c.city, c.state, c.slug AS casino_slug
      FROM casino_events ce
      JOIN casinos c ON c.id = ce.casino_id
      WHERE ${whereClause}
      ORDER BY ce.event_date ASC, ce.start_time ASC NULLS LAST
      LIMIT $${params.length}
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('/api/events/upcoming error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deal-of-day — best casino promotion today or next 2 days in the region
app.get('/api/deal-of-day', async (req, res) => {
  try {
    const { region } = req.query;
    const regionDef = region && REGIONS[region] ? REGIONS[region] : REGIONS['las-vegas'];
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT ce.title, ce.description, ce.prize_amount_cents, ce.event_type,
             TO_CHAR(ce.event_date, 'YYYY-MM-DD') as event_date,
             ce.start_time::TEXT,
             c.name as casino_name, c.id as casino_id, c.city, c.state, c.image_url
      FROM casino_events ce
      JOIN casinos c ON c.id = ce.casino_id
      WHERE ce.event_date BETWEEN $1 AND ($1::date + interval '2 days')
        AND c.state = ANY($2)
        AND ce.event_type IN ('drawing', 'promotion', 'tournament')
      ORDER BY ce.prize_amount_cents DESC NULLS LAST, ce.event_date ASC
      LIMIT 1
    `, [today, regionDef.states]);

    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/migrate — create schema (one-time, protected by secret)
app.post('/api/migrate', async (req, res) => {
  if (req.headers['x-migrate-secret'] !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { execSync } = require('child_process');
    execSync('node migrate.js', { env: process.env, cwd: __dirname });
    res.json({ success: true, message: 'Migration complete' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/casinos/:id/helpful — record a helpful vote
app.post('/api/casinos/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`
      INSERT INTO casino_helpful_votes (casino_id, voted_at)
      VALUES ($1, NOW())
    `, [id]);
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM casino_helpful_votes WHERE casino_id=$1', [id]
    );
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch(e) {
    // Table may not exist yet — return success anyway, localStorage handles it
    res.json({ success: true, count: null });
  }
});

// GET /api/casinos/helpful-counts — batch fetch all vote counts
// NOTE: must be defined BEFORE /api/casinos/:id to avoid route conflict
app.get('/api/casinos/helpful-counts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT casino_id, COUNT(*) AS count
      FROM casino_helpful_votes
      GROUP BY casino_id
    `);
    const counts = {};
    result.rows.forEach(r => { counts[r.casino_id] = parseInt(r.count); });
    res.json(counts);
  } catch(e) {
    res.json({});
  }
});

// GET /api/locate?lat=&lng= — detect best region from coordinates
app.get('/api/locate', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat/lng required' });

  // State bounding boxes (rough but good enough for region detection)
  const STATE_BOUNDS = {
    NV: { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
    MN: { minLat: 43.5, maxLat: 49.4, minLng: -97.2,  maxLng: -89.5  },
    IA: { minLat: 40.4, maxLat: 43.5, minLng: -96.6,  maxLng: -90.1  },
    IL: { minLat: 36.9, maxLat: 42.5, minLng: -91.5,  maxLng: -87.0  },
    IN: { minLat: 37.8, maxLat: 41.8, minLng: -88.1,  maxLng: -84.8  },
    MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.4,  maxLng: -82.4  },
    WI: { minLat: 42.5, maxLat: 47.1, minLng: -92.9,  maxLng: -86.2  },
    MO: { minLat: 36.0, maxLat: 40.6, minLng: -95.8,  maxLng: -89.1  },
    OH: { minLat: 38.4, maxLat: 42.3, minLng: -84.8,  maxLng: -80.5  },
  };

  const STATE_TO_REGION = {
    NV: lat < 40.5 ? (lng < -116 ? 'las-vegas' : 'las-vegas') : 'reno',
    MN: 'minnesota', IA: 'iowa', IL: 'illinois', IN: 'indiana',
    MI: 'michigan',  WI: 'wisconsin', MO: 'missouri', OH: 'ohio',
  };

  // Las Vegas vs Reno refinement
  const refinedNV = lat < 39.5 ? 'las-vegas' : 'reno';

  for (const [state, bounds] of Object.entries(STATE_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      const region = state === 'NV' ? refinedNV : STATE_TO_REGION[state];
      return res.json({ state, region, label: REGIONS[region]?.label || region });
    }
  }

  // Outside known regions — return closest supported region
  res.json({ state: null, region: 'las-vegas', label: 'Las Vegas, NV', fallback: true });
});

app.listen(PORT, () => {
  console.log(`JackpotMap API server running at http://localhost:${PORT}`);
});
