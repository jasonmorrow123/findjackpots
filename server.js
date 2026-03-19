const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');
const { AFFILIATE_CONFIG } = require('./affiliates');

const app = express();
const PORT = 3000;

const pool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
});

// Load VAPID keys and configure web-push
const vapidKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid-keys.json'), 'utf8'));
webpush.setVapidDetails(
  'mailto:data@jackpotmap.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use(cors());
app.use(express.json());

// Region definitions
const REGIONS = {
  'las-vegas': { states: ['NV'], city: 'Las Vegas', label: 'Las Vegas, NV', emoji: '🎰' },
  'reno':      { states: ['NV'], city: 'Reno',      label: 'Reno, NV',      emoji: '🎲' },
  'nevada':    { states: ['NV'], city: null,         label: 'All Nevada',    emoji: '🏜️' },
  'midwest':   { states: ['MN','IA','IL','IN','MI','WI','MO','OH','ND','SD','NE','KS','KY'], city: null, label: 'Midwest', emoji: '🌽' },
  'minnesota': { states: ['MN'], city: null, label: 'Minnesota', emoji: '🌲' },
  'iowa':      { states: ['IA'], city: null, label: 'Iowa',      emoji: '🌾' },
  'illinois':  { states: ['IL'], city: null, label: 'Illinois',  emoji: '🏙️' },
  'michigan':  { states: ['MI'], city: null, label: 'Michigan',  emoji: '🚗' },
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

app.listen(PORT, () => {
  console.log(`JackpotMap API server running at http://localhost:${PORT}`);
});
