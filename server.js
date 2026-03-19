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

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve service worker
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));

// GET /api/casinos — casinos with latest review ratings, ordered by review_count DESC
app.get('/api/casinos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.chain, c.city, c.state, c.address, c.lat, c.lng,
        c.phone, c.website, c.has_bingo, c.has_poker, c.has_sportsbook, c.has_hotel, c.free_parking,
        r.rating, r.review_count, r.source AS review_source
      FROM casinos c
      LEFT JOIN LATERAL (
        SELECT rating, review_count, source
        FROM reviews
        WHERE casino_id = c.id
        ORDER BY review_count DESC NULLS LAST
        LIMIT 1
      ) r ON true
      ORDER BY r.review_count DESC NULLS LAST
    `);
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

// GET /api/casinos/:id — single casino with affiliate data
app.get('/api/casinos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.chain, c.city, c.state, c.address, c.lat, c.lng,
        c.phone, c.website, c.has_bingo, c.has_poker, c.has_sportsbook, c.has_hotel, c.free_parking,
        c.affiliate_url, c.affiliate_network, c.affiliate_commission_note,
        r.rating, r.review_count, r.source AS review_source
      FROM casinos c
      LEFT JOIN LATERAL (
        SELECT rating, review_count, source
        FROM reviews
        WHERE casino_id = c.id
        ORDER BY review_count DESC NULLS LAST
        LIMIT 1
      ) r ON true
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
