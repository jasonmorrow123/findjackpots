#!/usr/bin/env node
/**
 * website-image-scraper.js
 * Fetches og:image meta tags from casino websites and stores them in the DB.
 */

const { chromium } = require('playwright');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Casino website URL map ───────────────────────────────────────────────────
const CASINO_WEBSITES = {
  // ── MINNESOTA ──────────────────────────────────────────────────────────────
  'Mystic Lake Casino Hotel': 'https://www.mysticlake.com',
  'Little Six Casino': 'https://www.mysticlake.com',
  'Grand Casino Hinckley': 'https://www.grandcasinomn.com',
  'Grand Casino Mille Lacs': 'https://www.grandcasinomn.com',
  'Black Bear Casino Resort': 'https://www.blackbearcasinoresort.com',
  'Fond-du-Luth Casino': 'https://www.fondduluthcasino.com',
  'Shooting Star Casino Hotel': 'https://www.shootingstarcasino.com',
  'Seven Clans Casino Red Lake': 'https://www.sevenclans.com',
  'Seven Clans Casino Thief River Falls': 'https://www.sevenclans.com',
  'Seven Clans Casino Warroad': 'https://www.sevenclans.com',
  'Treasure Island Resort & Casino': 'https://www.ticasino.com',
  'Jackpot Junction Casino Hotel': 'https://www.jackpotjunction.com',
  'Fortune Bay Resort Casino': 'https://www.fortunebay.com',
  'Northern Lights Casino': 'https://www.northernlightscasino.com',
  'Palace Casino': 'https://www.palacecasinoresort.com',
  'White Oak Casino': 'https://www.whiteoakcasino.com',
  "Prairie's Edge Casino Resort": 'https://www.prairiesedgecasino.com',
  'Running Aces Casino Hotel': 'https://www.runningaces.com',
  'Canterbury Park': 'https://www.canterburypark.com',
  'River Road Casino': 'https://www.redlakecasinos.com',
  'Lake Lena Bingo': 'https://www.millelacsband.com',

  // ── IOWA ───────────────────────────────────────────────────────────────────
  'Prairie Meadows Racetrack and Casino': 'https://www.prairiemeadows.com',
  'Meskwaki Bingo Casino Hotel': 'https://www.meskwaki.com',
  'Wild Rose Clinton': 'https://www.wildrosecasinos.com/clinton',
  'Wild Rose Emmetsburg': 'https://www.wildrosecasinos.com/emmetsburg',
  'Wild Rose Jefferson': 'https://www.wildrosecasinos.com/jefferson',
  'Diamond Jo Casino Dubuque': 'https://www.diamondjo.com/dubuque',
  'Diamond Jo Casino Worth': 'https://www.diamondjo.com/worth',
  "Harrah's Council Bluffs Casino Hotel": 'https://www.caesars.com/harrahs-council-bluffs',
  'Horseshoe Council Bluffs': 'https://www.caesars.com/horseshoe-council-bluffs',
  'Ameristar Casino Hotel Council Bluffs': 'https://www.ameristar.com/council-bluffs',
  'Hard Rock Hotel & Casino Sioux City': 'https://www.hardrockcasinosiouxcity.com',
  'Riverside Casino & Golf Resort': 'https://www.riversidecasinoandresort.com',
  'Mystique Casino': 'https://www.mystiquecasino.com',
  'Rhythm City Casino Resort': 'https://www.rhythmcitycasino.com',
  'Isle Casino Hotel Bettendorf': 'https://www.islebettendorf.com',
  'Isle Casino Hotel Marquette': 'https://www.hardrockcasinorockford.com',
  'Isle Casino Waterloo': 'https://www.islewaterloo.com',
  'Lakeside Casino': 'https://www.lakesidecasinoosceola.com',
  'WinnaVegas Casino Resort': 'https://www.winnavegascasino.com',
  'Catfish Bend Casino Burlington': 'https://www.catfishbendcasino.com',
  'Catfish Bend Casino Fort Madison': 'https://www.catfishbendcasino.com',

  // ── ILLINOIS ───────────────────────────────────────────────────────────────
  'Rivers Casino Des Plaines': 'https://www.riverscasino.com/des-plaines',
  'Rivers Casino Philadelphia': 'https://www.riverscasino.com/philadelphia',
  'Hollywood Casino Aurora': 'https://www.hollywoodcasinoaurora.com',
  'Hollywood Casino Joliet': 'https://www.hollywoodcasinojoliet.com',
  "Harrah's Joliet Casino Hotel": 'https://www.caesars.com/harrahs-joliet',
  "Harrah's Metropolis Casino": 'https://www.caesars.com/harrahs-metropolis',
  'Grand Victoria Casino': 'https://www.grandvictoriacasino.com',
  'Hard Rock Casino Rockford': 'https://www.hardrockcasinorockford.com',
  'Casino Queen': 'https://www.casinoqueen.com',
  'Argosy Casino Alton': 'https://www.hollywoodalton.com',
  'Par-A-Dice Hotel Casino': 'https://www.paradicecasino.com',
  "Jumer's Casino Rock Island": 'https://www.jumerscasino.com',
  'Elmhurst Casino': 'https://www.windcreekhospitality.com/casino/chicago',
  'Waukegan Temporary Casino': 'https://www.fullhousecasino.com',

  // ── WISCONSIN ──────────────────────────────────────────────────────────────
  'Potawatomi Hotel & Casino': 'https://www.paysbig.com',
  'Ho-Chunk Casino Hotel & Convention Center': 'https://www.ho-chunkgaming.com/wisdells',
  'Ho-Chunk Gaming Wisconsin Dells': 'https://www.ho-chunkgaming.com/wisdells',
  'Ho-Chunk Gaming Nekoosa': 'https://www.ho-chunkgaming.com/nekoosa',
  'Ho-Chunk Gaming Black River Falls': 'https://www.ho-chunkgaming.com/blackriverfalls',
  'Ho-Chunk Gaming Madison': 'https://www.ho-chunkgaming.com/madison',
  'Oneida Casino': 'https://www.oneidacasino.net',
  'Oneida Casino Main': 'https://www.oneidacasino.net',
  'Oneida Casino Radisson': 'https://www.oneidacasino.net',
  'Oneida Casino Turning Stone': 'https://www.oneidacasino.net',
  'Menominee Casino Resort': 'https://www.menomineecasinoresort.com',
  'Mole Lake Casino & Lodge': 'https://www.molelake.com',
  'Lake of the Torches Resort Casino': 'https://www.lakeofthetorches.com',
  'St. Croix Casino Turtle Lake': 'https://www.stcroixcasino.com',
  'St. Croix Casino Danbury': 'https://www.stcroixcasino.com',
  'St. Croix Casino Hertel': 'https://www.stcroixcasino.com',
  'Majestic Pines Casino': 'https://www.majesticpinescasino.com',
  'Rainbow Casino': 'https://www.rbcwin.com',
  'Bad River Lodge & Casino': 'https://www.badriver-nsn.gov/casino',
  'Grindstone Creek Casino': 'https://www.grindstoneinn.com',
  'Northern Lights Casino Trego': 'https://www.nlctrego.com',
  'Potawatomi Carter Casino Hotel': 'https://www.cartercasino.com',
  'Lac du Flambeau Casino': 'https://www.lacduflambeaucasino.com',
  'Island Resort & Casino': 'https://www.islandresortsandcasino.com',
  'LCO Casino Lodge & Convention Center': 'https://www.lcocasino.com',
  'Legendary Waters Resort & Casino': 'https://www.legendarywaters.com',
  'Mohican North Star Casino': 'https://www.mohicannorthstar.com',

  // ── MICHIGAN ───────────────────────────────────────────────────────────────
  'MotorCity Casino Hotel': 'https://www.motorcitycasino.com',
  'MGM Grand Detroit': 'https://www.mgmgranddetroit.com',
  'Greektown Casino-Hotel': 'https://www.greektowncasino.com',
  'FireKeepers Casino Hotel': 'https://www.firekeeperscasino.com',
  'Soaring Eagle Casino & Resort': 'https://www.soaringeaglecasino.com',
  'Little River Casino Resort': 'https://www.littlerivercasinos.com',
  'Gun Lake Casino': 'https://www.gunlakecasino.com',
  'Four Winds Casino Resort New Buffalo': 'https://www.fourwindscasino.com',
  'Four Winds Casino Dowagiac': 'https://www.fourwindscasino.com/dowagiac',
  'Four Winds Casino Hartford': 'https://www.fourwindscasino.com/hartford',
  'Kewadin Casino Christmas': 'https://www.kewadin.com',
  'Kewadin Casino Hessel': 'https://www.kewadin.com',
  'Kewadin Casino Manistique': 'https://www.kewadin.com',
  'Kewadin Casino Sault Ste. Marie': 'https://www.kewadin.com',
  'Kewadin Casino St. Ignace': 'https://www.kewadin.com',
  "King's Club Casino": 'https://www.kewadin.com',
  'Lac Vieux Desert Casino': 'https://www.lvdcasino.com',
  'Leelanau Sands Casino': 'https://www.casino2win.com',
  'Odawa Casino Resort': 'https://www.odawacasino.com',
  'Ojibwa Casino II Marquette': 'https://www.ojibwacasino.com',
  'Ojibwa Casino Resort': 'https://www.ojibwacasino.com',
  'Saganing Eagles Landing Casino': 'https://www.saganing-eagleslanding.com',
  'Turtle Creek Casino & Hotel': 'https://www.turtlecreekcasino.com',
  'Victories Casino Hotel': 'https://www.victoriescasino.com',
  "Zippy's Casino": 'https://www.zippyscasino.com',
  'Bay Mills Resort & Casino': 'https://www.baymills.com',

  // ── MISSOURI ───────────────────────────────────────────────────────────────
  'Lumiere Place Casino & Hotels': 'https://www.lumiereplace.com',
  'Hollywood Casino St. Louis': 'https://www.hollywoodcasinostlouis.com',
  'Ameristar Casino Hotel St. Charles': 'https://www.ameristar.com/st-charles',
  'Ameristar Casino Kansas City': 'https://www.ameristar.com/kansas-city',
  "Harrah's North Kansas City Casino Hotel": 'https://www.caesars.com/harrahs-north-kansas-city',
  'Argosy Casino Hotel & Spa Riverside': 'https://www.argosy-casino.com',
  'Isle of Capri Casino Cape Girardeau': 'https://www.isleofcapricasino.com/cape-girardeau',
  'Isle of Capri Casino Hotel Boonville': 'https://www.isleofcapricasino.com/boonville',
  'Lady Luck Casino Caruthersville': 'https://www.ladyluckcasinomo.com',
  'Mark Twain Casino': 'https://www.markTwaincasino.com',
  'River City Casino': 'https://www.rivercitycasinoandhotel.com',
  'St. Jo Frontier Casino': 'https://www.stjocasino.com',
  "Terrible's Casino Casino Aztar": 'https://www.casinoaztar.com',

  // ── INDIANA ────────────────────────────────────────────────────────────────
  'Horseshoe Hammond': 'https://www.caesars.com/horseshoe-hammond',
  'Ameristar Casino East Chicago': 'https://www.ameristar.com/east-chicago',
  'Hard Rock Casino Northern Indiana': 'https://www.hardrockcasinonorthernindiana.com',
  'Blue Chip Casino Hotel Spa': 'https://www.bluechipcasino.com',
  'Four Winds Casino South Bend': 'https://www.fourwindscasino.com/south-bend',
  'Belterra Casino Resort': 'https://www.belterracasino.com',
  'Rising Star Casino Resort': 'https://www.risingstarcasino.com',
  'Caesars Southern Indiana': 'https://www.caesars.com/caesars-southern-indiana',
  'French Lick Resort Casino': 'https://www.frenchlick.com',
  'Hollywood Casino Lawrenceburg': 'https://www.hollywoodlawrenceburg.com',
  'Horseshoe Indianapolis': 'https://www.caesars.com/horseshoe-indianapolis',
  'Indiana Grand Racing & Casino': 'https://www.indianagrand.com',
  'Tropicana Evansville': 'https://www.tropicana.net/evansville',

  // ── OHIO ───────────────────────────────────────────────────────────────────
  'JACK Cleveland Casino': 'https://www.jackentertainment.com/cleveland',
  'JACK Cincinnati Casino': 'https://www.jackentertainment.com/cincinnati',
  'JACK Thistledown Racino': 'https://www.jackentertainment.com/thistledown',
  'Hollywood Casino Columbus': 'https://www.hollywoodcolumbus.com',
  'Hollywood Casino at Toledo': 'https://www.hollywoodtoledo.com',
  'Hollywood Gaming at Dayton Raceway': 'https://www.hollywooddayton.com',
  'Hollywood Gaming at Mahoning Valley Race Course': 'https://www.hollywoodmahoningvalley.com',
  'MGM Northfield Park': 'https://www.mgmnorthfieldpark.com',
  'Hard Rock Rocksino Northfield Park': 'https://www.mgmnorthfieldpark.com',
  'Hard Rock Casino Cincinnati': 'https://www.hardrockcasinocincinnati.com',
  'Belterra Park Gaming & Entertainment Center': 'https://www.belterrapark.com',
};

// ── Fuzzy name match ─────────────────────────────────────────────────────────
function findUrl(name) {
  // Exact match
  if (CASINO_WEBSITES[name]) return CASINO_WEBSITES[name];

  // Normalize: lowercase, remove punctuation
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const normName = norm(name);

  // Try contains match
  for (const [key, url] of Object.entries(CASINO_WEBSITES)) {
    if (norm(key) === normName) return url;
  }

  // Try partial: DB name contains map key or vice versa
  for (const [key, url] of Object.entries(CASINO_WEBSITES)) {
    const normKey = norm(key);
    if (normName.includes(normKey) || normKey.includes(normName)) return url;
  }

  // Try word overlap score
  const nameWords = new Set(normName.split(' ').filter(w => w.length > 3));
  let best = null, bestScore = 0;
  for (const [key, url] of Object.entries(CASINO_WEBSITES)) {
    const keyWords = norm(key).split(' ').filter(w => w.length > 3);
    const overlap = keyWords.filter(w => nameWords.has(w)).length;
    const score = overlap / Math.max(nameWords.size, keyWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      best = url;
    }
  }
  return best;
}

// ── Extract image from page ──────────────────────────────────────────────────
async function getOgImage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // og:image
    const ogImage = await page.$eval(
      'meta[property="og:image"], meta[name="og:image"]',
      el => el.getAttribute('content')
    ).catch(() => null);
    if (ogImage && (ogImage.startsWith('http') || ogImage.startsWith('//'))) {
      return ogImage.startsWith('//') ? 'https:' + ogImage : ogImage;
    }

    // twitter:image
    const twitterImage = await page.$eval(
      'meta[name="twitter:image"], meta[property="twitter:image"], meta[name="twitter:image:src"]',
      el => el.getAttribute('content')
    ).catch(() => null);
    if (twitterImage && twitterImage.startsWith('http')) return twitterImage;

    // Largest <img>
    const imgs = await page.$$eval('img', imgs =>
      imgs
        .filter(i => i.naturalWidth > 400 && i.naturalHeight > 200)
        .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))
        .map(i => i.src)
        .filter(s => s.startsWith('http'))
    ).catch(() => []);
    if (imgs.length > 0) return imgs[0];

    return null;
  } catch (e) {
    return null;
  }
}

// ── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch all Midwest casinos without image
  const { rows: casinos } = await pool.query(
    "SELECT id, name, state FROM casinos WHERE image_url IS NULL AND state != 'NV' ORDER BY state, name"
  );

  console.log(`\n🎰 Found ${casinos.length} Midwest casinos without images\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let found = 0;
  let notFound = 0;
  let noUrl = 0;

  // Track which URLs we've already visited to reuse images
  const urlImageCache = {};

  for (const casino of casinos) {
    const websiteUrl = findUrl(casino.name);

    if (!websiteUrl) {
      console.log(`⚠  ${casino.name} (${casino.state}) — no website URL mapped`);
      noUrl++;
      continue;
    }

    // Use cached result if we already fetched this URL
    let imageUrl;
    if (urlImageCache[websiteUrl] !== undefined) {
      imageUrl = urlImageCache[websiteUrl];
    } else {
      imageUrl = await getOgImage(page, websiteUrl);
      urlImageCache[websiteUrl] = imageUrl;
    }

    if (imageUrl) {
      try {
        await pool.query('UPDATE casinos SET image_url = $1 WHERE id = $2', [imageUrl, casino.id]);
        console.log(`✓ ${casino.name} (${casino.state}) — ${imageUrl.substring(0, 80)}`);
        found++;
      } catch (dbErr) {
        console.error(`  DB error for ${casino.name}:`, dbErr.message);
      }
    } else {
      console.log(`✗ ${casino.name} (${casino.state}) — no image found`);
      notFound++;
    }

    await sleep(1500);
  }

  await browser.close();
  await pool.end();

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Done!`);
  console.log(`   ✓ Images found:    ${found}`);
  console.log(`   ✗ No image:        ${notFound}`);
  console.log(`   ⚠ No URL mapped:   ${noUrl}`);
  console.log(`   Total processed:   ${casinos.length}`);
  console.log(`   Success rate:      ${Math.round(found / casinos.length * 100)}%`);
  console.log(`─────────────────────────────────────────────────────\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
