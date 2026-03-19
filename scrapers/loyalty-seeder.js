#!/usr/bin/env node
/**
 * loyalty-seeder.js
 * Populates loyalty program data for MN/IA/IL casinos in the JackpotMap DB.
 * Run: node scrapers/loyalty-seeder.js
 */

const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap' });

// Loyalty data map: keyed by [nameLike, state]
// nameLike is matched with ILIKE %name%
const LOYALTY_DATA = [
  // ─────────────── MINNESOTA ───────────────

  // Mystic Lake + Little Six — Club M (4 tiers: Signature, Gold, Platinum, Diamond)
  {
    nameLike: 'Mystic Lake',
    state: 'MN',
    loyalty_program_name: 'Club M',
    loyalty_tiers: ['Signature', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn bonus points on slots and hotel stays',
      'Earn comps at table games',
      'Play free Club M Bingo',
      'Birthday spin and exclusive member promotions',
      'Early access to entertainment ticket sales',
    ],
    loyalty_website: 'https://www.mysticlake.com/club-m',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Little Six',
    state: 'MN',
    loyalty_program_name: 'Club M',
    loyalty_tiers: ['Signature', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn bonus points on slots and hotel stays',
      'Earn comps at table games',
      'Play free Club M Bingo',
      'Birthday spin and exclusive member promotions',
      'Early access to entertainment ticket sales',
    ],
    loyalty_website: 'https://www.mysticlake.com/club-m',
    loyalty_points_per_dollar: null,
  },

  // Grand Casino Hinckley + Mille Lacs — Club Grand
  {
    nameLike: 'Grand Casino Hinckley',
    state: 'MN',
    loyalty_program_name: 'Club Grand',
    loyalty_tiers: ['Club', 'Silver', 'Gold', 'Platinum', 'Black'],
    loyalty_benefits: [
      'Earn points on slots, table games, and hotel stays',
      'Redeem points for free play, dining, and hotel',
      'Tier-based comp multipliers and exclusive promotions',
      'Birthday bonus and anniversary rewards',
      'Priority hotel and entertainment booking for top tiers',
    ],
    loyalty_website: 'https://www.grandcasinomn.com/club-grand',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Grand Casino Mille Lacs',
    state: 'MN',
    loyalty_program_name: 'Club Grand',
    loyalty_tiers: ['Club', 'Silver', 'Gold', 'Platinum', 'Black'],
    loyalty_benefits: [
      'Earn points on slots, table games, and hotel stays',
      'Redeem points for free play, dining, and hotel',
      'Tier-based comp multipliers and exclusive promotions',
      'Birthday bonus and anniversary rewards',
      'Priority hotel and entertainment booking for top tiers',
    ],
    loyalty_website: 'https://www.grandcasinomn.com/club-grand',
    loyalty_points_per_dollar: null,
  },

  // Black Bear Casino + Fond-du-Luth — Bear Rewards (Fond du Lac Band)
  {
    nameLike: 'Black Bear',
    state: 'MN',
    loyalty_program_name: 'Bear Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Diamond'],
    loyalty_benefits: [
      'Earn points on slots, table games, bingo, and hotel',
      'Redeem points for free play and dining credits',
      'Members-only promotions and drawings',
      'Birthday bonus free play offer',
      'Reciprocal play at Fond-du-Luth Casino',
    ],
    loyalty_website: 'https://www.blackbearcasinohotel.com/players-club',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Fond-du-Luth',
    state: 'MN',
    loyalty_program_name: 'Bear Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Diamond'],
    loyalty_benefits: [
      'Earn points on slots, table games, bingo, and hotel',
      'Redeem points for free play and dining credits',
      'Members-only promotions and drawings',
      'Birthday bonus free play offer',
      'Reciprocal play at Black Bear Casino Resort',
    ],
    loyalty_website: 'https://www.blackbearcasinohotel.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Shooting Star Casino — Star Rewards
  {
    nameLike: 'Shooting Star',
    state: 'MN',
    loyalty_program_name: 'Star Rewards',
    loyalty_tiers: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, bingo, and hotel',
      'Redeem for free play, dining, and hotel credits',
      'Exclusive member drawings and promotions',
      'Birthday free play bonus',
      'Points never expire with active membership',
    ],
    loyalty_website: 'https://www.shootingstarcasino.com/rewards',
    loyalty_points_per_dollar: null,
  },

  // Seven Clans Casinos — Seven Stars Rewards (3 properties)
  {
    nameLike: 'Seven Clans Casino Red Lake',
    state: 'MN',
    loyalty_program_name: 'Seven Stars Rewards',
    loyalty_tiers: ['Star', 'Silver Star', 'Gold Star', 'Platinum Star'],
    loyalty_benefits: [
      'Earn points at all three Seven Clans properties',
      'Redeem points for free play, dining, and hotel',
      'Exclusive promotions and drawings for members',
      'Birthday bonus free play',
      'Points valid at Red Lake, Thief River Falls, and Warroad',
    ],
    loyalty_website: 'https://www.sevenclans.com/players-club',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Seven Clans Casino Thief River Falls',
    state: 'MN',
    loyalty_program_name: 'Seven Stars Rewards',
    loyalty_tiers: ['Star', 'Silver Star', 'Gold Star', 'Platinum Star'],
    loyalty_benefits: [
      'Earn points at all three Seven Clans properties',
      'Redeem points for free play, dining, and hotel',
      'Exclusive promotions and drawings for members',
      'Birthday bonus free play',
      'Points valid at Red Lake, Thief River Falls, and Warroad',
    ],
    loyalty_website: 'https://www.sevenclans.com/players-club',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Seven Clans Casino Warroad',
    state: 'MN',
    loyalty_program_name: 'Seven Stars Rewards',
    loyalty_tiers: ['Star', 'Silver Star', 'Gold Star', 'Platinum Star'],
    loyalty_benefits: [
      'Earn points at all three Seven Clans properties',
      'Redeem points for free play, dining, and hotel',
      'Exclusive promotions and drawings for members',
      'Birthday bonus free play',
      'Points valid at Red Lake, Thief River Falls, and Warroad',
    ],
    loyalty_website: 'https://www.sevenclans.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Treasure Island Resort & Casino — Ti Bucks
  {
    nameLike: 'Treasure Island Resort',
    state: 'MN',
    loyalty_program_name: 'Ti Bucks',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn Ti Bucks on slots, table games, and hotel stays',
      'Redeem Ti Bucks for free play, dining, and hotel',
      'Members-only tournaments and drawings',
      'Birthday free play bonus',
      'Tier benefits include resort credit and priority check-in',
    ],
    loyalty_website: 'https://www.treasureislandcasino.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Jackpot Junction Casino Hotel — Club Jackpot
  {
    nameLike: 'Jackpot Junction',
    state: 'MN',
    loyalty_program_name: 'Club Jackpot',
    loyalty_tiers: ['Club', 'Silver', 'Gold', 'Elite'],
    loyalty_benefits: [
      'Earn points on slots, table games, and bingo',
      'Redeem for free play, dining, and hotel credits',
      'Monthly member promotions and drawings',
      'Birthday bonus free play',
      'Points redeemable at all Lower Sioux property outlets',
    ],
    loyalty_website: 'https://www.jackpotjunction.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Fortune Bay Resort Casino — Fortune Club
  {
    nameLike: 'Fortune Bay',
    state: 'MN',
    loyalty_program_name: 'Fortune Club',
    loyalty_tiers: ['Standard', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, table games, golf, and hotel',
      'Redeem for free play, dining, golf credits, and hotel stays',
      'Members-only promotions and slot tournaments',
      'Birthday bonus free play',
      'Resort-wide earning including golf and marina',
    ],
    loyalty_website: 'https://www.fortunebay.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Running Aces Casino Hotel — Aces Rewards
  {
    nameLike: 'Running Aces',
    state: 'MN',
    loyalty_program_name: 'Aces Rewards',
    loyalty_tiers: ['Aces', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, poker, and harness racing',
      'Redeem for free play, dining, and hotel credits',
      'Members-only promotions and drawings',
      'Birthday bonus offer',
      'Points earned on both casino floor and poker room',
    ],
    loyalty_website: 'https://www.runningacescasino.com/players-club',
    loyalty_points_per_dollar: null,
  },

  // Canterbury Park — Canterbury Rewards
  {
    nameLike: 'Canterbury Park',
    state: 'MN',
    loyalty_program_name: 'Canterbury Rewards',
    loyalty_tiers: ['Standard', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on card club play, simulcast wagering, and dining',
      'Redeem for free play, dining, and race wagering credits',
      'Members-only promotions and racing events',
      'Birthday bonus offer',
      'Special earning on live race days',
    ],
    loyalty_website: 'https://www.canterburypark.com/rewards',
    loyalty_points_per_dollar: null,
  },

  // ─────────────── IOWA ───────────────

  // Prairie Meadows — Prairie Gold Rewards (5 tiers confirmed from site)
  {
    nameLike: 'Prairie Meadows',
    state: 'IA',
    loyalty_program_name: 'Prairie Gold Rewards',
    loyalty_tiers: ['Gold', 'Preferred', 'Premier', 'Elite', 'Black'],
    loyalty_benefits: [
      'Earn points on slots, table games, poker, and horse racing',
      'Redeem for free play, dining, and hotel credits',
      'Tier-based comp multipliers up to 5x for Black members',
      'Birthday bonus free play offer',
      'Horse racing simulcast earning included',
    ],
    loyalty_website: 'https://www.prairiemeadows.com/casino/prairie-gold-rewards',
    loyalty_points_per_dollar: 'Varies by tier',
  },

  // Wild Rose Entertainment — Wild Rose Rewards (3 IA properties)
  {
    nameLike: 'Wild Rose Clinton',
    state: 'IA',
    loyalty_program_name: 'Wild Rose Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn points at all Wild Rose Iowa properties',
      'Redeem for free play, dining, and hotel stays',
      'Members-only drawings and slot tournaments',
      'Birthday free play bonus',
      'Points valid at Clinton, Emmetsburg, and Jefferson locations',
    ],
    loyalty_website: 'https://www.wildrosecasinos.com/rewards',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Wild Rose Emmetsburg',
    state: 'IA',
    loyalty_program_name: 'Wild Rose Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn points at all Wild Rose Iowa properties',
      'Redeem for free play, dining, and hotel stays',
      'Members-only drawings and slot tournaments',
      'Birthday free play bonus',
      'Points valid at Clinton, Emmetsburg, and Jefferson locations',
    ],
    loyalty_website: 'https://www.wildrosecasinos.com/rewards',
    loyalty_points_per_dollar: null,
  },
  {
    nameLike: 'Wild Rose Jefferson',
    state: 'IA',
    loyalty_program_name: 'Wild Rose Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    loyalty_benefits: [
      'Earn points at all Wild Rose Iowa properties',
      'Redeem for free play, dining, and hotel stays',
      'Members-only drawings and slot tournaments',
      'Birthday free play bonus',
      'Points valid at Clinton, Emmetsburg, and Jefferson locations',
    ],
    loyalty_website: 'https://www.wildrosecasinos.com/rewards',
    loyalty_points_per_dollar: null,
  },

  // Meskwaki Bingo Casino Hotel — Meskwaki Rewards
  {
    nameLike: 'Meskwaki',
    state: 'IA',
    loyalty_program_name: 'Meskwaki Rewards',
    loyalty_tiers: ['Standard', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, bingo, table games, and hotel',
      'Redeem for free play and dining credits',
      'Members-only promotions and drawings',
      'Birthday bonus free play offer',
      'Bingo session credits for higher tier members',
    ],
    loyalty_website: 'https://www.meskwaki.org/casino/players-club',
    loyalty_points_per_dollar: null,
  },

  // Riverside Casino & Golf Resort — Riverside Rewards
  {
    nameLike: 'Riverside Casino',
    state: 'IA',
    loyalty_program_name: 'Riverside Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, table games, golf, and hotel',
      'Redeem for free play, dining, golf, and hotel credits',
      'Members-only promotions, drawings, and slot tournaments',
      'Birthday bonus free play offer',
      'Golf course earning included for full resort experience',
    ],
    loyalty_website: 'https://www.riversidecasinoiowa.com/rewards',
    loyalty_points_per_dollar: null,
  },

  // Diamond Jo Casino (Penn Entertainment) — mychoice
  {
    nameLike: 'Diamond Jo Casino Dubuque',
    state: 'IA',
    loyalty_program_name: 'mychoice',
    loyalty_tiers: ['Blue', 'Red', 'Silver', 'Gold', 'Noir'],
    loyalty_benefits: [
      'Earn points at all Penn Entertainment properties nationwide',
      'Redeem for free slot play, dining, and hotel at 40+ properties',
      'Tier status earned and redeemable across the entire Penn network',
      'Birthday bonus free play offer',
      'Parking perks: Gold and above get free or priority parking',
    ],
    loyalty_website: 'https://www.mychoice.com',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },
  {
    nameLike: 'Diamond Jo Casino Worth',
    state: 'IA',
    loyalty_program_name: 'mychoice',
    loyalty_tiers: ['Blue', 'Red', 'Silver', 'Gold', 'Noir'],
    loyalty_benefits: [
      'Earn points at all Penn Entertainment properties nationwide',
      'Redeem for free slot play, dining, and hotel at 40+ properties',
      'Tier status earned and redeemable across the entire Penn network',
      'Birthday bonus free play offer',
      'Parking perks: Gold and above get free or priority parking',
    ],
    loyalty_website: 'https://www.mychoice.com',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // Harrah's Council Bluffs (Caesars) — Caesars Rewards
  {
    nameLike: "Harrah's Council Bluffs",
    state: 'IA',
    loyalty_program_name: 'Caesars Rewards',
    loyalty_tiers: ['Gold', 'Platinum', 'Diamond', 'Diamond Plus', 'Diamond Elite'],
    loyalty_benefits: [
      'Earn Reward Credits at all 50+ Caesars properties nationwide',
      'Redeem for free slot play, hotel stays, dining, and shows',
      'Caesars Sportsbook bonus for Diamond and above',
      'Diamond Priority Check-in and dedicated host service',
      'Tier Status matched across all Caesars Entertainment properties',
    ],
    loyalty_website: 'https://www.caesars.com/total-rewards',
    loyalty_points_per_dollar: '1 Reward Credit per $5 coin-in (slots)',
  },

  // Horseshoe Council Bluffs (Caesars) — Caesars Rewards
  {
    nameLike: 'Horseshoe Council Bluffs',
    state: 'IA',
    loyalty_program_name: 'Caesars Rewards',
    loyalty_tiers: ['Gold', 'Platinum', 'Diamond', 'Diamond Plus', 'Diamond Elite'],
    loyalty_benefits: [
      'Earn Reward Credits at all 50+ Caesars properties nationwide',
      'Redeem for free slot play, hotel stays, dining, and shows',
      'Caesars Sportsbook bonus for Diamond and above',
      'Diamond Priority Check-in and dedicated host service',
      'Tier Status matched across all Caesars Entertainment properties',
    ],
    loyalty_website: 'https://www.caesars.com/total-rewards',
    loyalty_points_per_dollar: '1 Reward Credit per $5 coin-in (slots)',
  },

  // Ameristar Council Bluffs (Boyd Gaming) — B Connected
  {
    nameLike: 'Ameristar Casino Hotel Council Bluffs',
    state: 'IA',
    loyalty_program_name: 'B Connected',
    loyalty_tiers: ['Base', 'Preferred', 'Preferred Plus', 'Elite', 'Elite Plus'],
    loyalty_benefits: [
      'Earn points at all 28 Boyd Gaming properties nationwide',
      'Redeem for free slot play, hotel, dining, and entertainment',
      'Free parking at all Boyd properties for all tier levels',
      'Birthday bonus free play and tier milestone bonuses',
      'Shared status across entire Boyd Gaming portfolio',
    ],
    loyalty_website: 'https://www.bconnectedonline.com',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // Hard Rock Hotel & Casino Sioux City — Hard Rock Rewards
  {
    nameLike: 'Hard Rock Hotel & Casino Sioux City',
    state: 'IA',
    loyalty_program_name: 'Hard Rock Rewards',
    loyalty_tiers: ['Member', 'Gold', 'Platinum', 'Diamond', 'Icon'],
    loyalty_benefits: [
      'Earn points on slots, table games, dining, hotel, and merchandise',
      'Redeem for free play, hotel, dining, and exclusive Hard Rock gear',
      'Gold and above receive room upgrade priority and resort credits',
      'Birthday bonus free play offer',
      'Icon tier: fully comped stays, exclusive events, and VIP access',
    ],
    loyalty_website: 'https://www.hardrockcasino.com/rewards',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // ─────────────── ILLINOIS ───────────────

  // Rivers Casino Des Plaines — Rush Rewards
  {
    nameLike: 'Rivers Casino Des Plaines',
    state: 'IL',
    loyalty_program_name: 'Rush Rewards',
    loyalty_tiers: ['Rush', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
    loyalty_benefits: [
      'Earn Rush Rewards points on all slots, table games, and dining',
      'Redeem for free slot play, dining credits, and hotel stays',
      'Tier-based multiplier bonuses up to 10x for Level 5',
      'Birthday bonus free play and exclusive gaming events',
      'Points shared with Grand Victoria Casino (same Rush Street brand)',
    ],
    loyalty_website: 'https://www.riverscasino.com/des-plaines/casino/rush-rewards/',
    loyalty_points_per_dollar: null,
  },

  // Hollywood Casino Aurora (Penn) — mychoice
  {
    nameLike: 'Hollywood Casino Aurora',
    state: 'IL',
    loyalty_program_name: 'mychoice',
    loyalty_tiers: ['Blue', 'Red', 'Silver', 'Gold', 'Noir'],
    loyalty_benefits: [
      'Earn points at all Penn Entertainment properties nationwide',
      'Redeem for free slot play, dining, and hotel at 40+ properties',
      'Tier status earned and redeemable across the entire Penn network',
      'Birthday bonus free play offer',
      'Parking perks: Gold and above get free or priority parking',
    ],
    loyalty_website: 'https://www.mychoice.com',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // Hollywood Casino Joliet (Penn) — mychoice
  {
    nameLike: 'Hollywood Casino Joliet',
    state: 'IL',
    loyalty_program_name: 'mychoice',
    loyalty_tiers: ['Blue', 'Red', 'Silver', 'Gold', 'Noir'],
    loyalty_benefits: [
      'Earn points at all Penn Entertainment properties nationwide',
      'Redeem for free slot play, dining, and hotel at 40+ properties',
      'Tier status earned and redeemable across the entire Penn network',
      'Birthday bonus free play offer',
      'Parking perks: Gold and above get free or priority parking',
    ],
    loyalty_website: 'https://www.mychoice.com',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // Harrah's Joliet (Caesars) — Caesars Rewards
  {
    nameLike: "Harrah's Joliet",
    state: 'IL',
    loyalty_program_name: 'Caesars Rewards',
    loyalty_tiers: ['Gold', 'Platinum', 'Diamond', 'Diamond Plus', 'Diamond Elite'],
    loyalty_benefits: [
      'Earn Reward Credits at all 50+ Caesars properties nationwide',
      'Redeem for free slot play, hotel stays, dining, and shows',
      'Caesars Sportsbook bonus for Diamond and above',
      'Diamond Priority Check-in and dedicated host service',
      'Tier Status matched across all Caesars Entertainment properties',
    ],
    loyalty_website: 'https://www.caesars.com/total-rewards',
    loyalty_points_per_dollar: '1 Reward Credit per $5 coin-in (slots)',
  },

  // Harrah's Metropolis (Caesars) — Caesars Rewards
  {
    nameLike: "Harrah's Metropolis",
    state: 'IL',
    loyalty_program_name: 'Caesars Rewards',
    loyalty_tiers: ['Gold', 'Platinum', 'Diamond', 'Diamond Plus', 'Diamond Elite'],
    loyalty_benefits: [
      'Earn Reward Credits at all 50+ Caesars properties nationwide',
      'Redeem for free slot play, hotel stays, dining, and shows',
      'Caesars Sportsbook bonus for Diamond and above',
      'Diamond Priority Check-in and dedicated host service',
      'Tier Status matched across all Caesars Entertainment properties',
    ],
    loyalty_website: 'https://www.caesars.com/total-rewards',
    loyalty_points_per_dollar: '1 Reward Credit per $5 coin-in (slots)',
  },

  // Grand Victoria Casino (Rush Street) — Rush Rewards
  {
    nameLike: 'Grand Victoria Casino',
    state: 'IL',
    loyalty_program_name: 'Rush Rewards',
    loyalty_tiers: ['Rush', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
    loyalty_benefits: [
      'Earn Rush Rewards points on all slots, table games, and dining',
      'Redeem for free slot play, dining credits, and hotel stays',
      'Tier-based multiplier bonuses up to 10x for Level 5',
      'Birthday bonus free play and exclusive gaming events',
      'Points shared with Rivers Casino Des Plaines (same Rush Street brand)',
    ],
    loyalty_website: 'https://www.grandvictoria-elgin.com/casino/rush-rewards',
    loyalty_points_per_dollar: null,
  },

  // Hard Rock Casino Rockford — Hard Rock Rewards
  {
    nameLike: 'Hard Rock Casino Rockford',
    state: 'IL',
    loyalty_program_name: 'Hard Rock Rewards',
    loyalty_tiers: ['Member', 'Gold', 'Platinum', 'Diamond', 'Icon'],
    loyalty_benefits: [
      'Earn points on slots, table games, dining, hotel, and merchandise',
      'Redeem for free play, hotel, dining, and exclusive Hard Rock gear',
      'Gold and above receive room upgrade priority and resort credits',
      'Birthday bonus free play offer',
      'Icon tier: fully comped stays, exclusive events, and VIP access',
    ],
    loyalty_website: 'https://www.hardrockcasino.com/rewards',
    loyalty_points_per_dollar: '1 point per $5 coin-in (slots)',
  },

  // Casino Queen — Casino Queen Rewards
  {
    nameLike: 'Casino Queen',
    state: 'IL',
    loyalty_program_name: 'Casino Queen Rewards',
    loyalty_tiers: ['Classic', 'Silver', 'Gold', 'Platinum'],
    loyalty_benefits: [
      'Earn points on slots, table games, and dining',
      'Redeem for free play, dining, and hotel credits',
      'Members-only drawings, promotions, and slot tournaments',
      'Birthday bonus free play offer',
      'On-site hotel and RV park redemptions available',
    ],
    loyalty_website: 'https://www.casinoqueen.com/rewards',
    loyalty_points_per_dollar: null,
  },
];

async function run() {
  let updated = 0;
  let notFound = 0;

  for (const entry of LOYALTY_DATA) {
    const { nameLike, state, loyalty_program_name, loyalty_tiers, loyalty_benefits, loyalty_website, loyalty_points_per_dollar } = entry;

    const res = await pool.query(
      `UPDATE casinos
       SET loyalty_program_name = $1,
           loyalty_tiers = $2,
           loyalty_benefits = $3,
           loyalty_website = $4,
           loyalty_points_per_dollar = $5,
           updated_at = now()
       WHERE name ILIKE $6
         AND state = $7
       RETURNING id, name, state`,
      [
        loyalty_program_name,
        loyalty_tiers,
        loyalty_benefits,
        loyalty_website,
        loyalty_points_per_dollar,
        `%${nameLike}%`,
        state,
      ]
    );

    if (res.rows.length > 0) {
      res.rows.forEach(row => {
        console.log(`✓ [${row.state}] ${row.name} → ${loyalty_program_name}`);
        updated++;
      });
    } else {
      console.warn(`✗ No match: "${nameLike}" in ${state}`);
      notFound++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Not found: ${notFound}`);
  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
