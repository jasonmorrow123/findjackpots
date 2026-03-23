process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nodemailer = require('/Users/jasonmorrow/.openclaw/workspace/node_modules/nodemailer');
const Imap = require('/Users/jasonmorrow/.openclaw/workspace/node_modules/imap');
const { Pool } = require('pg');

// Load credentials from env vars (set in production) or fall back to local .env.local
try {
  if (!process.env.DATABASE_URL || !process.env.SMTP_PASS) {
    require('fs').readFileSync(__dirname + '/.env.local', 'utf8')
      .split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) process.env[k.trim()] = v.join('=').trim();
      });
  }
} catch (_) {}

const DB_URL = process.env.DATABASE_URL;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_USER = process.env.SMTP_USER || 'admin@findjackpots.com';

if (!DB_URL) { console.error('Missing DATABASE_URL env var'); process.exit(1); }
if (!SMTP_PASS) { console.error('Missing SMTP_PASS env var'); process.exit(1); }

const SMTP_CONFIG = {
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
};

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

function formatAmount(cents) {
  const dollars = Math.floor(cents / 100);
  return '$' + dollars.toLocaleString('en-US');
}

function buildHTML(jackpot, subscriber) {
  const { machine_name, amount_cents, casino_name, city, state } = jackpot;
  const { email, region } = subscriber;

  const amount = formatAmount(amount_cents);
  const playerLabel = 'A lucky player';
  const casinoLocation = [city, state].filter(Boolean).join(', ');
  const ctaUrl = region
    ? `https://findjackpots.com?region=${encodeURIComponent(region)}`
    : 'https://findjackpots.com';
  const unsubUrl = `https://findjackpots.com/unsubscribe?email=${encodeURIComponent(email)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Today's Biggest Jackpot — FindJackpots</title>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#5c7aaa;padding:28px 32px;text-align:center;">
            <div style="font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">🎰 FindJackpots</div>
            <div style="font-size:13px;color:#c8d8f0;margin-top:6px;letter-spacing:0.5px;">Find Your Next Casino</div>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 32px 20px;text-align:center;">
            <div style="font-size:56px;line-height:1;">🏆</div>
            <h1 style="margin:16px 0 8px;font-size:24px;color:#1a1a2e;font-weight:bold;">Today's Biggest Jackpot</h1>
            <p style="margin:0;color:#666;font-size:15px;">${playerLabel} hit it big!</p>
          </td>
        </tr>

        <!-- Winner Card -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:32px;text-align:center;">
                  <div style="font-size:48px;font-weight:bold;color:#f2c94c;letter-spacing:-1px;">${amount}</div>
                  <div style="color:#e0e0e0;font-size:16px;margin-top:10px;font-weight:500;">${machine_name || 'Slot Machine'}</div>
                  <div style="color:#a0b4cc;font-size:14px;margin-top:6px;">${casino_name}${casinoLocation ? ' · ' + casinoLocation : ''}</div>
                </td>
              </tr>
              <tr>
                <td style="background:#f2c94c;padding:6px;text-align:center;">
                  <span style="font-size:12px;font-weight:bold;color:#1a1a2e;letter-spacing:1px;text-transform:uppercase;">Verified Jackpot Winner</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 36px;text-align:center;">
            <p style="color:#555;font-size:15px;margin:0 0 20px;">Find casinos with the best payouts near you.</p>
            <a href="${ctaUrl}" style="display:inline-block;background:#5c7aaa;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">Find Casinos Near You →</a>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e8e8e8;"></td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;text-align:center;">
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

function buildRaw(subscriber, subject, htmlBody, date) {
  const boundary = 'boundary_' + Date.now();
  return [
    `From: "FindJackpots" <admin@findjackpots.com>`,
    `To: ${subscriber.email}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
    `--${boundary}--`,
  ].join('\r\n');
}

async function saveToSent(imap, raw) {
  return new Promise((resolve) => {
    imap.append(raw, { mailbox: 'Sent', flags: ['\\Seen'] }, (err) => {
      if (err) console.log('  ⚠️  Could not save to Sent:', err.message);
      resolve();
    });
  });
}

async function run() {
  // --- Query DB ---
  const client = await pool.connect();
  let jackpot, subscribers;
  try {
    const jackpotRes = await client.query(`
      SELECT j.machine_name, j.amount_cents, j.source,
             c.name as casino_name, c.city, c.state
      FROM jackpots j
      INNER JOIN casinos c ON j.casino_id = c.id
      WHERE c.name IS NOT NULL AND j.amount_cents >= 50000
      ORDER BY j.amount_cents DESC
      LIMIT 1
    `);

    if (jackpotRes.rows.length === 0) {
      console.log('No qualifying jackpots found. Aborting.');
      await pool.end();
      return;
    }
    jackpot = jackpotRes.rows[0];
    console.log(`\n🏆 Top jackpot: ${formatAmount(jackpot.amount_cents)} at ${jackpot.casino_name}`);

    const subRes = await client.query(`SELECT email, region FROM email_subscribers WHERE active = true`);
    subscribers = subRes.rows;
    console.log(`📬 Subscribers: ${subscribers.length}\n`);
  } finally {
    client.release();
  }

  if (subscribers.length === 0) {
    console.log('No active subscribers. Done.');
    await pool.end();
    return;
  }

  // --- Set up IMAP for Sent folder ---
  const imap = new Imap({
    user: SMTP_USER,
    password: SMTP_PASS,
    host: 'mail.privateemail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });

  await new Promise((resolve) => {
    imap.once('ready', () => {
      imap.openBox('Sent', false, (err) => {
        if (err) console.log('Could not open Sent folder:', err.message);
        resolve();
      });
    });
    imap.once('error', (err) => { console.log('IMAP error:', err.message); resolve(); });
    imap.connect();
  });

  // --- Send emails ---
  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  const subject = '🏆 Today\'s Biggest Jackpot — FindJackpots Daily Alert';
  let sent = 0, failed = 0;

  for (const subscriber of subscribers) {
    try {
      const html = buildHTML(jackpot, subscriber);
      const date = new Date().toUTCString();

      await transporter.sendMail({
        from: '"FindJackpots" <admin@findjackpots.com>',
        to: subscriber.email,
        subject,
        html,
      });
      console.log(`✅ Sent → ${subscriber.email}`);

      await saveToSent(imap, buildRaw(subscriber, subject, html, date));
      sent++;
    } catch (err) {
      console.log(`❌ Failed → ${subscriber.email}: ${err.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 800));
  }

  imap.end();
  await pool.end();
  console.log(`\n📊 Done. Sent: ${sent} | Failed: ${failed}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
