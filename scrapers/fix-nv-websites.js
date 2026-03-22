// Fix Nevada casino websites — look up real URLs via Nominatim + known mappings
'use strict';
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Known website mappings for major NV casinos
const KNOWN_WEBSITES = {
  'Bellagio': 'https://www.bellagio.com',
  'MGM Grand': 'https://www.mgmgrand.com',
  'Wynn Las Vegas': 'https://www.wynnlasvegas.com',
  'Encore': 'https://www.wynnlasvegas.com/encore',
  'Venetian Resort': 'https://www.venetianlasvegas.com',
  'The Venetian Resort Las Vegas': 'https://www.venetianlasvegas.com',
  'Palazzo': 'https://www.venetianlasvegas.com',
  'Caesars Palace': 'https://www.caesars.com/caesars-palace',
  'ARIA Resort & Casino': 'https://www.aria.com',
  'ARIA': 'https://www.aria.com',
  'Cosmopolitan of Las Vegas': 'https://www.cosmopolitanlasvegas.com',
  'The Cosmopolitan of Las Vegas': 'https://www.cosmopolitanlasvegas.com',
  'Mandalay Bay': 'https://www.mandalaybay.com',
  'Park MGM': 'https://www.parkmgm.com',
  'New York-New York Hotel & Casino': 'https://www.newyorknewyork.com',
  'New York New York': 'https://www.newyorknewyork.com',
  'Luxor Hotel and Casino': 'https://www.luxor.com',
  'Luxor': 'https://www.luxor.com',
  'Excalibur Hotel & Casino': 'https://www.excalibur.com',
  'Excalibur': 'https://www.excalibur.com',
  'Tropicana Las Vegas': 'https://www.troplv.com',
  'Mirage': 'https://www.mirage.com',
  'The Mirage': 'https://www.mirage.com',
  'Circus Circus': 'https://www.circuscircus.com',
  'Stratosphere Casino Hotel & Tower': 'https://www.thestrat.com',
  'The STRAT Hotel, Casino & Skypod': 'https://www.thestrat.com',
  'The Strat': 'https://www.thestrat.com',
  'Fremont Hotel & Casino': 'https://www.fremontcasino.com',
  'Golden Nugget Las Vegas': 'https://www.goldennugget.com/las-vegas',
  'Golden Nugget': 'https://www.goldennugget.com/las-vegas',
  "Binion's Gambling Hall": 'https://www.binions.com',
  "Binion's": 'https://www.binions.com',
  'El Cortez Hotel & Casino': 'https://www.elcortezhotelcasino.com',
  'Four Queens Hotel and Casino': 'https://www.fourqueens.com',
  'Plaza Hotel & Casino': 'https://www.plazahotelcasino.com',
  'Main Street Station Casino Brewery Hotel': 'https://www.mainstreetcasino.com',
  'California Hotel & Casino': 'https://www.thecal.com',
  'The D Las Vegas': 'https://www.thed.com',
  'Circa Resort & Casino': 'https://www.circalasvegas.com',
  'Circa': 'https://www.circalasvegas.com',
  'Palms Casino Resort': 'https://www.palms.com',
  'Rio All-Suite Hotel & Casino': 'https://www.riolasvegas.com',
  'Rio': 'https://www.riolasvegas.com',
  'Treasure Island': 'https://www.treasureisland.com',
  'Treasure Island - TI Hotel Casino': 'https://www.treasureisland.com',
  'Flamingo Las Vegas': 'https://www.caesars.com/flamingo-las-vegas',
  'Flamingo': 'https://www.caesars.com/flamingo-las-vegas',
  "Harrah's Las Vegas": 'https://www.caesars.com/harrahs-las-vegas',
  "Bally's Las Vegas": 'https://www.caesars.com/ballys-las-vegas',
  'Paris Las Vegas': 'https://www.caesars.com/paris-las-vegas',
  'Paris': 'https://www.caesars.com/paris-las-vegas',
  "Planet Hollywood Resort & Casino": 'https://www.caesars.com/planet-hollywood',
  'Horseshoe Las Vegas': 'https://www.caesars.com/horseshoe-las-vegas',
  'The Linq Hotel + Experience': 'https://www.caesars.com/linq',
  'The Cromwell': 'https://www.caesars.com/cromwell',
  'Nobu Hotel Caesars Palace': 'https://www.caesars.com/caesars-palace',
  'Hard Rock Hotel Las Vegas': 'https://www.hardrockhotel.com',
  'Virgin Hotels Las Vegas': 'https://www.virginhotelslv.com',
  'Resorts World Las Vegas': 'https://www.rwlasvegas.com',
  'Resorts World': 'https://www.rwlasvegas.com',
  'Sahara Las Vegas': 'https://www.saharalasvegas.com',
  'Westgate Las Vegas Resort & Casino': 'https://www.westgateresorts.com/hotels/nevada/las-vegas',
  'SLS Las Vegas': 'https://www.saharalasvegas.com',
  'Vdara Hotel & Spa': 'https://www.vdara.com',
  'Waldorf Astoria Las Vegas': 'https://www.waldorfastorialasvegas.com',
  'Delano Las Vegas': 'https://www.delano.com',
  'Four Seasons Hotel Las Vegas': 'https://www.fourseasons.com/lasvegas',
  'Nobu Hotel': 'https://www.caesars.com/caesars-palace',
  'Red Rock Casino Resort & Spa': 'https://www.redrockresort.com',
  'Red Rock Casino': 'https://www.redrockresort.com',
  'Green Valley Ranch Resort Spa Casino': 'https://www.greenvalleyranch.com',
  'Green Valley Ranch': 'https://www.greenvalleyranch.com',
  'Station Casino Boulder': 'https://www.boulderstation.com',
  'Boulder Station Hotel and Casino': 'https://www.boulderstation.com',
  'Palace Station': 'https://www.palacestation.com',
  'Sunset Station Hotel & Casino': 'https://www.sunsetstation.com',
  'Santa Fe Station Hotel & Casino': 'https://www.santafestation.com',
  'Texas Station Gambling Hall & Hotel': 'https://www.texasstation.com',
  'Fiesta Rancho Casino Hotel': 'https://www.fiestarancho.com',
  'Fiesta Henderson Casino Hotel': 'https://www.fiestahenderson.com',
  'South Point Hotel, Casino & Spa': 'https://www.southpointcasino.com',
  'South Point': 'https://www.southpointcasino.com',
  'Suncoast Hotel and Casino': 'https://www.suncoastcasino.com',
  'Orleans Hotel & Casino': 'https://www.orleanscasino.com',
  'Gold Coast Hotel and Casino': 'https://www.goldcoastcasino.com',
  'Sam\'s Town Hotel & Gambling Hall': 'https://www.samstownlv.com',
  'Sam\'s Town': 'https://www.samstownlv.com',
  'Silverton Casino': 'https://www.silvertoncasino.com',
  'M Resort Spa Casino': 'https://www.themresort.com',
  'M Resort': 'https://www.themresort.com',
  'Aliante Casino Hotel Spa': 'https://www.aliantegaming.com',
  'Cannery': 'https://www.cannerycasino.com',
  'Cannery Casino': 'https://www.cannerycasino.com',
  'Eastside Cannery Casino & Hotel': 'https://www.eastsidecannery.com',
  'Longhorn Casino': 'https://www.longhorncasinolv.com',
  'Arizona Charlie\'s Decatur': 'https://www.arizonacharliesdecatur.com',
  "Arizona Charlie's Boulder": 'https://www.arizonacharliesdecatur.com',
  'Jerry\'s Nugget': 'https://www.jerrysnugget.com',
  'Terrible Herbst': 'https://www.terribleherbst.com',
  'Eureka Casino Resort': 'https://www.eurekamesquite.com',
  'CasaBlanca Resort': 'https://www.casablancaresort.com',
  'Virgin River Hotel/Casino/Bingo': 'https://www.virginriver.com',
  'Peppermill Resort Spa Casino': 'https://www.peppermillreno.com',
  'Atlantis Casino Resort Spa': 'https://www.atlantiscasino.com',
  'Grand Sierra Resort and Casino': 'https://www.grandsierraresort.com',
  'Silver Legacy Resort Casino': 'https://www.silverlegacy.com',
  'Circus Circus Reno': 'https://www.circuscircusreno.com',
  'Eldorado Resort Casino': 'https://www.eldoradoreno.com',
  'Harrah\'s Reno': 'https://www.caesars.com/harrahs-reno',
  'Gold Dust West': 'https://www.gdwcasino.com',
  'Club Fortune Casino': 'https://www.clubfortune.com',
  'Whiskey Pete\'s Hotel & Casino': 'https://www.primm.com',
  'Primm Valley Resort & Casino': 'https://www.primm.com',
  'Buffalo Bill\'s Resort & Casino': 'https://www.primm.com',
  'Aquarius Casino Resort': 'https://www.aquariuscasinoresort.com',
  'Don Laughlin\'s Riverside Resort Hotel & Casino': 'https://www.riversideresort.com',
  'Golden Nugget Laughlin': 'https://www.goldennugget.com/laughlin',
  'Harrah\'s Laughlin': 'https://www.caesars.com/harrahs-laughlin',
  'Edgewater Hotel & Casino': 'https://www.edgewater-casino.com',
  'Colorado Belle Hotel & Casino': 'https://www.coloradobelle.com',
  'Nugget Casino Resort': 'https://www.nuggetcasinoresort.com',
  'Rail City Casino': 'https://www.railcity.com',
  'Sands Regency Casino Hotel': 'https://www.sandsregency.com',
  'Siena Hotel Spa Casino': 'https://www.sienareno.com',
  'Boomtown Reno': 'https://www.boomtownreno.com',
  'Fernley Nugget': 'https://www.ferleynugget.com',
};

async function main() {
  // Get all NV casinos without a website
  const { rows } = await pool.query(
    "SELECT id, name, city FROM casinos WHERE state='NV' AND website IS NULL ORDER BY name"
  );
  console.log(`Found ${rows.length} NV casinos without websites`);

  let updated = 0, skipped = 0;

  for (const c of rows) {
    // Try exact match first
    let website = KNOWN_WEBSITES[c.name];

    // Try partial match
    if (!website) {
      const key = Object.keys(KNOWN_WEBSITES).find(k =>
        c.name.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(c.name.toLowerCase())
      );
      if (key) website = KNOWN_WEBSITES[key];
    }

    if (website) {
      await pool.query('UPDATE casinos SET website=$1 WHERE id=$2', [website, c.id]);
      console.log(`✓ ${c.name} → ${website}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} still missing`);

  // Summary of what's left
  const { rows: remaining } = await pool.query(
    "SELECT COUNT(*) as count FROM casinos WHERE state='NV' AND website IS NULL"
  );
  console.log(`NV casinos still without website: ${remaining[0].count}`);
  const { rows: withSite } = await pool.query(
    "SELECT COUNT(*) as count FROM casinos WHERE state='NV' AND website IS NOT NULL"
  );
  console.log(`NV casinos with website: ${withSite[0].count}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
