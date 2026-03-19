#!/usr/bin/env node
// affiliate-seeder.js — Seeds affiliate data into the casinos table
// Run: node affiliate-seeder.js
// Re-run after sign-up to add real affiliate_url values

const { Pool } = require('pg');
const { AFFILIATE_CONFIG } = require('./affiliates');

const pool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
});

async function seed() {
  let totalUpdated = 0;

  for (const config of AFFILIATE_CONFIG) {
    const { chains, slugPatterns, network, commissionNote, placeholderTrackingUrl, status } = config;

    // Build WHERE conditions with $1, $2, ... for find query
    const conditions = [];
    const whereValues = [];
    let idx = 1;

    for (const pattern of slugPatterns) {
      conditions.push(`slug ILIKE $${idx}`);
      whereValues.push(`%${pattern}%`);
      idx++;
    }
    for (const chain of chains) {
      conditions.push(`chain ILIKE $${idx}`);
      whereValues.push(`%${chain}%`);
      idx++;
    }

    if (conditions.length === 0) continue;

    const whereClause = conditions.join(' OR ');

    // First, find matching casinos so we can log them
    const findResult = await pool.query(
      `SELECT id, name, slug, chain FROM casinos WHERE ${whereClause}`,
      whereValues
    );

    if (findResult.rows.length === 0) {
      console.log(`[${network}] No matches for chains: ${chains.join(', ')} / slugs: ${slugPatterns.join(', ')}`);
      continue;
    }

    // affiliate_url is only set if placeholderTrackingUrl exists and status is 'active'
    // For pending_signup: set network + commission note, leave affiliate_url null
    const affiliateUrl = status === 'active' && placeholderTrackingUrl ? placeholderTrackingUrl : null;

    // Build UPDATE query: SET params at $1,$2,$3, WHERE params start at $4
    const updateConditions = [];
    const updateValues = [network, commissionNote, affiliateUrl];
    let updateIdx = 4;

    for (const pattern of slugPatterns) {
      updateConditions.push(`slug ILIKE $${updateIdx}`);
      updateValues.push(`%${pattern}%`);
      updateIdx++;
    }
    for (const chain of chains) {
      updateConditions.push(`chain ILIKE $${updateIdx}`);
      updateValues.push(`%${chain}%`);
      updateIdx++;
    }

    const updateResult = await pool.query(
      `UPDATE casinos
       SET affiliate_network = $1,
           affiliate_commission_note = $2,
           affiliate_url = $3,
           updated_at = NOW()
       WHERE ${updateConditions.join(' OR ')}
       RETURNING id, name, slug`,
      updateValues
    );

    for (const row of updateResult.rows) {
      console.log(`  ✓ Updated: ${row.name} (${row.slug}) → network=${network}, url=${affiliateUrl || 'null (pending_signup)'}`);
    }

    totalUpdated += updateResult.rows.length;
    console.log(`[${network}] Updated ${updateResult.rows.length} casinos for chains: ${chains.join(', ')}\n`);
  }

  console.log(`\n✅ Affiliate seeder done. Total casinos updated: ${totalUpdated}`);

  // Show summary
  const summary = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(affiliate_network) AS with_network,
      COUNT(affiliate_url) AS with_url
    FROM casinos
  `);
  const s = summary.rows[0];
  console.log(`📊 DB summary: ${s.total} total casinos, ${s.with_network} with affiliate network, ${s.with_url} with active affiliate URL`);

  await pool.end();
}

seed().catch(err => {
  console.error('Seeder error:', err.message);
  process.exit(1);
});
