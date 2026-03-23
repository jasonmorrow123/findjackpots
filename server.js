const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const { AFFILIATE_CONFIG } = require('./affiliates');

const app = express();
const PORT = process.env.PORT || 3000;

// DigitalOcean managed Postgres requires SSL with self-signed cert
if (process.env.DATABASE_URL) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
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
  // ── East Coast ───────────────────────────────────────────────────────────────
  'east-coast':     { states: ['CT','DE','FL','MA','MD','ME','MS','NC','NH','NJ','NY','PA','RI','SC','VA','WV'], city: null, label: 'East Coast (All)', emoji: '🗽' },
  'atlantic-city':  { states: ['NJ'], city: 'Atlantic City', label: 'Atlantic City, NJ', emoji: '🎰' },
  'new-jersey':     { states: ['NJ'], city: null, label: 'New Jersey',     emoji: '🏖️' },
  'new-york':       { states: ['NY'], city: null, label: 'New York',        emoji: '🗽' },
  'pennsylvania':   { states: ['PA'], city: null, label: 'Pennsylvania',    emoji: '🔔' },
  'connecticut':    { states: ['CT'], city: null, label: 'Connecticut',     emoji: '⚓' },
  'massachusetts':  { states: ['MA'], city: null, label: 'Massachusetts',   emoji: '🦞' },
  'maryland':       { states: ['MD'], city: null, label: 'Maryland',        emoji: '🦀' },
  'florida':        { states: ['FL'], city: null, label: 'Florida',         emoji: '🌴' },
  'mississippi':    { states: ['MS'], city: null, label: 'Mississippi',     emoji: '🎸' },
  'biloxi':         { states: ['MS'], city: 'Biloxi', label: 'Biloxi, MS',  emoji: '🎲' },
  'west-virginia':  { states: ['WV'], city: null, label: 'West Virginia',   emoji: '⛰️' },
  'north-carolina': { states: ['NC'], city: null, label: 'North Carolina',  emoji: '🏔️' },
  'virginia':       { states: ['VA'], city: null, label: 'Virginia',        emoji: '🌿' },
  'delaware':       { states: ['DE'], city: null, label: 'Delaware',        emoji: '🏛️' },
  'rhode-island':   { states: ['RI'], city: null, label: 'Rhode Island',    emoji: '⚓' },
  'maine':          { states: ['ME'], city: null, label: 'Maine',           emoji: '🦞' },
  'south-carolina': { states: ['SC'], city: null, label: 'South Carolina',  emoji: '🌴' },
  'new-hampshire':  { states: ['NH'], city: null, label: 'New Hampshire',   emoji: '🍁' },
};

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve service worker
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));

// Serve manifest and icons
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.get('/logo.svg', (req, res) => res.sendFile(path.join(__dirname, 'logo.svg')));
app.get('/logo-icon.svg', (req, res) => res.sendFile(path.join(__dirname, 'logo-icon.svg')));
// Privacy Policy
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — FindJackpots</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 8px; }
    h2 { font-size: 1.2rem; margin-top: 32px; color: #5c7aaa; }
    a { color: #5c7aaa; }
    .back { display: inline-block; margin-bottom: 32px; color: #5c7aaa; text-decoration: none; font-size: 0.9rem; }
    footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #888; }
  </style>
</head>
<body>
  <a class="back" href="/">← Back to FindJackpots</a>
  <h1>Privacy Policy</h1>
  <p><strong>Last updated: March 22, 2026</strong></p>
  <p>FindJackpots ("we," "us," or "our") operates findjackpots.com. This Privacy Policy explains how we collect, use, and protect your information when you use our website.</p>

  <h2>Information We Collect</h2>
  <p>We may collect the following types of information:</p>
  <ul>
    <li><strong>Location data:</strong> With your permission, we use your geographic location to show nearby casinos and relevant jackpot winners. You may deny location access at any time.</li>
    <li><strong>Usage data:</strong> We collect anonymous data about how you use our site (pages visited, region selected, search queries) to improve our service.</li>
    <li><strong>Submitted content:</strong> If you submit a jackpot win report, we collect the information you provide (casino name, machine, amount, optional photo).</li>
    <li><strong>Push notification tokens:</strong> If you enable push notifications, we store a device token to send you alerts.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>To provide location-relevant casino and jackpot information</li>
    <li>To improve our platform and user experience</li>
    <li>To send push notifications you have opted into</li>
    <li>To display relevant advertising via Google AdSense</li>
  </ul>

  <h2>Third-Party Services</h2>
  <p>We use the following third-party services that may collect data:</p>
  <ul>
    <li><strong>Google AdSense:</strong> Displays advertising on our site. Google may use cookies to serve ads based on your interests. See <a href="https://policies.google.com/privacy" target="_blank">Google's Privacy Policy</a>.</li>
    <li><strong>Yelp:</strong> We use Yelp data to display restaurant information for casinos.</li>
    <li><strong>ipapi.co:</strong> Used for approximate location detection when GPS is not available.</li>
  </ul>

  <h2>Cookies</h2>
  <p>We use cookies and localStorage to remember your region preference, location, and notification settings. We do not sell your personal data to third parties.</p>

  <h2>Affiliate Links</h2>
  <p>Some links on FindJackpots are affiliate links. If you click and make a purchase or sign up, we may earn a commission at no extra cost to you. We only link to reputable casino and gaming brands.</p>

  <h2>Data Retention</h2>
  <p>We retain submitted win reports and usage data for up to 2 years. You may request deletion of your data by contacting us.</p>

  <h2>Children's Privacy</h2>
  <p>FindJackpots is intended for adults 21 and older. We do not knowingly collect data from anyone under 18.</p>

  <h2>Contact Us</h2>
  <p>Questions about this Privacy Policy? Contact us at <a href="mailto:admin@findjackpots.com">admin@findjackpots.com</a>.</p>

  <footer>
    <p>&copy; 2026 FindJackpots · <a href="/">Home</a> · <a href="/terms">Terms of Use</a></p>
  </footer>
</body>
</html>`);
});

// Terms of Use
app.get('/terms', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Use — FindJackpots</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 8px; }
    h2 { font-size: 1.2rem; margin-top: 32px; color: #5c7aaa; }
    a { color: #5c7aaa; }
    .back { display: inline-block; margin-bottom: 32px; color: #5c7aaa; text-decoration: none; font-size: 0.9rem; }
    footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #888; }
  </style>
</head>
<body>
  <a class="back" href="/">← Back to FindJackpots</a>
  <h1>Terms of Use</h1>
  <p><strong>Last updated: March 22, 2026</strong></p>
  <p>By using FindJackpots (findjackpots.com), you agree to these Terms of Use. Please read them carefully.</p>

  <h2>Use of the Site</h2>
  <p>FindJackpots is an informational platform for adults 21 and older. You may use this site only for lawful purposes and in accordance with these terms. You agree not to scrape, copy, or redistribute our data without written permission.</p>

  <h2>Accuracy of Information</h2>
  <p>We strive to provide accurate casino, jackpot, and promotional information, but we make no warranties about the completeness or accuracy of the data. Always verify promotions and details directly with the casino before making decisions.</p>

  <h2>Gambling Disclaimer</h2>
  <p>FindJackpots does not promote or encourage gambling. We provide comparison and informational tools only. Gambling involves financial risk. Please gamble responsibly. If you have a gambling problem, contact the National Problem Gambling Helpline at 1-800-522-4700.</p>

  <h2>Affiliate Disclosure</h2>
  <p>FindJackpots participates in affiliate marketing programs. Some links may result in us earning a commission if you sign up or make a purchase. This does not affect our editorial independence.</p>

  <h2>User-Submitted Content</h2>
  <p>By submitting a jackpot win report, you grant FindJackpots a non-exclusive license to display that content on our platform. You confirm the information is accurate to the best of your knowledge.</p>

  <h2>Limitation of Liability</h2>
  <p>FindJackpots is not liable for any losses or damages arising from your use of this site or reliance on information provided here.</p>

  <h2>Changes to Terms</h2>
  <p>We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.</p>

  <h2>Contact</h2>
  <p>Questions? Email us at <a href="mailto:admin@findjackpots.com">admin@findjackpots.com</a>.</p>

  <footer>
    <p>&copy; 2026 FindJackpots · <a href="/">Home</a> · <a href="/privacy">Privacy Policy</a></p>
  </footer>
</body>
</html>`);
});

// ads.txt for AdSense
app.get('/ads.txt', (req, res) => {
  res.type('text/plain');
  res.send('google.com, pub-1953658342958950, DIRECT, f08c47fec0942fa0\n');
});

app.get('/googleb0ba27dead70807a.html', (req, res) => {
  res.send('google-site-verification: googleb0ba27dead70807a.html');
});

// Sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, city, state FROM casinos ORDER BY id LIMIT 1000`);
    const base = 'https://findjackpots.com';
    const today = new Date().toISOString().split('T')[0];
    let urls = `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>\n`;
    for (const c of result.rows) {
      const slug = encodeURIComponent(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      urls += `  <url><loc>${base}/casino/${c.id}/${slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

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

// GET /api/winner-of-day — best jackpot with real casino details, location-aware
// Accepts optional ?lat=&lng= to find the nearest winner first.
// Scope: "local" (≤200 mi) → "regional" (≤500 mi) → "national" (anywhere)
app.get('/api/winner-of-day', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const hasLocation = !isNaN(lat) && !isNaN(lng);

  // Haversine distance expression in miles (GREATEST/LEAST clamps acos domain).
  // Returns NULL when no user location provided so the column always exists.
  const distanceExpr = hasLocation
    ? `(3959 * acos(GREATEST(-1.0, LEAST(1.0,
        cos(radians(${lat})) * cos(radians(c.lat)) *
        cos(radians(c.lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(c.lat))
      ))))`
    : 'NULL::numeric';

  // Build query with optional max-distance filter.
  // Always INNER JOINs casinos, always requires amount_cents >= $500.
  // Priority: has machine_name first, then biggest amount.
  // Build query with optional max-distance and max-age filters.
  // Recency-first: prefer recent wins, then fall back to older/bigger ones.
  const buildQuery = (maxMiles = null, maxAgeDays = null) => {
    const distanceFilter = (hasLocation && maxMiles != null)
      ? `AND ${distanceExpr} <= ${maxMiles}`
      : '';
    const ageFilter = maxAgeDays != null
      ? `AND COALESCE(j.won_at, j.created_at) >= NOW() - INTERVAL '${maxAgeDays} days'`
      : '';
    return `
      SELECT
        j.machine_name,
        j.amount_cents,
        COALESCE(j.won_at, j.created_at) AS win_date,
        j.source,
        j.raw_text,
        c.name AS casino_name,
        c.city,
        c.state,
        ${distanceExpr} AS distance_miles
      FROM jackpots j
      INNER JOIN casinos c ON c.id = j.casino_id
      WHERE c.name IS NOT NULL AND c.name <> ''
        AND j.amount_cents >= 50000
        ${distanceFilter}
        ${ageFilter}
      ORDER BY
        CASE WHEN j.machine_name IS NOT NULL AND j.machine_name <> '' THEN 0 ELSE 1 END,
        j.amount_cents DESC
      LIMIT 1
    `;
  };

  try {
    let result;
    let scope = 'national';

    // Recency-first cascade: 48hrs → 7 days → 30 days → all-time
    // Each tier also tries local → regional → national if location provided
    const timeWindows = [2, 7, 30, null]; // days; null = all-time
    let found = false;

    for (let i = 0; i < timeWindows.length && !found; i++) {
      const days = timeWindows[i];
      if (hasLocation) {
        result = await pool.query(buildQuery(200, days));
        if (result.rows.length > 0) { scope = 'local'; found = true; break; }

        result = await pool.query(buildQuery(500, days));
        if (result.rows.length > 0) { scope = 'regional'; found = true; break; }
      }

      result = await pool.query(buildQuery(null, days));
      if (result.rows.length > 0) { scope = 'national'; found = true; }
    }

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const row = result.rows[0];
    const distMiles = row.distance_miles != null ? Math.round(parseFloat(row.distance_miles)) : null;
    res.json({
      winner_name: null,
      machine_name: row.machine_name || null,
      amount_cents: row.amount_cents,
      casino_name: row.casino_name,
      city: row.city || null,
      state: row.state ? row.state.trim() : null,
      win_date: row.win_date || null,
      source: row.source,
      distance_miles: distMiles,
      scope,
    });
  } catch (err) {
    console.error('/api/winner-of-day error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/casinos/:id/restaurants — restaurants at a specific casino
app.get('/api/casinos/:id/restaurants', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, name, cuisine, category, rating, review_count, price_range, yelp_url
      FROM restaurants
      WHERE casino_id = $1 AND name != '__no_restaurants__'
      ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST
      LIMIT 8
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    // Table may not exist yet
    if (err.message.includes('does not exist')) {
      return res.json([]);
    }
    console.error('/api/casinos/:id/restaurants error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/casinos/:id/restaurant-summary — category summary for tile display
app.get('/api/casinos/:id/restaurant-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM restaurants
      WHERE casino_id = $1 AND name != '__no_restaurants__' AND category IS NOT NULL
      GROUP BY category
      ORDER BY
        CASE category
          WHEN 'Fine Dining' THEN 1
          WHEN 'Casual Dining' THEN 2
          WHEN 'Buffet' THEN 3
          WHEN 'Bar & Lounge' THEN 4
          WHEN 'Quick Bite' THEN 5
          ELSE 6
        END
    `, [id]);
    const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const categories = result.rows.map(r => r.category);
    res.json({ total, categories });
  } catch (err) {
    if (err.message.includes('does not exist')) return res.json({ total: 0, categories: [] });
    console.error('/api/casinos/:id/restaurant-summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurants/batch-summary — batch category summaries for tile display
app.get('/api/restaurants/batch-summary', async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').map(id => parseInt(id)).filter(n => !isNaN(n));
    if (!ids.length) return res.json({});
    const result = await pool.query(`
      SELECT casino_id, category, COUNT(*) as count
      FROM restaurants
      WHERE casino_id = ANY($1) AND name != '__no_restaurants__' AND category IS NOT NULL
      GROUP BY casino_id, category
      ORDER BY casino_id,
        CASE category
          WHEN 'Fine Dining' THEN 1
          WHEN 'Casual Dining' THEN 2
          WHEN 'Buffet' THEN 3
          WHEN 'Bar & Lounge' THEN 4
          WHEN 'Quick Bite' THEN 5
          ELSE 6
        END
    `, [ids]);
    const summary = {};
    for (const id of ids) summary[id] = { total: 0, categories: [] };
    for (const row of result.rows) {
      const s = summary[row.casino_id];
      s.total += parseInt(row.count);
      s.categories.push(row.category);
    }
    res.json(summary);
  } catch (err) {
    if (err.message.includes('does not exist')) {
      const ids = (req.query.ids || '').split(',').map(id => parseInt(id)).filter(n => !isNaN(n));
      const empty = {};
      for (const id of ids) empty[id] = { total: 0, categories: [] };
      return res.json(empty);
    }
    console.error('/api/restaurants/batch-summary error:', err.message);
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

// ─────────────────────────────────────────
// ADMIN ROUTES (simple token auth)
// ─────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'fj-admin-2024';

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Serve admin page
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// GET /api/admin/affiliates — all casinos with affiliate data
app.get('/api/admin/affiliates', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, chain, state, city,
             affiliate_url, affiliate_network, affiliate_network_id,
             affiliate_cpa_cents, affiliate_commission_note,
             affiliate_status, loyalty_program_name, website
      FROM casinos
      ORDER BY
        CASE affiliate_status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
        state, name
    `);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/admin/affiliates/:id — update affiliate data for one casino
app.patch('/api/admin/affiliates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      affiliate_url, affiliate_network, affiliate_network_id,
      affiliate_cpa_cents, affiliate_commission_note, affiliate_status
    } = req.body;
    await pool.query(`
      UPDATE casinos SET
        affiliate_url = $1,
        affiliate_network = $2,
        affiliate_network_id = $3,
        affiliate_cpa_cents = $4,
        affiliate_commission_note = $5,
        affiliate_status = $6
      WHERE id = $7
    `, [affiliate_url, affiliate_network, affiliate_network_id,
        affiliate_cpa_cents, affiliate_commission_note, affiliate_status, id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
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
    NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6,  maxLng: -73.9  },
    NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8,  maxLng: -71.9  },
    PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5,  maxLng: -74.7  },
    CT: { minLat: 40.9, maxLat: 42.1, minLng: -73.7,  maxLng: -71.8  },
    MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5,  maxLng: -69.9  },
    MD: { minLat: 37.9, maxLat: 39.7, minLng: -79.5,  maxLng: -75.0  },
    FL: { minLat: 24.4, maxLat: 31.0, minLng: -87.6,  maxLng: -80.0  },
    MS: { minLat: 30.1, maxLat: 35.0, minLng: -91.7,  maxLng: -88.1  },
    WV: { minLat: 37.2, maxLat: 40.6, minLng: -82.6,  maxLng: -77.7  },
    NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3,  maxLng: -75.5  },
    VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7,  maxLng: -75.2  },
    DE: { minLat: 38.4, maxLat: 39.8, minLng: -75.8,  maxLng: -75.0  },
    RI: { minLat: 41.1, maxLat: 42.0, minLng: -71.9,  maxLng: -71.1  },
    ME: { minLat: 43.0, maxLat: 47.5, minLng: -71.1,  maxLng: -66.9  },
    SC: { minLat: 32.0, maxLat: 35.2, minLng: -83.4,  maxLng: -78.5  },
    NH: { minLat: 42.7, maxLat: 45.3, minLng: -72.6,  maxLng: -70.6  },
  };

  const STATE_TO_REGION = {
    NV: lat < 39.5 ? 'las-vegas' : 'reno',
    MN: 'minnesota', IA: 'iowa',    IL: 'illinois',  IN: 'indiana',
    MI: 'michigan',  WI: 'wisconsin', MO: 'missouri', OH: 'ohio',
    NJ: 'new-jersey',   NY: 'new-york',      PA: 'pennsylvania',
    CT: 'connecticut',  MA: 'massachusetts', MD: 'maryland',
    FL: 'florida',      MS: 'mississippi',   WV: 'west-virginia',
    NC: 'north-carolina', VA: 'virginia',    DE: 'delaware',
    RI: 'rhode-island', ME: 'maine',         SC: 'south-carolina',
    NH: 'new-hampshire',
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

// ─────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────

function buildWelcomeHTML(email) {
  const unsubUrl = `https://findjackpots.com/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to FindJackpots</title>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#5c7aaa;padding:28px 32px;text-align:center;">
            <div>
              <img src="https://findjackpots.com/icons/icon-192.png" alt="FindJackpots" width="36" height="36" style="border-radius:8px;display:inline-block;vertical-align:middle;" />
              <span style="font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;vertical-align:middle;margin-left:10px;">FindJackpots</span>
            </div>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 32px 24px;text-align:center;">
            <div style="font-size:56px;line-height:1;">🎉</div>
            <h1 style="margin:16px 0 12px;font-size:26px;color:#1a1a2e;font-weight:bold;">You're in!</h1>
            <p style="margin:0;color:#555;font-size:16px;line-height:1.6;">Welcome to FindJackpots — your daily source for the biggest casino jackpots, payout data, and deals near you. We're glad you're here.</p>
          </td>
        </tr>

        <!-- What You'll Get -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f9;border-radius:12px;">
              <tr>
                <td style="padding:24px 28px;">
                  <h2 style="margin:0 0 16px;font-size:17px;color:#1a1a2e;font-weight:bold;">What you'll get</h2>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;vertical-align:top;font-size:22px;width:36px;">🏆</td>
                      <td style="padding:8px 0;vertical-align:top;">
                        <span style="color:#1a1a2e;font-size:15px;font-weight:bold;">The biggest casino jackpot of the day</span><br>
                        <span style="color:#666;font-size:14px;">Delivered every morning at 8 AM</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;vertical-align:top;font-size:22px;width:36px;">🎰</td>
                      <td style="padding:8px 0;vertical-align:top;">
                        <span style="color:#1a1a2e;font-size:15px;font-weight:bold;">Casino comparison data</span><br>
                        <span style="color:#666;font-size:14px;">Payouts, bonuses, loyalty programs</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;vertical-align:top;font-size:22px;width:36px;">📍</td>
                      <td style="padding:8px 0;vertical-align:top;">
                        <span style="color:#1a1a2e;font-size:15px;font-weight:bold;">Localized winners</span><br>
                        <span style="color:#666;font-size:14px;">We'll show wins near your area when available</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">Explore Casinos Now →</a>
          </td>
        </tr>

        <!-- About -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e8e8;">
              <tr>
                <td style="padding:24px 0 0;">
                  <p style="color:#666;font-size:14px;line-height:1.7;margin:0;">FindJackpots helps you find the best casinos near you. Compare slot payouts, jackpots, bonuses, and loyalty programs all in one place.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px;">
            <p style="color:#999;font-size:12px;margin:0 0 8px;">You're receiving this because you subscribed at findjackpots.com</p>
            <a href="${unsubUrl}" style="color:#5c7aaa;font-size:12px;text-decoration:underline;">Unsubscribe</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendWelcomeEmail(email) {
  const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'admin@findjackpots.com',
      pass: '13474Coachford!',
    },
  });

  await transporter.sendMail({
    from: '"FindJackpots" <admin@findjackpots.com>',
    to: email,
    subject: 'Welcome to FindJackpots — Your Daily Jackpot Alerts Start Now 🏆',
    html: buildWelcomeHTML(email),
  });

  console.log(`Welcome email sent to ${email}`);
}

// POST /api/subscribe — capture email for daily jackpot alerts
app.post('/api/subscribe', async (req, res) => {
  const { email, region } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO email_subscribers (email, region) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [email.toLowerCase().trim(), region || null]
    );
    // Send welcome email only to new subscribers (not re-subs who conflicted)
    if (result.rowCount > 0) {
      // Send welcome email (async, don't block response)
      sendWelcomeEmail(email.toLowerCase().trim()).catch(err => console.error('Welcome email failed:', err.message));
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('/api/subscribe error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /unsubscribe?email=xxx — one-click unsubscribe
app.get('/unsubscribe', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');
  }
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE email_subscribers SET active = false WHERE email = $1`,
      [email]
    );
  } catch (err) {
    console.error('/unsubscribe error:', err.message);
  } finally {
    client.release();
  }
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribed — FindJackpots</title>
<style>
  body { font-family: Arial, sans-serif; background: #f7f7f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border-radius: 12px; padding: 48px 40px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 400px; }
  h1 { color: #1a1a2e; font-size: 22px; margin: 0 0 12px; }
  p { color: #666; font-size: 15px; margin: 0 0 24px; }
  a { color: #5c7aaa; text-decoration: none; font-size: 14px; }
</style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px;">✅</div>
    <h1>You've been unsubscribed</h1>
    <p>You won't receive any more daily jackpot alerts from FindJackpots.</p>
    <a href="https://findjackpots.com">← Back to FindJackpots</a>
  </div>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`JackpotMap API server running at http://localhost:${PORT}`);
});
