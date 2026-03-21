// East Coast + Southeast Casino Scraper
// Covers: CT, DE, FL, GA, MA, MD, ME, MS, NC, NH, NJ, NY, PA, RI, SC, VA, WV
// Sources: State gaming commission sites, tribal compact lists, Yelp

'use strict';
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 FindJackpots/1.0 (+https://findjackpots.com)', ...opts.headers },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── CASINO DATA ───────────────────────────────────────────────────────────────
// Compiled from state gaming commission lists, tribal compact records, and public sources

const EAST_COAST_CASINOS = [
  // ── CONNECTICUT ──
  { name: 'Foxwoods Resort Casino', city: 'Mashantucket', state: 'CT', chain: 'Mashantucket Pequot Tribal Nation', address: '350 Trolley Line Blvd', lat: 41.4748, lng: -71.9601, loyalty: 'Foxwoods Rewards', tiers: ['Classic','Silver','Gold','Platinum','Chairman'], bingo: true, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.foxwoods.com' },
  { name: 'Mohegan Sun', city: 'Uncasville', state: 'CT', chain: 'Mohegan Tribe', address: '1 Mohegan Sun Blvd', lat: 41.4901, lng: -72.0876, loyalty: 'Momentum', tiers: ['Momentum','Select','Preferred','Elite','Elevate'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.mohegansun.com' },

  // ── DELAWARE ──
  { name: 'Dover Downs Hotel & Casino', city: 'Dover', state: 'DE', chain: 'Twin River Worldwide Holdings', address: '1131 N Dupont Hwy', lat: 39.1876, lng: -75.5279, loyalty: 'myDover Rewards', tiers: ['Classic','Gold','Platinum','Elite'], bingo: false, poker: false, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.doverdowns.com' },
  { name: 'Harrington Raceway & Casino', city: 'Harrington', state: 'DE', chain: 'Independent', address: '18 W Harrington Ave', lat: 38.9237, lng: -75.5774, loyalty: 'Players Club', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.harringtonraceway.com' },
  { name: 'Delaware Park Casino', city: 'Wilmington', state: 'DE', chain: 'Independent', address: '777 Delaware Park Blvd', lat: 39.6632, lng: -75.5988, loyalty: 'Winners Circle', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: true, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.delawarepark.com' },

  // ── FLORIDA ──
  { name: 'Seminole Hard Rock Hotel & Casino Hollywood', city: 'Hollywood', state: 'FL', chain: 'Seminole Tribe of Florida', address: '1 Seminole Way', lat: 26.0223, lng: -80.1765, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.seminolehardrockhollywood.com' },
  { name: 'Seminole Hard Rock Hotel & Casino Tampa', city: 'Tampa', state: 'FL', chain: 'Seminole Tribe of Florida', address: '5223 Orient Rd', lat: 27.9974, lng: -82.3538, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.seminolehardrocktampa.com' },
  { name: 'Seminole Casino Coconut Creek', city: 'Coconut Creek', state: 'FL', chain: 'Seminole Tribe of Florida', address: '5550 NW 40th St', lat: 26.2812, lng: -80.1829, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.seminolecoconutcreekcasino.com' },
  { name: 'Seminole Casino Brighton', city: 'Okeechobee', state: 'FL', chain: 'Seminole Tribe of Florida', address: '17735 Reservation Rd', lat: 27.2248, lng: -81.0143, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: true, poker: false, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.seminolesbrighton.com' },
  { name: 'Hialeah Park Casino', city: 'Hialeah', state: 'FL', chain: 'Independent', address: '2200 E 4th Ave', lat: 25.8576, lng: -80.2698, loyalty: 'Players Club', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: true, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.hialeahparkracing.com' },
  { name: 'Magic City Casino', city: 'Miami', state: 'FL', chain: 'Independent', address: '450 NW 37th Ave', lat: 25.7799, lng: -80.2365, loyalty: 'Magic Club', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: true, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.magiccitycasino.com' },
  { name: 'Mardi Gras Casino', city: 'Hallandale Beach', state: 'FL', chain: 'Independent', address: '831 N Federal Hwy', lat: 25.9851, lng: -80.1475, loyalty: 'Winners Club', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: true, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.mardigrasflresort.com' },

  // ── MARYLAND ──
  { name: 'MGM National Harbor', city: 'Oxon Hill', state: 'MD', chain: 'MGM Resorts', address: '101 MGM National Ave', lat: 38.7851, lng: -77.0147, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.mgmnationalharbor.com' },
  { name: 'Live! Casino & Hotel Maryland', city: 'Hanover', state: 'MD', chain: 'The Cordish Companies', address: '7002 Arundel Mills Circle', lat: 39.1543, lng: -76.7291, loyalty: 'Live! Rewards', tiers: ['Classic','Silver','Gold','Platinum','Diamond'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.livecasinohotel.com' },
  { name: 'Horseshoe Casino Baltimore', city: 'Baltimore', state: 'MD', chain: 'Caesars Entertainment', address: '1525 Russell St', lat: 39.2705, lng: -76.6301, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: false, hotel: false, parking: false, slots: true, website: 'https://www.caesars.com/horseshoe-baltimore' },
  { name: 'Hollywood Casino Perryville', city: 'Perryville', state: 'MD', chain: 'Penn Entertainment', address: '1201 Chesapeake Overlook Pkwy', lat: 39.5695, lng: -76.0723, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: false, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.hollywoodcasinoperryville.com' },
  { name: 'Rocky Gap Casino Resort', city: 'Flintstone', state: 'MD', chain: 'Evitts Creek LLC', address: '16701 Lakeview Rd NE', lat: 39.7001, lng: -78.6451, loyalty: 'Rocky Gap Rewards', tiers: ['Classic','Silver','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.rockygapcasino.com' },

  // ── MASSACHUSETTS ──
  { name: 'MGM Springfield', city: 'Springfield', state: 'MA', chain: 'MGM Resorts', address: '1 MGM Way', lat: 42.1015, lng: -72.5898, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: true, sports: false, hotel: true, parking: false, slots: true, website: 'https://www.mgmspringfield.com' },
  { name: 'Encore Boston Harbor', city: 'Everett', state: 'MA', chain: 'Wynn Resorts', address: '1 Broadway', lat: 42.3978, lng: -71.0716, loyalty: 'Wynn Rewards', tiers: ['Insider','Silver','Gold','Platinum','Chairman'], bingo: false, poker: false, sports: false, hotel: true, parking: false, slots: true, website: 'https://www.encorebostonharbor.com' },
  { name: 'Plainridge Park Casino', city: 'Plainville', state: 'MA', chain: 'Penn Entertainment', address: '301 Washington St', lat: 42.0048, lng: -71.3384, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: false, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.plainridgepark.com' },

  // ── MISSISSIPPI ──
  { name: 'Beau Rivage Resort & Casino', city: 'Biloxi', state: 'MS', chain: 'MGM Resorts', address: '875 Beach Blvd', lat: 30.3913, lng: -88.9014, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: true, sports: false, hotel: true, parking: false, slots: true, website: 'https://www.beaurivage.com' },
  { name: "IP Casino Resort Spa", city: 'Biloxi', state: 'MS', chain: 'Boyd Gaming', address: '850 Bayview Ave', lat: 30.3958, lng: -88.8889, loyalty: 'B Connected', tiers: ['Classic','Silver','Gold','Platinum','Diamond'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.ipbiloxi.com' },
  { name: 'Hard Rock Hotel & Casino Biloxi', city: 'Biloxi', state: 'MS', chain: 'Hard Rock', address: '777 Beach Blvd', lat: 30.3871, lng: -88.9079, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.hardrockbiloxi.com' },
  { name: 'Scarlet Pearl Casino Resort', city: 'D\'Iberville', state: 'MS', chain: 'Independent', address: '9380 Central Ave', lat: 30.4427, lng: -88.9018, loyalty: 'Scarlet Rewards', tiers: ['Onyx','Ruby','Sapphire','Emerald'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.scarletpearlcasino.com' },
  { name: 'Golden Nugget Biloxi', city: 'Biloxi', state: 'MS', chain: 'Landry\'s Inc', address: '151 Beach Blvd', lat: 30.4002, lng: -88.8827, loyalty: 'Golden Nugget Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.goldennugget.com/biloxi' },
  { name: 'Harrah\'s Gulf Coast', city: 'Biloxi', state: 'MS', chain: 'Caesars Entertainment', address: '280 Beach Blvd', lat: 30.3965, lng: -88.8924, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.caesars.com/harrahs-gulf-coast' },
  { name: 'Gold Strike Casino Resort', city: 'Tunica', state: 'MS', chain: 'MGM Resorts', address: '1010 Casino Center Dr', lat: 34.6846, lng: -90.3688, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.goldstrikemississippi.com' },
  { name: 'Hollywood Casino Tunica', city: 'Tunica', state: 'MS', chain: 'Penn Entertainment', address: '1150 Casino Strip Resort Blvd', lat: 34.7012, lng: -90.3671, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.hollywoodcasinotunica.com' },

  // ── NEW JERSEY ──
  { name: 'Borgata Hotel Casino & Spa', city: 'Atlantic City', state: 'NJ', chain: 'MGM Resorts', address: '1 Borgata Way', lat: 39.3621, lng: -74.4432, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.borgata.com' },
  { name: 'Caesars Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Caesars Entertainment', address: '2100 Pacific Ave', lat: 39.3561, lng: -74.4326, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.caesars.com/caesars-ac' },
  { name: 'Harrah\'s Resort Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Caesars Entertainment', address: '777 Harrahs Blvd', lat: 39.3634, lng: -74.4425, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.caesars.com/harrahs-ac' },
  { name: 'Tropicana Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Bally\'s Corporation', address: '2831 Boardwalk', lat: 39.3530, lng: -74.4306, loyalty: 'Bally Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.tropicana.net' },
  { name: 'Hard Rock Hotel & Casino Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Hard Rock', address: '1000 Boardwalk', lat: 39.3562, lng: -74.4285, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.hardrockhotelatlanticcity.com' },
  { name: 'Ocean Casino Resort', city: 'Atlantic City', state: 'NJ', chain: 'AC Ocean Walk', address: '500 Boardwalk', lat: 39.3595, lng: -74.4284, loyalty: 'Ocean Rewards', tiers: ['Classic','Silver','Gold','Platinum','Diamond'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.theoceanac.com' },
  { name: 'Resorts Casino Hotel', city: 'Atlantic City', state: 'NJ', chain: 'Mohegan Sun / Resorts International', address: '1133 Boardwalk', lat: 39.3590, lng: -74.4267, loyalty: 'Momentum', tiers: ['Momentum','Select','Preferred','Elite','Elevate'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.resortsac.com' },
  { name: 'Golden Nugget Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Landry\'s Inc', address: 'Huron Ave & Brigantine Blvd', lat: 39.3693, lng: -74.4398, loyalty: 'Golden Nugget Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.goldennugget.com/atlantic-city' },
  { name: 'Bally\'s Atlantic City', city: 'Atlantic City', state: 'NJ', chain: 'Bally\'s Corporation', address: 'Park Place & Boardwalk', lat: 39.3561, lng: -74.4299, loyalty: 'Bally Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: false, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.ballysac.com' },

  // ── NEW YORK ──
  { name: 'Resorts World New York City', city: 'Jamaica', state: 'NY', chain: 'Genting Group', address: '110-00 Rockaway Blvd', lat: 40.6748, lng: -73.8322, loyalty: 'Resorts World Rewards', tiers: ['Classic','Select','Preferred','Elite','Chairman'], bingo: false, poker: false, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.rwnewyork.com' },
  { name: 'MGM Empire City Casino', city: 'Yonkers', state: 'NY', chain: 'MGM Resorts', address: '810 Yonkers Ave', lat: 40.9157, lng: -73.8790, loyalty: 'MGM Rewards', tiers: ['Sapphire','Pearl','Gold','Platinum','Noir'], bingo: false, poker: false, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.empirecitycasino.com' },
  { name: 'Turning Stone Resort Casino', city: 'Verona', state: 'NY', chain: 'Oneida Indian Nation', address: '5218 Patrick Rd', lat: 43.0884, lng: -75.5498, loyalty: 'Players Club', tiers: ['Classic','Silver','Gold','Platinum','Elite'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.turningstone.com' },
  { name: 'Seneca Niagara Resort & Casino', city: 'Niagara Falls', state: 'NY', chain: 'Seneca Nation', address: '310 4th St', lat: 43.0941, lng: -79.0567, loyalty: 'Seneca Rewards', tiers: ['Basic','Silver','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.senecaniagaracasino.com' },
  { name: 'Tioga Downs Casino Resort', city: 'Nichols', state: 'NY', chain: 'Delaware North', address: '2384 W River Rd', lat: 42.0299, lng: -76.3649, loyalty: 'Marquee Rewards', tiers: ['Intro','Classic','Premier','Elite'], bingo: false, poker: false, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.tiogadowns.com' },
  { name: 'del Lago Resort & Casino', city: 'Waterloo', state: 'NY', chain: 'DraftKings', address: '1133 State Rte 414', lat: 42.8944, lng: -76.9251, loyalty: 'DraftKings Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: false, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.delagoRresort.com' },
  { name: 'Rivers Casino & Resort Schenectady', city: 'Schenectady', state: 'NY', chain: 'Rush Street Gaming', address: '1 Rush St', lat: 42.8191, lng: -73.9565, loyalty: 'Rush Rewards', tiers: ['Emerald','Sapphire','Ruby','Diamond','Chairman'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.riverscasinoandresort.com' },

  // ── PENNSYLVANIA ──
  { name: 'Rivers Casino Philadelphia', city: 'Philadelphia', state: 'PA', chain: 'Rush Street Gaming', address: '1001 N Delaware Ave', lat: 39.9731, lng: -75.1288, loyalty: 'Rush Rewards', tiers: ['Emerald','Sapphire','Ruby','Diamond','Chairman'], bingo: false, poker: true, sports: true, hotel: false, parking: false, slots: true, website: 'https://www.riverscasino.com/philadelphia' },
  { name: 'Hollywood Casino at Penn National Race Course', city: 'Grantville', state: 'PA', chain: 'Penn Entertainment', address: '777 Hollywood Blvd', lat: 40.4095, lng: -76.6865, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.hollywoodcasinopennracetrack.com' },
  { name: 'Parx Casino', city: 'Bensalem', state: 'PA', chain: 'Greenwood Gaming', address: '2999 Street Rd', lat: 40.0979, lng: -74.9463, loyalty: 'Xclub', tiers: ['Classic','Silver','Gold','Platinum','Diamond'], bingo: false, poker: true, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.parxcasino.com' },
  { name: 'Wind Creek Bethlehem', city: 'Bethlehem', state: 'PA', chain: 'Wind Creek Hospitality', address: '77 Wind Creek Blvd', lat: 40.6150, lng: -75.3698, loyalty: 'Wind Creek Rewards', tiers: ['Club','Select','Preferred','Elite','Executive'], bingo: false, poker: true, sports: true, hotel: true, parking: false, slots: true, website: 'https://www.windcreekbethlehem.com' },
  { name: 'Valley Forge Casino Resort', city: 'King of Prussia', state: 'PA', chain: 'Boyd Gaming', address: '1160 First Ave', lat: 40.0851, lng: -75.3823, loyalty: 'B Connected', tiers: ['Classic','Silver','Gold','Platinum','Diamond'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.vfcasino.com' },
  { name: 'Harrah\'s Philadelphia Casino & Racetrack', city: 'Chester', state: 'PA', chain: 'Caesars Entertainment', address: '777 Harrahs Blvd', lat: 39.8604, lng: -75.3746, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.caesars.com/harrahs-philly' },
  { name: 'Rivers Casino Pittsburgh', city: 'Pittsburgh', state: 'PA', chain: 'Rush Street Gaming', address: '777 Casino Dr', lat: 40.4479, lng: -80.0168, loyalty: 'Rush Rewards', tiers: ['Emerald','Sapphire','Ruby','Diamond','Chairman'], bingo: false, poker: true, sports: true, hotel: false, parking: false, slots: true, website: 'https://www.riverscasino.com/pittsburgh' },

  // ── WEST VIRGINIA ──
  { name: 'Hollywood Casino at Charles Town Races', city: 'Charles Town', state: 'WV', chain: 'Penn Entertainment', address: '750 Hollywood Dr', lat: 39.2889, lng: -77.8609, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.hollywoodcasinocharlesetown.com' },
  { name: 'Mountaineer Casino, Racetrack & Resort', city: 'New Cumberland', state: 'WV', chain: 'Delaware North', address: '1420 Mountaineer Circle', lat: 40.5010, lng: -80.5960, loyalty: 'Marquee Rewards', tiers: ['Intro','Classic','Premier','Elite'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.mountaineercasino.com' },
  { name: 'Mardi Gras Casino & Resort', city: 'Cross Lanes', state: 'WV', chain: 'Delaware North', address: '1 Greyhound Dr', lat: 38.4290, lng: -81.7837, loyalty: 'Marquee Rewards', tiers: ['Intro','Classic','Premier','Elite'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.mardigrasresortandcasino.com' },
  { name: 'The Greenbrier Casino', city: 'White Sulphur Springs', state: 'WV', chain: 'The Greenbrier', address: '300 W Main St', lat: 37.7943, lng: -80.3010, loyalty: 'Greenbrier Rewards', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.greenbrier.com' },

  // ── NORTH CAROLINA ──
  { name: 'Harrah\'s Cherokee Casino Resort', city: 'Cherokee', state: 'NC', chain: 'Caesars Entertainment / EBCI', address: '777 Casino Dr', lat: 35.4878, lng: -83.3101, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: true, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.caesars.com/cherokee' },
  { name: 'Harrah\'s Cherokee Valley River Casino & Hotel', city: 'Murphy', state: 'NC', chain: 'Caesars Entertainment / EBCI', address: '777 Casino Pkwy', lat: 35.0788, lng: -84.0268, loyalty: 'Caesars Rewards', tiers: ['Gold','Platinum','Diamond','Diamond Plus','Diamond Elite'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.caesars.com/cherokee-valley-river' },

  // ── VIRGINIA ──
  { name: 'Rivers Casino Portsmouth', city: 'Portsmouth', state: 'VA', chain: 'Rush Street Gaming', address: '6 Rivers Casino Dr', lat: 36.8360, lng: -76.3480, loyalty: 'Rush Rewards', tiers: ['Emerald','Sapphire','Ruby','Diamond','Chairman'], bingo: false, poker: true, sports: true, hotel: false, parking: true, slots: true, website: 'https://www.riverscasino.com/portsmouth' },
  { name: 'Hard Rock Hotel & Casino Bristol', city: 'Bristol', state: 'VA', chain: 'Hard Rock', address: '500 Volunteer Pkwy', lat: 36.5954, lng: -82.1787, loyalty: 'Hard Rock Rewards', tiers: ['Member','Gold','Platinum','Diamond','Icon'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.hardrockbristol.com' },

  // ── MAINE ──
  { name: 'Hollywood Casino Hotel & Raceway Bangor', city: 'Bangor', state: 'ME', chain: 'Penn Entertainment', address: '500 Main St', lat: 44.8013, lng: -68.7788, loyalty: 'mychoice', tiers: ['Base','Preferred','Elite','Elite Plus'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.hollywoodcasinobangor.com' },
  { name: 'Oxford Casino', city: 'Oxford', state: 'ME', chain: 'Churchill Downs', address: '777 Casino Way', lat: 44.1334, lng: -70.4695, loyalty: 'TwinSpires Rewards', tiers: ['Standard','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: true, parking: true, slots: true, website: 'https://www.oxfordcasino.com' },

  // ── RHODE ISLAND ──
  { name: 'Twin River Casino Hotel', city: 'Lincoln', state: 'RI', chain: 'Bally\'s Corporation', address: '100 Twin River Rd', lat: 41.8957, lng: -71.4525, loyalty: 'Bally Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: true, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.twinriver.com' },
  { name: 'Bally\'s Tiverton Casino & Hotel', city: 'Tiverton', state: 'RI', chain: 'Bally\'s Corporation', address: '777 Tiverton Casino Blvd', lat: 41.6263, lng: -71.2189, loyalty: 'Bally Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: false, sports: true, hotel: true, parking: true, slots: true, website: 'https://www.ballystivertoncasino.com' },

  // ── SOUTH CAROLINA ──
  { name: 'Catawba Two Kings Casino', city: 'Kings Mountain', state: 'SC', chain: 'Catawba Indian Nation', address: '1921 Reservation Rd', lat: 35.2451, lng: -81.3565, loyalty: 'Two Kings Rewards', tiers: ['Standard','Silver','Gold','Platinum'], bingo: false, poker: false, sports: false, hotel: false, parking: true, slots: true, website: 'https://www.catawbatwokings.com' },

  // ── NEW HAMPSHIRE ──
  { name: 'Chasers Poker Room', city: 'Salem', state: 'NH', chain: 'Independent', address: '28 Pelham Rd', lat: 42.7870, lng: -71.2267, loyalty: 'Players Club', tiers: ['Standard','Gold'], bingo: false, poker: true, sports: false, hotel: false, parking: true, slots: false, website: 'https://www.chaserspokerroom.com' },
];

// ── GEOCODING helper ──────────────────────────────────────────────────────────
async function geocode(name, city, state) {
  await sleep(1100);
  const q = encodeURIComponent(`${name}, ${city}, ${state}, USA`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`);
  const data = JSON.parse(res.text);
  if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  return null;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding ${EAST_COAST_CASINOS.length} East Coast casinos...`);
  let inserted = 0, skipped = 0;

  for (const c of EAST_COAST_CASINOS) {
    try {
      // Check if already exists
      const exists = await pool.query(
        'SELECT id FROM casinos WHERE name=$1 AND state=$2', [c.name, c.state]
      );
      if (exists.rows.length > 0) {
        console.log(`⏭  Exists: ${c.name}`);
        skipped++;
        continue;
      }

      // Use hardcoded lat/lng or geocode
      let lat = c.lat, lng = c.lng;
      if (!lat || !lng) {
        const coords = await geocode(c.name, c.city, c.state);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

      await pool.query(`
        INSERT INTO casinos (
          name, slug, chain, city, state, address,
          lat, lng, website,
          loyalty_program_name, loyalty_tiers,
          has_bingo, has_poker, has_sportsbook, has_hotel, free_parking, has_slots
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `, [
        c.name,
        c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + c.state.toLowerCase(),
        c.chain,
        c.city, c.state, c.address,
        lat, lng, c.website,
        c.loyalty, c.tiers,
        c.bingo, c.poker, c.sports, c.hotel, c.parking, c.slots,
      ]);

      console.log(`✓ ${c.name}, ${c.city} ${c.state}`);
      inserted++;
    } catch(e) {
      console.log(`✗ ${c.name}: ${e.message}`);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
