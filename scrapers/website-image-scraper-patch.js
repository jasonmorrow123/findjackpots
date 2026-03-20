#!/usr/bin/env node
/**
 * website-image-scraper-patch.js
 * Second pass — updated/corrected URLs for casinos that failed in first pass.
 */

const { chromium } = require('playwright');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Corrected/alternative URLs based on testing
const CORRECTED_URLS = {
  // Iowa
  'Ameristar Casino Hotel Council Bluffs': 'https://ameristar.com/council-bluffs',
  "Harrah's Council Bluffs Casino Hotel": null, // bot-blocked
  'Horseshoe Council Bluffs': null, // bot-blocked
  'Isle Casino Hotel Bettendorf': 'https://www.islebettendorf.com', // cert issue - try anyway
  'Isle Casino Waterloo': 'https://www.islewaterloo.com', // cert issue
  'Lakeside Casino': 'https://www.lakesidecasino.net',
  'Mystique Casino': 'https://www.mystiquecasino.com',
  'Wild Rose Clinton': 'https://www.wildroseclinton.com',
  'Wild Rose Emmetsburg': 'https://www.wildrosecasino.com',
  'Wild Rose Jefferson': 'https://www.wildrosejefferson.com',
  'WinnaVegas Casino Resort': 'https://www.winnavegascasino.com',

  // Illinois
  'Argosy Casino Alton': 'https://www.hollywoodalton.com',
  'Grand Victoria Casino': 'https://www.pennentertainment.com/casinos/illinois/grand-victoria-casino',
  "Harrah's Joliet Casino Hotel": null, // bot-blocked
  "Harrah's Metropolis Casino": null, // bot-blocked
  "Jumer's Casino Rock Island": 'https://www.jumerscasino.com',
  'Rivers Casino Des Plaines': 'https://www.riverscasino.com', // og:image is relative - handle below

  // Indiana
  'Ameristar Casino East Chicago': 'https://ameristar.com/east-chicago',
  'Caesars Southern Indiana': null, // bot-blocked
  'Four Winds Casino South Bend': 'https://fourwindscasino.com/south-bend',
  'Horseshoe Hammond': null, // bot-blocked
  'Horseshoe Indianapolis': null, // bot-blocked
  'Indiana Grand Racing & Casino': null, // bot-blocked
  'Tropicana Evansville': 'https://www.aztar.com/evansville',

  // Michigan
  'Bay Mills Resort & Casino': 'https://www.baymillscasino.com',
  'Greektown Casino-Hotel': 'https://www.greektowncasino.com', // timeout - try
  'Island Resort & Casino': 'https://www.islandresortcasino.com',
  'Kewadin Casino Christmas': 'https://kewadin.com',
  'Kewadin Casino Hessel': 'https://kewadin.com',
  'Kewadin Casino Manistique': 'https://kewadin.com',
  'Kewadin Casino Sault Ste. Marie': 'https://kewadin.com',
  'Kewadin Casino St. Ignace': 'https://kewadin.com',
  "King's Club Casino": 'https://kewadin.com',
  'MGM Grand Detroit': 'https://www.mgmresorts.com/en/casinos/mgm-grand-detroit.html',
  'MotorCity Casino Hotel': 'https://www.motorcitycasino.com',
  'Turtle Creek Casino & Hotel': 'https://www.turtlecreekcasino.com',
  'Victories Casino Hotel': 'https://www.victoriescasino.com',
  "Zippy's Casino": 'https://zippyscasino.com',

  // Minnesota
  'Black Bear Casino Resort': 'https://blackbearcasinoresort.com',
  'Fortune Bay Resort Casino': 'https://fortunebay.com',
  'Jackpot Junction Casino Hotel': 'https://jackpotjunction.com',
  "Prairie's Edge Casino Resort": 'https://prairiesedgecasino.com',
  'River Road Casino': 'https://redlakegaming.com',
  'Running Aces Casino Hotel': 'https://runningacescasinohotel.com',
  'Shooting Star Casino Hotel': 'https://shootingstarcasino.com',

  // Missouri
  'Ameristar Casino Hotel St. Charles': 'https://ameristar.com/st-charles',
  'Ameristar Casino Kansas City': 'https://ameristar.com/kansas-city',
  'Argosy Casino Hotel & Spa Riverside': 'https://www.argosycasinokc.com',
  "Harrah's North Kansas City Casino Hotel": null, // bot-blocked
  'Isle of Capri Casino Cape Girardeau': 'https://www.peninsulacapirecape.com',
  'Isle of Capri Casino Hotel Boonville': 'https://www.isleofcapricasinoboonville.com',
  'Lady Luck Casino Caruthersville': 'https://www.ladyluckcasinomo.com',
  'Lumiere Place Casino & Hotels': 'https://lumiereplace.com',
  'St. Jo Frontier Casino': 'https://www.stjofrontiercasino.com',
  "Terrible's Casino Casino Aztar": 'https://www.casinoaztar.com',

  // Ohio
  'Hard Rock Rocksino Northfield Park': 'https://www.mgmnorthfieldpark.com',
  'Hollywood Gaming at Dayton Raceway': 'https://www.hollywoodgamingdayton.com',
  'JACK Cincinnati Casino': 'https://jackentertainment.com/cincinnati',
  'MGM Northfield Park': 'https://www.mgmnorthfieldpark.com',

  // Wisconsin
  'Bad River Lodge & Casino': 'https://www.badriver-nsn.gov/casino',
  'Ho-Chunk Casino Hotel & Convention Center': 'https://www.ho-chunkgaming.com/wisdells',
  'Ho-Chunk Gaming Wisconsin Dells': 'https://www.ho-chunkgaming.com/wisdells',
  'Lake of the Torches Resort Casino': 'https://www.lakeofthetorches.com',
  'Mohican North Star Casino': 'https://mohicannorthstar.com',
  'Northern Lights Casino Trego': 'https://www.northernlightscasinotrego.com',
  'Oneida Casino': 'https://oneidacasinohotel.com',
  'Oneida Casino Main': 'https://oneidacasinohotel.com',
  'Oneida Casino Radisson': 'https://oneidacasinohotel.com',
  'Oneida Casino Turning Stone': 'https://oneidacasinohotel.com',
};

// Hard-coded image URLs for casinos where we know the og:image
// (from sites that use relative URLs or have known image paths)
const KNOWN_IMAGES = {
  'Rivers Casino Des Plaines': 'https://www.riverscasino.com/img/og-image.jpg',
  'Kewadin Casino Christmas': 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
  'Kewadin Casino Hessel': 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
  'Kewadin Casino Manistique': 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
  'Kewadin Casino Sault Ste. Marie': 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
  'Kewadin Casino St. Ignace': 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
  "King's Club Casino": 'https://kewadin.com/wp-content/uploads/2018/04/kewadinLogo.png',
};

async function getOgImage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 18000 });
    await page.waitForTimeout(3000);

    const og = await page.$eval(
      'meta[property="og:image"], meta[name="og:image"]',
      el => el.getAttribute('content')
    ).catch(() => null);

    if (og) {
      if (og.startsWith('http')) return og;
      if (og.startsWith('//')) return 'https:' + og;
      // Relative URL — resolve against page's final URL
      try {
        return new URL(og, page.url()).href;
      } catch (_) { }
    }

    const tw = await page.$eval(
      'meta[name="twitter:image"], meta[property="twitter:image"], meta[name="twitter:image:src"]',
      el => el.getAttribute('content')
    ).catch(() => null);
    if (tw && tw.startsWith('http')) return tw;

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const { rows: casinos } = await pool.query(
    "SELECT id, name, state FROM casinos WHERE image_url IS NULL AND state != 'NV' ORDER BY state, name"
  );

  console.log(`\n🎰 Second pass: ${casinos.length} casinos still without images\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  let found = 0;
  let notFound = 0;
  let skipped = 0;
  const urlImageCache = {};

  for (const casino of casinos) {
    // Check known image first
    if (KNOWN_IMAGES[casino.name]) {
      const imageUrl = KNOWN_IMAGES[casino.name];
      await pool.query('UPDATE casinos SET image_url = $1 WHERE id = $2', [imageUrl, casino.id]);
      console.log(`✓ ${casino.name} (${casino.state}) [known] — ${imageUrl.substring(0, 80)}`);
      found++;
      continue;
    }

    const websiteUrl = CORRECTED_URLS[casino.name];
    if (websiteUrl === null) {
      console.log(`⊘ ${casino.name} (${casino.state}) — skipped (bot-protected)`);
      skipped++;
      continue;
    }
    if (!websiteUrl) {
      console.log(`⚠  ${casino.name} (${casino.state}) — no corrected URL`);
      skipped++;
      continue;
    }

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

    await sleep(1200);
  }

  await browser.close();
  await pool.end();

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Patch done!`);
  console.log(`   ✓ Images found:    ${found}`);
  console.log(`   ✗ No image:        ${notFound}`);
  console.log(`   ⊘ Skipped:         ${skipped}`);
  console.log(`   Total:             ${casinos.length}`);
  console.log(`─────────────────────────────────────────────────────\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
