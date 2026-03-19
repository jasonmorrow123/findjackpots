#!/usr/bin/env node
/**
 * games-seeder.js
 * Populates has_bingo, has_poker, has_sportsbook, has_hotel, free_parking
 * for MN, IA, IL, WI, and NV casinos.
 * Re-runnable — uses UPDATE not INSERT.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
});

const GAMES_DATA = [
  // ── MINNESOTA ──────────────────────────────────────────────────────────────
  { name: 'Mystic Lake Casino Hotel', state: 'MN', has_bingo: true, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Little Six Casino', state: 'MN', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Grand Casino Hinckley', state: 'MN', has_bingo: true, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Grand Casino Mille Lacs', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Black Bear Casino Resort', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Fond-du-Luth Casino', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: false },
  { name: 'Shooting Star Casino Hotel', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Seven Clans Casino Red Lake', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Seven Clans Casino Thief River Falls', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Seven Clans Casino Warroad', state: 'MN', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Treasure Island Resort', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Jackpot Junction Casino Hotel', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Fortune Bay Resort Casino', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Northern Lights Casino', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Palace Casino', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'White Oak Casino', state: 'MN', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: "Prairie's Edge Casino Resort", state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Running Aces Casino Hotel', state: 'MN', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Canterbury Park', state: 'MN', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: false, free_parking: true },
  { name: 'River Road Casino', state: 'MN', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Lake Lena Bingo', state: 'MN', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },

  // ── IOWA ───────────────────────────────────────────────────────────────────
  { name: 'Prairie Meadows Racetrack and Casino', state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Meskwaki Bingo Casino Hotel', state: 'IA', has_bingo: true, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Wild Rose Clinton', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Wild Rose Emmetsburg', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Wild Rose Jefferson', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Diamond Jo Casino Dubuque', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Diamond Jo Casino Worth', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: "Harrah's Council Bluffs Casino Hotel", state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Horseshoe Council Bluffs', state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Ameristar Casino Hotel Council Bluffs', state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Hard Rock Hotel & Casino Sioux City', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Riverside Casino & Golf Resort', state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Mystique Casino', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Rhythm City Casino Resort', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Isle Casino Hotel Bettendorf', state: 'IA', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Isle Casino Hotel Marquette', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Isle Casino Waterloo', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Lakeside Casino', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'WinnaVegas Casino Resort', state: 'IA', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Catfish Bend Casino Burlington', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Catfish Bend Casino Fort Madison', state: 'IA', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },

  // ── ILLINOIS ───────────────────────────────────────────────────────────────
  { name: 'Rivers Casino Des Plaines', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: false, free_parking: true },
  { name: 'Hollywood Casino Aurora', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Hollywood Casino Joliet', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: "Harrah's Joliet Casino Hotel", state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: "Harrah's Metropolis Casino", state: 'IL', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Grand Victoria Casino', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Hard Rock Casino Rockford', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: false, free_parking: true },
  { name: 'Casino Queen', state: 'IL', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Argosy Casino Alton', state: 'IL', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Rivers Casino Pittsburgh', state: 'IL', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: false, free_parking: false },

  // ── WISCONSIN ──────────────────────────────────────────────────────────────
  { name: 'Potawatomi Hotel & Casino', state: 'WI', has_bingo: true, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: false },
  { name: 'Ho-Chunk Gaming Wisconsin Dells', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Ho-Chunk Gaming Nekoosa', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Ho-Chunk Gaming Black River Falls', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Oneida Casino', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'Menominee Casino Resort', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Mole Lake Casino Lodge', state: 'WI', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Lake of the Torches Resort Casino', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'St. Croix Casino Turtle Lake', state: 'WI', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'St. Croix Casino Danbury', state: 'WI', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: false, free_parking: true },

  // ── NEVADA ─────────────────────────────────────────────────────────────────
  { name: 'Circus Circus', state: 'NV', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Palace Station Hotel and Casino', state: 'NV', has_bingo: true, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Green Valley Ranch Resort Spa and Casino', state: 'NV', has_bingo: true, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: "Binion's Gambling Hall", state: 'NV', has_bingo: true, has_poker: true, has_sportsbook: false, has_hotel: false, free_parking: true },
  { name: 'South Point Hotel, Casino & Spa', state: 'NV', has_bingo: true, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Suncoast Hotel & Casino', state: 'NV', has_bingo: true, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Gold Coast Hotel & Casino', state: 'NV', has_bingo: true, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: "Sam's Town Hotel & Gambling Hall", state: 'NV', has_bingo: true, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Bellagio', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'MGM Grand Hotel/Casino', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Caesars Palace', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Wynn Las Vegas', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'ARIA Resort & Casino', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'The Venetian Resort Las Vegas', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Golden Nugget Las Vegas', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'El Cortez Hotel & Casino', state: 'NV', has_bingo: false, has_poker: false, has_sportsbook: false, has_hotel: true, free_parking: true },
  { name: 'Circa', state: 'NV', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: true },
  { name: 'Flamingo Las Vegas', state: 'NV', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Luxor Hotel & Casino', state: 'NV', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'Mandalay Bay Resort & Casino', state: 'NV', has_bingo: false, has_poker: false, has_sportsbook: true, has_hotel: true, free_parking: false },
  { name: 'The Cosmopolitan', state: 'NV', has_bingo: false, has_poker: true, has_sportsbook: true, has_hotel: true, free_parking: false },
];

async function run() {
  let updated = 0;
  let notFound = 0;

  for (const entry of GAMES_DATA) {
    // Find the casino with a fuzzy ILIKE match
    const findResult = await pool.query(
      `SELECT id FROM casinos WHERE name ILIKE $1 AND state = $2 LIMIT 1`,
      [`%${entry.name}%`, entry.state]
    );

    if (findResult.rows.length === 0) {
      // Try exact ILIKE without wildcards
      const exactResult = await pool.query(
        `SELECT id FROM casinos WHERE name ILIKE $1 AND state = $2 LIMIT 1`,
        [entry.name, entry.state]
      );
      if (exactResult.rows.length === 0) {
        console.log(`⚠️  Not found: ${entry.name} (${entry.state})`);
        notFound++;
        continue;
      }
      findResult.rows.push(exactResult.rows[0]);
    }

    const casinoId = findResult.rows[0].id;

    await pool.query(
      `UPDATE casinos
       SET has_bingo = $1, has_poker = $2, has_sportsbook = $3,
           has_hotel = $4, free_parking = $5
       WHERE id = $6`,
      [
        entry.has_bingo, entry.has_poker, entry.has_sportsbook,
        entry.has_hotel, entry.free_parking, casinoId,
      ]
    );

    console.log(
      `✓ ${entry.name} — bingo:${entry.has_bingo} poker:${entry.has_poker} ` +
      `sports:${entry.has_sportsbook} hotel:${entry.has_hotel} parking:${entry.free_parking}`
    );
    updated++;
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`✅ Updated: ${updated}   ⚠️  Not found: ${notFound}`);
  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
