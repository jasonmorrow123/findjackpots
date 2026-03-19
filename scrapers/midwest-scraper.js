#!/usr/bin/env node
// Midwest Casino Scraper & Importer
// Scrapes Iowa, Illinois, and inserts MN + other Midwest casinos

const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap' });

function makeSlug(name, state) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${state.toLowerCase()}`;
}

async function insertCasinos(casinos, state) {
  let inserted = 0, skipped = 0;
  for (const c of casinos) {
    const slug = makeSlug(c.name, state);
    try {
      const res = await pool.query(
        `INSERT INTO casinos (name, slug, chain, address, city, state, has_hotel, license_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [c.name, slug, c.chain || null, c.address || null, c.city || null,
         state, c.has_hotel || false, c.license_type || null]
      );
      if (res.rowCount > 0) { inserted++; console.log(`  ✓ ${c.name} (${c.city})`); }
      else { skipped++; console.log(`  ~ SKIP ${c.name} (slug conflict)`); }
    } catch(e) {
      console.error(`  ✗ ERROR ${c.name}: ${e.message}`);
      skipped++;
    }
  }
  return { inserted, skipped };
}

// ─────────────────────────────────────────────
// MINNESOTA — All Tribal, hardcoded (mn.gov bot-protected)
// ─────────────────────────────────────────────
const MN_CASINOS = [
  { name: "Mystic Lake Casino Hotel", city: "Prior Lake", address: "2400 Mystic Lake Blvd NW", chain: "Shakopee Mdewakanton Sioux Community", has_hotel: true, license_type: "tribal" },
  { name: "Little Six Casino", city: "Prior Lake", address: "2450 Sioux Trail NW", chain: "Shakopee Mdewakanton Sioux Community", has_hotel: false, license_type: "tribal" },
  { name: "Grand Casino Hinckley", city: "Hinckley", address: "777 Lady Luck Drive", chain: "Mille Lacs Band of Ojibwe", has_hotel: true, license_type: "tribal" },
  { name: "Grand Casino Mille Lacs", city: "Onamia", address: "777 Grand Ave", chain: "Mille Lacs Band of Ojibwe", has_hotel: true, license_type: "tribal" },
  { name: "Shooting Star Casino Hotel", city: "Mahnomen", address: "777 SE Casino Road", chain: "White Earth Nation", has_hotel: true, license_type: "tribal" },
  { name: "Seven Clans Casino Red Lake", city: "Red Lake", address: "Highway 1 E", chain: "Red Lake Band of Chippewa", has_hotel: false, license_type: "tribal" },
  { name: "Seven Clans Casino Thief River Falls", city: "Thief River Falls", address: "20595 Center Street E", chain: "Red Lake Band of Chippewa", has_hotel: false, license_type: "tribal" },
  { name: "Seven Clans Casino Warroad", city: "Warroad", address: "1012 E Lake Street", chain: "Red Lake Band of Chippewa", has_hotel: false, license_type: "tribal" },
  { name: "Black Bear Casino Resort", city: "Carlton", address: "1785 Highway 210", chain: "Fond du Lac Band of Lake Superior Chippewa", has_hotel: true, license_type: "tribal" },
  { name: "Fond-du-Luth Casino", city: "Duluth", address: "129 E Superior Street", chain: "Fond du Lac Band of Lake Superior Chippewa", has_hotel: false, license_type: "tribal" },
  { name: "Fortune Bay Resort Casino", city: "Tower", address: "1430 Bois Forte Road", chain: "Bois Forte Band of Chippewa", has_hotel: true, license_type: "tribal" },
  { name: "Prairie's Edge Casino Resort", city: "Granite Falls", address: "5616 Prairie's Edge Lane", chain: "Upper Sioux Community", has_hotel: true, license_type: "tribal" },
  { name: "Jackpot Junction Casino Hotel", city: "Morton", address: "39375 County Highway 24", chain: "Lower Sioux Indian Community", has_hotel: true, license_type: "tribal" },
  { name: "Treasure Island Resort & Casino", city: "Welch", address: "5734 Sturgeon Lake Road", chain: "Prairie Island Indian Community", has_hotel: true, license_type: "tribal" },
  { name: "Palace Casino", city: "Cass Lake", address: "6280 Upper Mile Lacs Lake Road", chain: "Leech Lake Band of Ojibwe", has_hotel: false, license_type: "tribal" },
  { name: "Northern Lights Casino", city: "Walker", address: "6800 Y Frontage Road NW", chain: "Leech Lake Band of Ojibwe", has_hotel: true, license_type: "tribal" },
  { name: "White Oak Casino", city: "Deer River", address: "45830 US Highway 2", chain: "Leech Lake Band of Ojibwe", has_hotel: false, license_type: "tribal" },
  { name: "Lake Lena Bingo", city: "Ogilvie", address: "Lake Lena Road", chain: "Mille Lacs Band of Ojibwe", has_hotel: false, license_type: "tribal" },
  { name: "River Road Casino", city: "Thief River Falls", address: "Highway 32 S", chain: "Red Lake Band of Chippewa", has_hotel: false, license_type: "tribal" },
  { name: "Running Aces Casino Hotel", city: "Columbus", address: "15201 Running Aces Blvd", chain: null, has_hotel: true, license_type: "card_room" },
  { name: "Canterbury Park", city: "Shakopee", address: "1100 Canterbury Road", chain: null, has_hotel: false, license_type: "card_room" },
];

// ─────────────────────────────────────────────
// IOWA — Commercial casinos licensed by IRGC
// ─────────────────────────────────────────────
const IA_CASINOS = [
  { name: "Ameristar Casino Hotel Council Bluffs", city: "Council Bluffs", address: "2200 River Road", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Harrah's Council Bluffs Casino Hotel", city: "Council Bluffs", address: "1 Harrah's Blvd", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Horseshoe Council Bluffs", city: "Council Bluffs", address: "2701 23rd Ave", chain: "Caesars Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Hard Rock Hotel & Casino Sioux City", city: "Sioux City", address: "111 3rd Street", chain: "Hard Rock International", has_hotel: true, license_type: "commercial" },
  { name: "Prairie Meadows Racetrack and Casino", city: "Altoona", address: "1 Prairie Meadows Drive", chain: null, has_hotel: false, license_type: "commercial" },
  { name: "Isle Casino Hotel Marquette", city: "Marquette", address: "13 W Shenandoah Drive", chain: "Vici Properties", has_hotel: true, license_type: "commercial" },
  { name: "Rhythm City Casino Resort", city: "Davenport", address: "7077 Elmore Ave", chain: null, has_hotel: true, license_type: "commercial" },
  { name: "Isle Casino Hotel Bettendorf", city: "Bettendorf", address: "1777 Isle Pkwy", chain: "Vici Properties", has_hotel: true, license_type: "commercial" },
  { name: "Isle Casino Waterloo", city: "Waterloo", address: "777 Isle of Capri Blvd", chain: "Vici Properties", has_hotel: false, license_type: "commercial" },
  { name: "Riverside Casino & Golf Resort", city: "Riverside", address: "3184 Highway 22", chain: null, has_hotel: true, license_type: "commercial" },
  { name: "Lakeside Casino", city: "Osceola", address: "777 Casino Drive", chain: "Full House Resorts", has_hotel: false, license_type: "commercial" },
  { name: "Catfish Bend Casino Burlington", city: "Burlington", address: "3001 Winegard Drive", chain: null, has_hotel: false, license_type: "commercial" },
  { name: "Catfish Bend Casino Fort Madison", city: "Fort Madison", address: "3001 Avenue L", chain: null, has_hotel: false, license_type: "commercial" },
  { name: "Diamond Jo Casino Dubuque", city: "Dubuque", address: "301 Bell Street", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Diamond Jo Casino Worth", city: "Northwood", address: "777 Diamond Jo Lane", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Mystique Casino", city: "Dubuque", address: "1855 Greyhound Park Drive", chain: "Dubuque Racing Association", has_hotel: false, license_type: "commercial" },
  { name: "Wild Rose Emmetsburg", city: "Emmetsburg", address: "777 Main Street", chain: "Wild Rose Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Wild Rose Clinton", city: "Clinton", address: "777 Wild Rose Drive", chain: "Wild Rose Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Wild Rose Jefferson", city: "Jefferson", address: "777 Wild Rose Drive", chain: "Wild Rose Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Meskwaki Bingo Casino Hotel", city: "Tama", address: "1504 305th Street", chain: "Sac & Fox Tribe of Mississippi in Iowa", has_hotel: true, license_type: "tribal" },
  { name: "WinnaVegas Casino Resort", city: "Sloan", address: "1500 330th Street", chain: "Winnebago Tribe of Nebraska", has_hotel: true, license_type: "tribal" },
];

// ─────────────────────────────────────────────
// ILLINOIS — Licensed by Illinois Gaming Board
// ─────────────────────────────────────────────
const IL_CASINOS = [
  { name: "Hollywood Casino Aurora", city: "Aurora", address: "One New York Street Bridge", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Grand Victoria Casino", city: "Elgin", address: "250 S Grove Ave", chain: "Rush Street Gaming", has_hotel: false, license_type: "commercial" },
  { name: "Par-A-Dice Hotel Casino", city: "East Peoria", address: "21 Blackjack Blvd", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Jumer's Casino Rock Island", city: "Rock Island", address: "777 Jumer Drive", chain: "Jumer's", has_hotel: true, license_type: "commercial" },
  { name: "Harrah's Joliet Casino Hotel", city: "Joliet", address: "151 N Joliet Street", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Hollywood Casino Joliet", city: "Joliet", address: "777 Hollywood Blvd", chain: "Penn Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Argosy Casino Alton", city: "Alton", address: "One Piasa Street", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Casino Queen", city: "East St. Louis", address: "200 S Front Street", chain: "Casino Queen Inc", has_hotel: true, license_type: "commercial" },
  { name: "Harrah's Metropolis Casino", city: "Metropolis", address: "203 E Front Street", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Rivers Casino Des Plaines", city: "Des Plaines", address: "2800 S River Road", chain: "Rush Street Gaming", has_hotel: false, license_type: "commercial" },
  { name: "Hard Rock Casino Rockford", city: "Rockford", address: "2500 E State Street", chain: "Hard Rock International", has_hotel: true, license_type: "commercial" },
  { name: "Rivers Casino Philadelphia", city: "Philadelphia", address: "1301 N Delaware Ave", chain: "Rush Street Gaming", has_hotel: false, license_type: "commercial" },
  { name: "Waukegan Temporary Casino", city: "Waukegan", address: "1 N Genesee Street", chain: null, has_hotel: false, license_type: "commercial" },
  { name: "Elmhurst Casino", city: "Elmhurst", address: "TBD", chain: null, has_hotel: false, license_type: "commercial" },
];

// ─────────────────────────────────────────────
// INDIANA — Licensed by Indiana Gaming Commission
// ─────────────────────────────────────────────
const IN_CASINOS = [
  { name: "Ameristar Casino East Chicago", city: "East Chicago", address: "777 Ameristar Blvd", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Blue Chip Casino Hotel Spa", city: "Michigan City", address: "2 Blue Chip Drive", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Horseshoe Hammond", city: "Hammond", address: "777 Casino Center Drive", chain: "Caesars Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Tropicana Evansville", city: "Evansville", address: "421 NW Riverside Drive", chain: "Bally's Corporation", has_hotel: true, license_type: "commercial" },
  { name: "Caesars Southern Indiana", city: "Elizabeth", address: "11999 Casino Center Drive SE", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Rising Star Casino Resort", city: "Rising Sun", address: "777 Rising Star Drive", chain: "Full House Resorts", has_hotel: true, license_type: "commercial" },
  { name: "Belterra Casino Resort", city: "Florence", address: "777 Belterra Drive", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Hollywood Casino Lawrenceburg", city: "Lawrenceburg", address: "One Hollywood Blvd", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Indiana Grand Racing & Casino", city: "Shelbyville", address: "4300 N Michigan Road", chain: "Caesars Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Hard Rock Casino Northern Indiana", city: "Gary", address: "5400 W 29th Ave", chain: "Hard Rock International", has_hotel: false, license_type: "commercial" },
  { name: "Horseshoe Indianapolis", city: "Shelbyville", address: "4004 Kentucky Ave", chain: "Caesars Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "French Lick Resort Casino", city: "French Lick", address: "8670 W State Road 56", chain: "Cook Group", has_hotel: true, license_type: "commercial" },
  { name: "Four Winds Casino South Bend", city: "South Bend", address: "3000 Pokagon Highway", chain: "Pokagon Band Potawatomi", has_hotel: false, license_type: "tribal" },
];

// ─────────────────────────────────────────────
// MICHIGAN — 3 Commercial Detroit + Tribal
// ─────────────────────────────────────────────
const MI_CASINOS = [
  // Commercial (Detroit)
  { name: "MGM Grand Detroit", city: "Detroit", address: "1777 Third Street", chain: "MGM Resorts", has_hotel: true, license_type: "commercial" },
  { name: "MotorCity Casino Hotel", city: "Detroit", address: "2901 Grand River Ave", chain: "Marian Ilitch Holdings", has_hotel: true, license_type: "commercial" },
  { name: "Greektown Casino-Hotel", city: "Detroit", address: "555 E Lafayette Blvd", chain: "Vici Properties / Penn Entertainment", has_hotel: true, license_type: "commercial" },
  // Tribal
  { name: "Four Winds Casino Resort New Buffalo", city: "New Buffalo", address: "11111 Wilson Road", chain: "Pokagon Band Potawatomi", has_hotel: true, license_type: "tribal" },
  { name: "Four Winds Casino Hartford", city: "Hartford", address: "68600 Red Arrow Highway", chain: "Pokagon Band Potawatomi", has_hotel: false, license_type: "tribal" },
  { name: "Four Winds Casino Dowagiac", city: "Dowagiac", address: "58700 M-51 S", chain: "Pokagon Band Potawatomi", has_hotel: false, license_type: "tribal" },
  { name: "Little River Casino Resort", city: "Manistee", address: "2700 Orchard Highway", chain: "Little River Band of Ottawa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Odawa Casino Resort", city: "Petoskey", address: "1760 Lears Road", chain: "Little Traverse Bay Bands of Odawa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Victories Casino Hotel", city: "Petoskey", address: "1966 US-131 S", chain: "Little Traverse Bay Bands of Odawa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Turtle Creek Casino & Hotel", city: "Williamsburg", address: "7741 M-72 E", chain: "Grand Traverse Band of Ottawa and Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Leelanau Sands Casino", city: "Peshawbestown", address: "2521 NW Bayshore Drive", chain: "Grand Traverse Band of Ottawa and Chippewa Indians", has_hotel: false, license_type: "tribal" },
  { name: "Soaring Eagle Casino & Resort", city: "Mount Pleasant", address: "6800 Soaring Eagle Blvd", chain: "Saginaw Chippewa Indian Tribe", has_hotel: true, license_type: "tribal" },
  { name: "Saganing Eagles Landing Casino", city: "Standish", address: "2690 Worth Road", chain: "Saginaw Chippewa Indian Tribe", has_hotel: false, license_type: "tribal" },
  { name: "Kewadin Casino Sault Ste. Marie", city: "Sault Ste. Marie", address: "2186 Shunk Road", chain: "Sault Ste. Marie Tribe of Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Kewadin Casino St. Ignace", city: "St. Ignace", address: "3015 Mackinac Trail", chain: "Sault Ste. Marie Tribe of Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Kewadin Casino Christmas", city: "Christmas", address: "N7761 Candy Cane Lane", chain: "Sault Ste. Marie Tribe of Chippewa Indians", has_hotel: false, license_type: "tribal" },
  { name: "Kewadin Casino Hessel", city: "Hessel", address: "3 Mile Road", chain: "Sault Ste. Marie Tribe of Chippewa Indians", has_hotel: false, license_type: "tribal" },
  { name: "Kewadin Casino Manistique", city: "Manistique", address: "US 2 & US 41", chain: "Sault Ste. Marie Tribe of Chippewa Indians", has_hotel: false, license_type: "tribal" },
  { name: "Lac Vieux Desert Casino", city: "Watersmeet", address: "N5384 US 45", chain: "Lac Vieux Desert Band of Lake Superior Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Bay Mills Resort & Casino", city: "Brimley", address: "11386 W Lakeshore Drive", chain: "Bay Mills Indian Community", has_hotel: true, license_type: "tribal" },
  { name: "King's Club Casino", city: "Brimley", address: "12140 W Lakeshore Drive", chain: "Bay Mills Indian Community", has_hotel: false, license_type: "tribal" },
  { name: "Ojibwa Casino Resort", city: "Baraga", address: "16449 Michigan Avenue", chain: "Keweenaw Bay Indian Community", has_hotel: true, license_type: "tribal" },
  { name: "Ojibwa Casino II Marquette", city: "Marquette", address: "105 Acre Trail", chain: "Keweenaw Bay Indian Community", has_hotel: false, license_type: "tribal" },
  { name: "Island Resort & Casino", city: "Harris", address: "W399 US Highway 2 & 41", chain: "Hannahville Indian Community", has_hotel: true, license_type: "tribal" },
  { name: "Zippy's Casino", city: "Bark River", address: "N8550 US Highway 2 & 41", chain: "Hannahville Indian Community", has_hotel: false, license_type: "tribal" },
];

// ─────────────────────────────────────────────
// WISCONSIN — All Tribal
// ─────────────────────────────────────────────
const WI_CASINOS = [
  { name: "Potawatomi Hotel & Casino", city: "Milwaukee", address: "1721 W Canal Street", chain: "Forest County Potawatomi Community", has_hotel: true, license_type: "tribal" },
  { name: "Potawatomi Carter Casino Hotel", city: "Carter", address: "618 State Highway 32", chain: "Forest County Potawatomi Community", has_hotel: true, license_type: "tribal" },
  { name: "Ho-Chunk Casino Hotel & Convention Center", city: "Baraboo", address: "S3214 Highway 12", chain: "Ho-Chunk Nation", has_hotel: true, license_type: "tribal" },
  { name: "Ho-Chunk Gaming Wisconsin Dells", city: "Wisconsin Dells", address: "655 Olmstead Road", chain: "Ho-Chunk Nation", has_hotel: false, license_type: "tribal" },
  { name: "Ho-Chunk Gaming Black River Falls", city: "Black River Falls", address: "W9010 Highway 54 E", chain: "Ho-Chunk Nation", has_hotel: false, license_type: "tribal" },
  { name: "Ho-Chunk Gaming Madison", city: "Madison", address: "4002 Evan Acres Road", chain: "Ho-Chunk Nation", has_hotel: false, license_type: "tribal" },
  { name: "Ho-Chunk Gaming Nekoosa", city: "Nekoosa", address: "N6748 Powerline Road", chain: "Ho-Chunk Nation", has_hotel: false, license_type: "tribal" },
  { name: "Oneida Casino", city: "Green Bay", address: "2020 Airport Drive", chain: "Oneida Nation of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "Oneida Casino Main", city: "Green Bay", address: "1585 Packerland Drive", chain: "Oneida Nation of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "Oneida Casino Radisson", city: "Green Bay", address: "2040 Airport Drive", chain: "Oneida Nation of Wisconsin", has_hotel: true, license_type: "tribal" },
  { name: "Oneida Casino Turning Stone", city: "Oneida", address: "3011 S Oneida Road", chain: "Oneida Nation of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "Menominee Casino Resort", city: "Keshena", address: "N277 Highway 47/55", chain: "Menominee Indian Tribe of Wisconsin", has_hotel: true, license_type: "tribal" },
  { name: "Mole Lake Casino & Lodge", city: "Crandon", address: "3084 Highway 55", chain: "Sokaogon Chippewa Community", has_hotel: true, license_type: "tribal" },
  { name: "Lake of the Torches Resort Casino", city: "Lac du Flambeau", address: "510 Old Abe Road", chain: "Lac du Flambeau Band of Lake Superior Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Bad River Lodge & Casino", city: "Odanah", address: "Highway 2", chain: "Bad River Band of Lake Superior Tribe of Chippewa Indians", has_hotel: true, license_type: "tribal" },
  { name: "Legendary Waters Resort & Casino", city: "Red Cliff", address: "37600 Highway 13", chain: "Red Cliff Band of Lake Superior Chippewa", has_hotel: true, license_type: "tribal" },
  { name: "St. Croix Casino Turtle Lake", city: "Turtle Lake", address: "777 US Highway 8", chain: "St. Croix Chippewa Indians of Wisconsin", has_hotel: true, license_type: "tribal" },
  { name: "St. Croix Casino Hertel", city: "Hertel", address: "4384 State Road 70", chain: "St. Croix Chippewa Indians of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "St. Croix Casino Danbury", city: "Danbury", address: "30222 US Highway 77", chain: "St. Croix Chippewa Indians of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "Northern Lights Casino Trego", city: "Trego", address: "5765 County Highway K", chain: "St. Croix Chippewa Indians of Wisconsin", has_hotel: false, license_type: "tribal" },
  { name: "Mohican North Star Casino", city: "Bowler", address: "W12180 County Road A", chain: "Stockbridge-Munsee Community Band of Mohican Indians", has_hotel: true, license_type: "tribal" },
  { name: "LCO Casino Lodge & Convention Center", city: "Hayward", address: "13767 W County Road B", chain: "Lac Courte Oreilles Band of Lake Superior Chippewa Indians", has_hotel: true, license_type: "tribal" },
];

// ─────────────────────────────────────────────
// MISSOURI — Commercial Riverboat Casinos
// ─────────────────────────────────────────────
const MO_CASINOS = [
  { name: "Ameristar Casino Kansas City", city: "Kansas City", address: "3200 N Ameristar Drive", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
  { name: "Argosy Casino Hotel & Spa Riverside", city: "Riverside", address: "777 NW Argosy Pkwy", chain: "Penn Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Lumiere Place Casino & Hotels", city: "St. Louis", address: "999 N 2nd Street", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Hollywood Casino St. Louis", city: "Maryland Heights", address: "777 Casino Center Drive", chain: "Penn Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "River City Casino", city: "St. Louis", address: "777 River City Casino Blvd", chain: "Station Casinos", has_hotel: false, license_type: "commercial" },
  { name: "Harrah's North Kansas City Casino Hotel", city: "North Kansas City", address: "1 Riverboat Drive", chain: "Caesars Entertainment", has_hotel: true, license_type: "commercial" },
  { name: "Isle of Capri Casino Hotel Boonville", city: "Boonville", address: "100 Isle of Capri Blvd", chain: "Vici Properties", has_hotel: true, license_type: "commercial" },
  { name: "Isle of Capri Casino Cape Girardeau", city: "Cape Girardeau", address: "777 N Main Street", chain: "Vici Properties", has_hotel: false, license_type: "commercial" },
  { name: "Lady Luck Casino Caruthersville", city: "Caruthersville", address: "777 E 3rd Street", chain: "Full House Resorts", has_hotel: false, license_type: "commercial" },
  { name: "Mark Twain Casino", city: "LaGrange", address: "104 Pierce Street", chain: "Full House Resorts", has_hotel: false, license_type: "commercial" },
  { name: "St. Jo Frontier Casino", city: "St. Joseph", address: "777 Winners Circle", chain: "Affinity Gaming", has_hotel: false, license_type: "commercial" },
  { name: "Terrible's Casino Casino Aztar", city: "Caruthersville", address: "777 E 3rd Street", chain: "Terrible Herbst", has_hotel: false, license_type: "commercial" },
  { name: "Ameristar Casino Hotel St. Charles", city: "St. Charles", address: "One Ameristar Blvd", chain: "Boyd Gaming", has_hotel: true, license_type: "commercial" },
];

// ─────────────────────────────────────────────
// OHIO — Licensed by Ohio Casino Control Commission
// ─────────────────────────────────────────────
const OH_CASINOS = [
  { name: "Hollywood Casino Columbus", city: "Columbus", address: "200 Georgesville Road", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Hollywood Casino at Toledo", city: "Toledo", address: "777 Hollywood Blvd", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "JACK Cleveland Casino", city: "Cleveland", address: "100 Public Square", chain: "JACK Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "JACK Cincinnati Casino", city: "Cincinnati", address: "1000 Broadway Street", chain: "JACK Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Hard Rock Casino Cincinnati", city: "Cincinnati", address: "1000 Broadway Street", chain: "Hard Rock International", has_hotel: false, license_type: "commercial" },
  { name: "MGM Northfield Park", city: "Northfield", address: "10777 Northfield Road", chain: "MGM Resorts", has_hotel: false, license_type: "commercial" },
  { name: "Hollywood Gaming at Mahoning Valley Race Course", city: "Austintown", address: "655 N Canfield-Niles Road", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Hollywood Gaming at Dayton Raceway", city: "Dayton", address: "777 Hollywood Blvd", chain: "Penn Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "JACK Thistledown Racino", city: "North Randall", address: "21501 Emery Road", chain: "JACK Entertainment", has_hotel: false, license_type: "commercial" },
  { name: "Belterra Park Gaming & Entertainment Center", city: "Cincinnati", address: "6301 Kellogg Ave", chain: "Churchill Downs", has_hotel: false, license_type: "commercial" },
  { name: "Hard Rock Rocksino Northfield Park", city: "Northfield", address: "10777 Northfield Road", chain: "Hard Rock International", has_hotel: false, license_type: "commercial" },
];

async function scrapeIowaPlaywright() {
  console.log('\n🎰 Attempting Playwright scrape for Iowa IRGC...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://irgc.iowa.gov/licensees/facilities', { waitUntil: 'networkidle', timeout: 30000 });
    const content = await page.content();
    console.log('Iowa page title:', await page.title());
    // Look for casino/facility names
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Iowa page text sample:', text.substring(0, 2000));
    await browser.close();
    return text;
  } catch(e) {
    console.log('Iowa Playwright failed:', e.message);
    if (browser) await browser.close();
    return null;
  }
}

async function scrapeIllinoisPlaywright() {
  console.log('\n🎰 Attempting Playwright scrape for Illinois IGB...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://igb.illinois.gov/casino-gambling.html', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Illinois page title:', await page.title());
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Illinois page text sample:', text.substring(0, 2000));
    await browser.close();
    return text;
  } catch(e) {
    console.log('Illinois Playwright failed:', e.message);
    if (browser) await browser.close();
    return null;
  }
}

async function main() {
  console.log('=== Midwest Casino Importer ===\n');

  // Try Playwright scrapes first (informational)
  await scrapeIowaPlaywright();
  await scrapeIllinoisPlaywright();

  const results = {};

  // Import each state
  const stateData = [
    { state: 'MN', casinos: MN_CASINOS, source: 'hardcoded (mn.gov bot-protected)', regulator: 'https://mn.gov/mdgaming/' },
    { state: 'IA', casinos: IA_CASINOS, source: 'hardcoded (irgc.iowa.gov SPA)', regulator: 'https://irgc.iowa.gov/' },
    { state: 'IL', casinos: IL_CASINOS, source: 'hardcoded (igb.illinois.gov)', regulator: 'https://igb.illinois.gov/' },
    { state: 'IN', casinos: IN_CASINOS, source: 'hardcoded (in.gov/igc)', regulator: 'https://www.in.gov/igc/' },
    { state: 'MI', casinos: MI_CASINOS, source: 'hardcoded (michigan.gov/mgcb)', regulator: 'https://www.michigan.gov/mgcb/' },
    { state: 'WI', casinos: WI_CASINOS, source: 'hardcoded (tribal, doa.wi.gov)', regulator: 'https://doa.wi.gov/Pages/LocalGovtsTribalGovts/Tribal-Gaming.aspx' },
    { state: 'MO', casinos: MO_CASINOS, source: 'hardcoded (mgc.dps.mo.gov)', regulator: 'https://mgc.dps.mo.gov/' },
    { state: 'OH', casinos: OH_CASINOS, source: 'hardcoded (casinocontrol.ohio.gov)', regulator: 'https://casinocontrol.ohio.gov/' },
  ];

  for (const { state, casinos, source, regulator } of stateData) {
    console.log(`\n━━━ ${state} (${source}) ━━━`);
    const { inserted, skipped } = await insertCasinos(casinos, state);
    results[state] = { inserted, skipped, total: casinos.length, source, regulator };
    console.log(`  → ${inserted} inserted, ${skipped} skipped`);
  }

  // Final count
  console.log('\n\n=== FINAL DATABASE COUNTS ===');
  const countRes = await pool.query(
    `SELECT state, COUNT(*) as count FROM casinos GROUP BY state ORDER BY count DESC`
  );
  for (const row of countRes.rows) {
    console.log(`  ${row.state}: ${row.count} casinos`);
  }

  console.log('\n=== IMPORT SUMMARY ===');
  for (const [state, r] of Object.entries(results)) {
    console.log(`${state}: ${r.inserted}/${r.total} inserted | Source: ${r.source}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
