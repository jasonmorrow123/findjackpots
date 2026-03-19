/**
 * JackpotMap Push Notifier
 * 
 * Standalone script — run after each scrape cycle to send push notifications
 * for high-value jackpots added in the last 2 hours.
 * 
 * Usage: node push-notifier.js
 */

const { Pool } = require('pg');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
});

// Load VAPID keys
const vapidKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid-keys.json'), 'utf8'));
webpush.setVapidDetails(
  'mailto:data@jackpotmap.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

function formatAmount(cents) {
  const dollars = Math.round(cents / 100);
  return dollars.toLocaleString('en-US');
}

async function deleteSubscription(endpoint) {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  console.log(`  🗑  Removed expired subscription: ${endpoint.slice(0, 60)}...`);
}

async function run() {
  console.log('[push-notifier] Starting push notification check...');

  let newJackpots, subscriptions;

  // 1. Query jackpots added in the last 2 hours with amount >= $10k
  try {
    const result = await pool.query(`
      SELECT
        j.id, j.amount_cents, j.machine_name, j.machine_type,
        j.casino_id, j.created_at,
        c.name AS casino_name, c.city, c.state
      FROM jackpots j
      LEFT JOIN casinos c ON c.id = j.casino_id
      WHERE j.created_at >= NOW() - INTERVAL '2 hours'
        AND j.amount_cents >= 1000000
      ORDER BY j.amount_cents DESC
    `);
    newJackpots = result.rows;
  } catch (err) {
    console.error('[push-notifier] Failed to query jackpots:', err.message);
    await pool.end();
    process.exit(1);
  }

  if (newJackpots.length === 0) {
    console.log('[push-notifier] No high-value jackpots in the last 2 hours. Nothing to send.');
    await pool.end();
    return;
  }

  console.log(`[push-notifier] Found ${newJackpots.length} jackpot(s) to notify about.`);

  // 2. Get all push subscriptions
  try {
    const result = await pool.query(`
      SELECT id, endpoint, p256dh, auth, favorite_casinos, all_alerts, min_amount_cents
      FROM push_subscriptions
    `);
    subscriptions = result.rows;
  } catch (err) {
    console.error('[push-notifier] Failed to query subscriptions:', err.message);
    await pool.end();
    process.exit(1);
  }

  if (subscriptions.length === 0) {
    console.log('[push-notifier] No push subscriptions on file. Nothing to send.');
    await pool.end();
    return;
  }

  console.log(`[push-notifier] ${subscriptions.length} subscriber(s) on file.`);

  let sent = 0;
  let skipped = 0;
  let expired = 0;
  let failed = 0;

  // 3. For each jackpot, notify matching subscribers
  for (const jackpot of newJackpots) {
    const title = `🎰 $${formatAmount(jackpot.amount_cents)} jackpot at ${jackpot.casino_name || 'a casino'}!`;
    const body = `${jackpot.machine_name || 'Slot machine'} — just reported on JackpotMap`;
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      data: {
        jackpotId: jackpot.id,
        casinoId: jackpot.casino_id,
        url: '/',
      },
    });

    console.log(`\n  Jackpot #${jackpot.id}: ${title}`);

    for (const sub of subscriptions) {
      // Check if this subscriber wants this jackpot
      const wantsAll = sub.all_alerts;
      const wantsCasino = sub.favorite_casinos && sub.favorite_casinos.includes(jackpot.casino_id);
      const meetsMinimum = jackpot.amount_cents >= (sub.min_amount_cents || 1000000);

      if (!meetsMinimum || (!wantsAll && !wantsCasino)) {
        skipped++;
        continue;
      }

      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
        console.log(`    ✅ Sent to sub #${sub.id}`);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid — remove from DB
          expired++;
          await deleteSubscription(sub.endpoint);
        } else {
          failed++;
          console.error(`    ❌ Failed to send to sub #${sub.id}: ${err.message}`);
        }
      }
    }
  }

  console.log('\n[push-notifier] Done.');
  console.log(`  ✅ Sent:    ${sent}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  console.log(`  🗑  Expired: ${expired}`);
  console.log(`  ❌ Failed:  ${failed}`);

  await pool.end();
}

run().catch(err => {
  console.error('[push-notifier] Unhandled error:', err);
  pool.end();
  process.exit(1);
});
