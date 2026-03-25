/**
 * Master Payback Scraper Runner
 * Runs all state slot payback scrapers in sequence and reports results.
 *
 * Usage: node scrapers/run-payback-scrapers.js
 * PM2:   pm2 start scrapers/run-payback-scrapers.js --name "payback-scrapers" --cron "0 10 1 * *"
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const LOCAL_DB  = process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap';
const REMOTE_DB = process.env.PROD_DATABASE_URL ||
  `postgresql://findjackpots-db:${process.env.PROD_DB_PASS}@app-4de65bbd-1f1c-4198-bb13-4d77de20bbfd-do-user-34822266-0.g.db.ondigitalocean.com:25060/findjackpots-db?sslmode=require`;

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function findCasinoId(pool, name, state) {
  const words = name.split(/\s+/).filter(w => w.length > 3 && !/casino|hotel|resort|gaming|the|and/i.test(w));
  
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
    [state, `%${name}%`]
  );
  if (r.rows.length) return r.rows[0];
  
  for (const word of words.slice(0, 3)) {
    r = await pool.query(
      `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
      [state, `%${word}%`]
    );
    if (r.rows.length) return r.rows[0];
  }
  return null;
}

async function upsertPayback(pools, casinoId, paybackPct, reportMonth, sourceUrl, denomination = 'all') {
  let inserted = 0;
  for (const pool of pools) {
    try {
      const r = await pool.query(
        `INSERT INTO slot_payback (casino_id, report_month, denomination, payback_pct, source_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (casino_id, report_month, denomination) DO UPDATE SET
           payback_pct = EXCLUDED.payback_pct, source_url = EXCLUDED.source_url
         RETURNING id`,
        [casinoId, reportMonth, denomination, paybackPct, sourceUrl]
      );
      if (r.rows.length) inserted++;
    } catch (err) {
      // Silently skip if DB not available
    }
  }
  return inserted > 0 ? 1 : 0;
}

// ─── Iowa ─────────────────────────────────────────────────────────────────────

/**
 * Iowa IRGC PDF format:
 * The report has 3 sections per month, each with 7 columns of casinos:
 *   Section 1: lines 1-11 = casino names, line ~25 = SLOT REVENUE PERCENTAGE
 *   Section 2: lines 33-45 = casino names, line ~59 = SLOT REVENUE PERCENTAGE
 *   Section 3: lines 67-76 = casino names, line ~90 = SLOT REVENUE PERCENTAGE (last col = Totals)
 *
 * Casino names appear in their fixed column positions across the 3 sections.
 * SLOT REVENUE PERCENTAGE = house hold% → payback = 100 - hold%
 */
async function scrapeIowa(pools) {
  console.log('\n🌾 Iowa (IRGC)');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  let inserted = 0;
  const paybacks = [];
  
  try {
    const page = await browser.newPage();
    await page.goto('https://irgc.iowa.gov/publications-reports/gaming-revenue', {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map(a => ({ href: a.href, text: a.textContent.trim() }))
    );
    
    const revenueLinks = links
      .filter(l => /gaming revenue/i.test(l.text) && /media/i.test(l.href))
      .filter(l => !/fiscal year|sport|fantasy|archived/i.test(l.text));
    
    revenueLinks.sort((a, b) => {
      const parseD = t => {
        const m = t.match(/(\w+)\s+(\d{4})\s+gaming revenue/i);
        return m ? new Date(m[1] + ' 1, ' + m[2]).getTime() : 0;
      };
      return parseD(b.text) - parseD(a.text);
    });
    
    await page.close();
    
    if (!revenueLinks.length) {
      console.log('  No report links found');
      return { state: 'IA', inserted: 0, paybacks: [] };
    }
    
    const reportUrl = revenueLinks[0].href;
    console.log(`  Report: ${revenueLinks[0].text}`);
    
    const respBuf = await axios.get(reportUrl, {
      responseType: 'arraybuffer', timeout: 30000,
      headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
    });
    
    const pdf = await pdfParse(Buffer.from(respBuf.data));
    const allLines = pdf.text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Find report month from first "GAMING REVENUE REPORT -- MONTH YEAR" line
    let reportMonth = null;
    for (const line of allLines) {
      const m = line.match(/GAMING REVENUE REPORT\s*--\s*(\w+ \d{4})/i);
      if (m) {
        const d = new Date(m[1] + ' 1');
        if (!isNaN(d)) reportMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        break;
      }
    }
    if (!reportMonth) {
      const now = new Date();
      reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    }
    
    // The Iowa PDF summary has exactly 3 "GAMING REVENUE REPORT -- MONTH YEAR" headers in the first ~100 lines
    // Each header introduces a set of casino columns. Find all 3 groups.
    // Strategy: find all SLOT REVENUE PERCENTAGE lines in the first ~100 lines (summary sections only)
    // and pair them with casino names from the lines between the previous header and the data rows.
    
    // Iowa casino column order (fixed across reports):
    // Section 1: Ameristar II, Casino Queen/Marquette, Catfish Bend, Diamond Jo Dubuque, Diamond Jo Worth, Grand Falls, Hard Rock Sioux City
    // Section 2: Harrah's CB, Horseshoe CB, Isle Waterloo, Isle Bettendorf, Lakeside, Prairie Meadows, Q Casino/Mystique
    // Section 3: Rhythm City, Riverside, Wild Rose Clinton, Wild Rose Emmetsburg, Wild Rose Jefferson, [Totals]
    // Iowa column order matches the fixed PDF layout (same casinos in same columns each month)
    // Names must match DB exactly for findCasinoId to work correctly
    const IOWA_COLUMN_ORDER = [
      // Section 1 (7 casinos)
      'Ameristar Casino Hotel Council Bluffs',  // "Ameristar II"
      'Isle Casino Hotel Marquette',             // "Casino Queen - Marquette"
      'Catfish Bend Casino Burlington',
      'Diamond Jo Casino Dubuque',
      'Diamond Jo Casino Worth',
      'Grand Falls',                             // not in DB currently — will warn
      'Hard Rock Hotel & Casino Sioux City',
      // Section 2 (7 casinos)
      "Harrah's Council Bluffs Casino Hotel",
      'Horseshoe Council Bluffs',
      'Isle Casino Waterloo',
      'Isle Casino Hotel Bettendorf',
      'Lakeside Casino',
      'Prairie Meadows Racetrack and Casino',
      'Mystique Casino',                        // "Q Casino" rebranded to Mystique
      // Section 3 (5 casinos + Totals — skip Totals)
      'Rhythm City Casino Resort',
      'Riverside Casino & Golf Resort',
      'Wild Rose Clinton',
      'Wild Rose Emmetsburg',
      'Wild Rose Jefferson',
      // Totals — skip (handled by .slice(0, -1) above)
    ];
    
    // Find only SUMMARY section SLOT REVENUE PERCENTAGE lines (first occurrence in first 3 sections)
    // These are in the first ~100 lines before "TABLE REVENUE BY GAME" header
    const summaryEnd = allLines.findIndex(l => /TABLE REVENUE BY GAME/i.test(l));
    const summaryLines = summaryEnd > 0 ? allLines.slice(0, summaryEnd) : allLines.slice(0, 100);
    
    const slotRevPctLines = [];
    for (let i = 0; i < summaryLines.length; i++) {
      if (/^SLOT REVENUE PERCENTAGE/i.test(summaryLines[i])) {
        const pcts = [...summaryLines[i].matchAll(/([\d.]+)%/g)].map(m => parseFloat(m[1]));
        slotRevPctLines.push(pcts);
      }
    }
    
    // Flatten all percentages in column order (first 7, next 7, last 5-6)
    const allPcts = slotRevPctLines.flat();
    
    // Pair with casino names (skip last % per section which might be Totals if 6 instead of 5)
    // Section 1: 7 casinos → 7 pcts
    // Section 2: 7 casinos → 7 pcts  
    // Section 3: 5 casinos + Totals → last pct is totals, skip
    const casinoPcts = [];
    if (slotRevPctLines.length >= 3) {
      // Section 1: all 7
      casinoPcts.push(...slotRevPctLines[0]);
      // Section 2: all 7
      casinoPcts.push(...slotRevPctLines[1]);
      // Section 3: all except last (Totals)
      casinoPcts.push(...slotRevPctLines[2].slice(0, -1));
    } else if (allPcts.length > 0) {
      casinoPcts.push(...allPcts);
    }
    
    console.log(`  Found ${casinoPcts.length} slot revenue %s for ${IOWA_COLUMN_ORDER.length} casinos`);
    
    const count = Math.min(IOWA_COLUMN_ORDER.length, casinoPcts.length);
    for (let i = 0; i < count; i++) {
      const holdPct = casinoPcts[i];
      const payback = parseFloat((100 - holdPct).toFixed(2));
      
      if (payback < 80 || payback > 100) continue;
      
      const searchName = IOWA_COLUMN_ORDER[i];
      
      for (const pool of pools) {
        const casino = await findCasinoId(pool, searchName, 'IA');
        if (!casino) {
          if (pool === pools[0]) console.warn(`  ⚠️  No match: "${searchName}"`);
          continue;
        }
        const r = await upsertPayback(pools, casino.id, payback, reportMonth, reportUrl);
        if (pool === pools[0] && r > 0) {
          paybacks.push(payback);
          console.log(`  ✅ ${casino.name}: ${payback}% payback`);
          inserted++;
        }
        break;
      }
    }
    
    if (inserted === 0) {
      console.log('  ⚠️  Iowa PDF parser found no valid slot % data');
    }
    
  } finally {
    await browser.close();
  }
  
  return { state: 'IA', inserted, paybacks };
}

// ─── New Jersey ───────────────────────────────────────────────────────────────

async function scrapeNewJersey(pools) {
  console.log('\n🎰 New Jersey (DGE)');
  
  const NJ_BASE = 'https://www.nj.gov/oag/ge/docs/Financials/MGR';
  let url = null, reportMonth = null;
  
  for (let offset = 1; offset <= 4; offset++) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1);
    const year = d.getFullYear();
    const cap = MONTHS[d.getMonth()].charAt(0).toUpperCase() + MONTHS[d.getMonth()].slice(1);
    const tryUrl = `${NJ_BASE}${year}/${cap}${year}.pdf`;
    try {
      const r = await axios.head(tryUrl, { timeout: 10000 });
      if (r.status === 200) {
        url = tryUrl;
        reportMonth = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        console.log(`  Report: ${cap} ${year}`);
        break;
      }
    } catch {}
  }
  
  if (!url) {
    console.log('  ⚠️  No NJ report found');
    return { state: 'NJ', inserted: 0, paybacks: [] };
  }
  
  const resp = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const pdf = await pdfParse(Buffer.from(resp.data));
  const lines = pdf.text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const NJ_NAME_OVERRIDES = {
    "BALLY'S ATLANTIC CITY": "Bally's Atlantic City",
    "BORGATA HOTEL CASINO & SPA": "Borgata",
    "CAESARS ATLANTIC CITY": "Caesars Atlantic City",
    "GOLDEN NUGGET": "Golden Nugget Atlantic City",
    "HARD ROCK ATLANTIC CITY": "Hard Rock Hotel & Casino Atlantic City",
    "HARRAH'S ATLANTIC CITY": "Harrah's Resort Atlantic City",
    "OCEAN CASINO RESORT": "Ocean Casino Resort",
    "RESORTS CASINO HOTEL": "Resorts Casino Hotel",
    "TROPICANA CASINO & RESORT": "Tropicana Atlantic City",
  };
  
  let inserted = 0;
  const paybacks = [];
  
  // Parse: "4Slot Machine Win..." lines then win% on next line, then casino name before "MONTHLY GROSS REVENUE REPORT"
  const slotItems = [];
  const casinoItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('4Slot Machine Win')) {
      const pctLine = lines[i + 1] || '';
      const m = pctLine.match(/^(\d{1,2}\.\d{1,2})%/);
      if (m) slotItems.push({ idx: i, winPct: parseFloat(m[1]) });
    }
    if (lines[i + 1] === 'MONTHLY GROSS REVENUE REPORT') {
      casinoItems.push({ idx: i, name: lines[i] });
    }
  }
  
  for (const slot of slotItems) {
    const nextCasino = casinoItems.find(c => c.idx > slot.idx);
    if (!nextCasino) continue;
    
    const payback = parseFloat((100 - slot.winPct).toFixed(2));
    const searchName = NJ_NAME_OVERRIDES[nextCasino.name] || nextCasino.name;
    
    for (const pool of pools) {
      const casino = await findCasinoId(pool, searchName, 'NJ');
      if (!casino) {
        if (pool === pools[0]) console.warn(`  ⚠️  No match: "${nextCasino.name}"`);
        continue;
      }
      const r = await upsertPayback(pools, casino.id, payback, reportMonth, url);
      if (pool === pools[0] && r > 0) {
        paybacks.push(payback);
        console.log(`  ✅ ${casino.name}: ${payback}% payback`);
        inserted++;
      }
      break;
    }
  }
  
  return { state: 'NJ', inserted, paybacks };
}

// ─── Ohio ─────────────────────────────────────────────────────────────────────

async function scrapeOhio(pools) {
  console.log('\n🏙️ Ohio (OCCC)');
  
  const OHIO_URL = 'https://dam.assets.ohio.gov/raw/upload/v1772208620/casinocontrol.ohio.gov/revenue-reports/2026/Casino/2026_Ohio_Casino_Monthly_Revenue_Report01.xlsx';
  
  // Try scraping the page for latest URL
  let excelUrl = OHIO_URL;
  try {
    const pageResp = await axios.get('https://casinocontrol.ohio.gov/about/revenue-reports', { timeout: 15000 });
    const $ = cheerio.load(pageResp.data);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('.xlsx') && href.includes('Casino')) excelUrl = href;
    });
  } catch {}
  
  console.log(`  Excel: ${excelUrl}`);
  
  const resp = await axios.get(excelUrl, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' });
  
  const SHEET_MAP = {
    'JACK CLEVELAND':      'JACK Cleveland Casino',
    'HOLLYWOOD COLUMBUS':  'Hollywood Casino Columbus',
    'HARD ROCK CINCINNATI':'Hard Rock Casino Cincinnati',
    'HOLLYWOOD TOLEDO':    'Hollywood Casino at Toledo',
  };
  
  let inserted = 0;
  const paybacks = [];
  
  for (const sheetName of wb.SheetNames) {
    if (!SHEET_MAP[sheetName]) continue;
    
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    
    let slotPayoutCol = -1, monthCol = 0;
    let headerIdx = -1;
    let reportYear = new Date().getFullYear();
    
    const titleStr = String(rows[0]?.[0] || '');
    const yearMatch = titleStr.match(/^(\d{4})/);
    if (yearMatch) reportYear = parseInt(yearMatch[1]);
    
    for (let i = 0; i < rows.length; i++) {
      const joined = rows[i].join('|').toLowerCase();
      if (joined.includes('slot payout')) {
        headerIdx = i;
        rows[i].forEach((h, j) => {
          if (String(h).toLowerCase().includes('slot payout')) slotPayoutCol = j;
          if (String(h).toLowerCase() === 'month') monthCol = j;
        });
        break;
      }
    }
    
    if (headerIdx < 0 || slotPayoutCol < 0) continue;
    
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const monthStr = String(row[monthCol] || '').trim();
      const pctStr = String(row[slotPayoutCol] || '').trim();
      if (!monthStr || monthStr.toLowerCase() === 'total') continue;
      
      const mIdx = MONTHS.findIndex(m => monthStr.toLowerCase().startsWith(m));
      if (mIdx < 0) continue;
      
      const pct = parseFloat(pctStr.replace('%', '').trim());
      if (isNaN(pct) || pct < 50 || pct > 100) continue;
      
      const reportMonth = `${reportYear}-${String(mIdx + 1).padStart(2, '0')}-01`;
      const searchName = SHEET_MAP[sheetName];
      
      for (const pool of pools) {
        const casino = await findCasinoId(pool, searchName, 'OH');
        if (!casino) continue;
        const r = await upsertPayback(pools, casino.id, pct, reportMonth, excelUrl);
        if (pool === pools[0] && r > 0) {
          paybacks.push(pct);
          console.log(`  ✅ ${casino.name} (${reportMonth}): ${pct}% payback`);
          inserted++;
        }
        break;
      }
    }
  }
  
  return { state: 'OH', inserted, paybacks };
}

// ─── Missouri ─────────────────────────────────────────────────────────────────

async function scrapeMissouri(pools) {
  console.log('\n🎲 Missouri (MGC)');
  
  const MO_SLOT_PAGE = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/rb_SlotPayoutPercentages.html';
  const MO_BASE = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/';
  
  let pdfUrl = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/FY26_FinReport/02_Feb/detail0126.pdf';
  let reportMonth = '2026-01-01';
  
  try {
    const pageResp = await axios.get(MO_SLOT_PAGE, { timeout: 15000 });
    const $ = cheerio.load(pageResp.data);
    
    let latestM = 0, latestY = 0;
    $('a[href*="detail"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href.endsWith('.pdf')) return;
      const m = href.match(/detail(\d{2})(\d{2})\.pdf/);
      if (!m) return;
      const month = parseInt(m[1]), year = 2000 + parseInt(m[2]);
      if (year > latestY || (year === latestY && month > latestM)) {
        latestM = month; latestY = year;
        pdfUrl = MO_BASE + href;
        reportMonth = `${latestY}-${String(latestM).padStart(2, '0')}-01`;
      }
    });
  } catch (err) {
    console.log(`  Falling back to known URL: ${pdfUrl}`);
  }
  
  console.log(`  PDF: ${pdfUrl} (${reportMonth})`);
  
  const resp = await axios.get(pdfUrl, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const pdf = await pdfParse(Buffer.from(resp.data));
  const lines = pdf.text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const MO_NAME_MAP = {
    'ARGOSY RIVERSIDE':       'Argosy Casino Hotel',
    'CENTURY CARUTHERSVILLE': 'Lady Luck Casino Caruthersville',
    'HOLLYWOOD':              'Hollywood Casino St. Louis',
    'RIVER CITY':             'River City Casino',
    'HORSESHOE ST. LOUIS':    'Lumiere Place',
    'AMERISTAR SC':           'Ameristar Casino Hotel St. Charles',
    'AMERISTAR ST. CHARLES':  'Ameristar Casino Hotel St. Charles',
    "HARRAH'S KC":            "Harrah's North Kansas City",
    "BALLY'S KC":             'Ameristar Casino Kansas City',
    'AMERISTAR KC':           'Ameristar Casino Kansas City',
    'ST. JO':                 'St. Jo Frontier Casino',
    'MARK TWAIN':             'Mark Twain Casino',
    'ISLE - BOONVILLE':       'Isle of Capri Casino Hotel Boonville',
    'CENTURY CAPE':           'Isle of Capri Casino Cape Girardeau',
  };
  
  let currentBoat = null;
  const records = [];
  
  for (let i = 0; i < lines.length; i++) {
    const boatMatch = lines[i].match(/^BOAT:\s*(.+)/i);
    if (boatMatch) {
      currentBoat = boatMatch[1].replace(/\s+/g, ' ').trim();
      continue;
    }
    
    if (lines[i].includes('TOTAL SLOTS:') && currentBoat) {
      const nearby = lines.slice(Math.max(0, i - 3), i + 2).join(' ');
      const pctMatches = [...nearby.matchAll(/(\d{2,3}\.\d{1,3})%/g)].map(m => parseFloat(m[1]));
      const validPcts = pctMatches.filter(p => p >= 80 && p <= 100);
      
      if (validPcts.length > 0) {
        const payback = validPcts[validPcts.length - 1];
        records.push({ boat: currentBoat, payback });
      }
      currentBoat = null;
    }
  }
  
  let inserted = 0;
  const paybacks = [];
  
  for (const rec of records) {
    const boatUpper = rec.boat.toUpperCase();
    const searchName = MO_NAME_MAP[boatUpper] || rec.boat;
    
    for (const pool of pools) {
      const casino = await findCasinoId(pool, searchName, 'MO');
      if (!casino) {
        if (pool === pools[0]) console.warn(`  ⚠️  No match: "${rec.boat}"`);
        continue;
      }
      const r = await upsertPayback(pools, casino.id, rec.payback, reportMonth, pdfUrl);
      if (pool === pools[0] && r > 0) {
        paybacks.push(rec.payback);
        console.log(`  ✅ ${casino.name}: ${rec.payback}% payback`);
        inserted++;
      }
      break;
    }
  }
  
  return { state: 'MO', inserted, paybacks };
}

// ─── Pennsylvania ─────────────────────────────────────────────────────────────

async function scrapePennsylvania(pools) {
  console.log('\n🎭 Pennsylvania (PGCB)');
  
  const PA_REVENUE = 'https://gamingcontrolboard.pa.gov/news-and-transparency/revenue';
  
  let excelUrl = null;
  try {
    const resp = await axios.get(PA_REVENUE, { timeout: 15000 });
    const $ = cheerio.load(resp.data);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      if (href.includes('.xlsx') && (href.toLowerCase().includes('slot') || text.includes('slot'))) {
        excelUrl = href.startsWith('http') ? href : `https://gamingcontrolboard.pa.gov${href}`;
      }
    });
  } catch (err) {
    console.log(`  ⚠️  Could not fetch PA revenue page: ${err.message}`);
    return { state: 'PA', inserted: 0, paybacks: [] };
  }
  
  if (!excelUrl) {
    console.log('  ⚠️  No PA Excel found');
    return { state: 'PA', inserted: 0, paybacks: [] };
  }
  
  console.log(`  Excel: ${excelUrl}`);
  
  const resp = await axios.get(excelUrl, {
    responseType: 'arraybuffer', timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  
  // Determine target months (last 2 completed months)
  const now = new Date();
  const targetMonths = [];
  for (let offset = 1; offset <= 2; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const cap = MONTHS[d.getMonth()].charAt(0).toUpperCase() + MONTHS[d.getMonth()].slice(1);
    const fy = d >= new Date(2025, 6, 1) && d < new Date(2026, 6, 1);
    if (fy) targetMonths.push({ label: `${cap} ${year}`, reportMonth: `${year}-${String(d.getMonth()+1).padStart(2,'0')}-01` });
  }
  
  const PA_NAME_MAP = {
    'Parx Casino':                       'Parx Casino',
    "Harrah's Philadelphia":             "Harrah's Philadelphia",
    'Hollywood Casino at Penn National': 'Hollywood Casino at Penn National Race Course',
    'Wind Creek':                        'Wind Creek Bethlehem',
    'Rivers Pittsburgh':                 'Rivers Casino Pittsburgh',
    'Rivers Philadelphia':               'Rivers Casino Philadelphia',
    'Valley Forge':                      'Valley Forge Casino Resort',
    'Mohegan Pennsylvania':              null,
    'Presque Isle':                      null,
    'Hollywood Casino at the Meadows':   null,
    'Mount Airy':                        null,
  };
  
  let currentCasino = null, headerRow = null;
  let inserted = 0;
  const paybacks = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = String(row[0] || '').trim();
    
    const isDataLabel = /wagers|payouts|promotional|adjustments|gross|state tax|lsa|edtf|prhdf|taxable|number|gtr|total/i.test(col0);
    const otherEmpty = row.slice(1, 13).every(c => !String(c || '').trim());
    if (col0 && otherEmpty && !isDataLabel && col0 !== 'MONTHLY SLOT MACHINE GAMING REVENUES') {
      currentCasino = col0; headerRow = null; continue;
    }
    
    if (row.some(c => /July 2025|August 2025/i.test(String(c || '')))) {
      headerRow = row.map(c => String(c || '').trim()); continue;
    }
    
    if (col0 === 'Wagers' && currentCasino && headerRow) {
      const wagersRow = row, payoutsRow = rows[i + 1] || [];
      
      for (const tm of targetMonths) {
        const colIdx = headerRow.findIndex(h => h.toLowerCase() === tm.label.toLowerCase());
        if (colIdx < 0) continue;
        
        const wagers  = parseFloat(String(wagersRow[colIdx]  || '').replace(/[\$\s,]/g, ''));
        const payouts = parseFloat(String(payoutsRow[colIdx] || '').replace(/[\$\s,]/g, ''));
        if (!wagers || wagers <= 0 || isNaN(payouts)) continue;
        
        const payback = parseFloat((payouts / wagers * 100).toFixed(2));
        if (payback < 80 || payback > 100) continue;
        
        const mapped = PA_NAME_MAP[currentCasino];
        if (mapped === null) continue;
        const searchName = mapped || currentCasino;
        
        for (const pool of pools) {
          const casino = await findCasinoId(pool, searchName, 'PA');
          if (!casino) {
            if (pool === pools[0]) console.warn(`  ⚠️  No match: "${currentCasino}"`);
            continue;
          }
          const r = await upsertPayback(pools, casino.id, payback, tm.reportMonth, excelUrl);
          if (pool === pools[0] && r > 0) {
            paybacks.push(payback);
            console.log(`  ✅ ${casino.name} (${tm.reportMonth}): ${payback}% payback`);
            inserted++;
          }
          break;
        }
      }
    }
  }
  
  return { state: 'PA', inserted, paybacks };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   FindJackpots — Payback Scraper Master Runner       ║');
  console.log(`║   ${new Date().toISOString()}              ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  
  const localPool  = new Pool({ connectionString: LOCAL_DB });
  const remotePool = new Pool({ connectionString: REMOTE_DB });
  const pools = [];
  
  // Test DB connections
  try {
    await localPool.query('SELECT 1');
    pools.push(localPool);
    console.log('\n✅ Local DB connected');
  } catch (err) {
    console.log(`\n⚠️  Local DB unavailable: ${err.message}`);
  }
  
  try {
    await remotePool.query('SELECT 1');
    pools.push(remotePool);
    console.log('✅ Remote DB connected');
  } catch (err) {
    console.log(`⚠️  Remote DB unavailable: ${err.message}`);
  }
  
  if (pools.length === 0) {
    console.error('❌ No databases available. Exiting.');
    process.exit(1);
  }
  
  const results = [];
  const scrapers = [
    { name: 'Iowa',        fn: scrapeIowa },
    { name: 'New Jersey',  fn: scrapeNewJersey },
    { name: 'Ohio',        fn: scrapeOhio },
    { name: 'Missouri',    fn: scrapeMissouri },
    { name: 'Pennsylvania',fn: scrapePennsylvania },
  ];
  
  for (const { name, fn } of scrapers) {
    try {
      const result = await fn(pools);
      results.push(result);
    } catch (err) {
      console.error(`\n❌ ${name} scraper failed: ${err.message}`);
      results.push({ state: name.substring(0,2).toUpperCase(), inserted: 0, paybacks: [] });
    }
  }
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                           ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  
  let grandTotal = 0;
  for (const r of results) {
    const stateNames = { IA:'Iowa', NJ:'New Jersey', OH:'Ohio', MO:'Missouri', PA:'Pennsylvania' };
    const name = stateNames[r.state] || r.state;
    const range = r.paybacks.length > 0 
      ? `${Math.min(...r.paybacks).toFixed(2)}% – ${Math.max(...r.paybacks).toFixed(2)}%`
      : 'N/A';
    console.log(`║  ${name.padEnd(14)} ${String(r.inserted).padStart(3)} records  Range: ${range.padEnd(18)}║`);
    grandTotal += r.inserted;
  }
  
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  TOTAL: ${String(grandTotal).padStart(3)} records inserted/updated                   ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  for (const pool of pools) await pool.end().catch(() => {});
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
