/**
 * Missouri Gaming Commission — Slot Payout Scraper
 * Source: https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/rb_SlotPayoutPercentages.html
 *
 * Missouri publishes per-casino slot detail PDFs with per-denomination payout %
 * and an overall "TOTAL SLOTS" payout percentage.
 *
 * PDF Format per casino:
 *   BOAT: [CASINO NAME]
 *   MONTH ENDED: [MONTH YEAR]
 *   ELECTRONIC GAMING DEVICES: ... TOTAL SLOTS: [payout%]
 *
 * Run: node missouri-scraper.js
 */

require('dotenv').config();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { Pool } = require('pg');
const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const REMOTE_DB = process.env.PROD_DATABASE_URL ||
  `postgresql://findjackpots-db:${process.env.PROD_DB_PASS}@app-4de65bbd-1f1c-4198-bb13-4d77de20bbfd-do-user-34822266-0.g.db.ondigitalocean.com:25060/findjackpots-db?sslmode=require`;

const pools = [
  new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap' }),
  new Pool({ connectionString: REMOTE_DB }),
];

const MO_SLOT_PAGE = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/rb_SlotPayoutPercentages.html';
const MO_BASE = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/';

// Missouri casino name mappings (from PDF "BOAT:" name → DB search term)
const MO_NAME_MAP = {
  'ARGOSY RIVERSIDE':         'Argosy Casino Hotel',
  'CENTURY CARUTHERSVILLE':   'Lady Luck Casino Caruthersville',
  'HOLLYWOOD':                'Hollywood Casino St. Louis',
  'RIVER CITY':               'River City Casino',
  'HORSESHOE ST. LOUIS':      'Lumiere Place',          // Horseshoe rebranded from Lumiere
  'AMERISTAR SC':             'Ameristar Casino Hotel St. Charles',
  'AMERISTAR ST. CHARLES':    'Ameristar Casino Hotel St. Charles',
  'HARRAH\'S KC':             'Harrah\'s North Kansas City',
  "HARRAH'S KC":              "Harrah's North Kansas City",
  'BALLY\'S KC':              'Ameristar Casino Kansas City',   // Bally's KC was formerly Ameristar KC
  "BALLY'S KC":               'Ameristar Casino Kansas City',
  'AMERISTAR KC':             'Ameristar Casino Kansas City',
  'ST. JO':                   'St. Jo Frontier Casino',
  'MARK TWAIN':               'Mark Twain Casino',
  'ISLE - BOONVILLE':         'Isle of Capri Casino Hotel Boonville',
  'CENTURY CAPE':             'Isle of Capri Casino Cape Girardeau',
  'ISLE CAPE GIRARDEAU':      'Isle of Capri Casino Cape Girardeau',
};

async function findLatestMOPdfUrl() {
  const resp = await axios.get(MO_SLOT_PAGE, { timeout: 15000, headers: { 'User-Agent': 'FindJackpots-Bot/1.0' } });
  const $ = cheerio.load(resp.data);
  
  // Find the first/latest FY2026 detail PDF link
  let latestUrl = null;
  let latestMonth = null;
  let latestYear = null;
  
  $('a[href*="detail"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.endsWith('.pdf')) return;
    
    // Parse: FY26_FinReport/02_Feb/detail0126.pdf → month=01, year=2026
    const match = href.match(/detail(\d{2})(\d{2})\.pdf/);
    if (!match) return;
    
    const month = parseInt(match[1]);
    const year = 2000 + parseInt(match[2]);
    
    if (!latestMonth || year > latestYear || (year === latestYear && month > latestMonth)) {
      latestMonth = month;
      latestYear = year;
      latestUrl = href;
    }
  });
  
  if (!latestUrl) throw new Error('No Missouri detail PDF link found');
  
  const fullUrl = latestUrl.startsWith('http') ? latestUrl : MO_BASE + latestUrl;
  const reportMonth = `${latestYear}-${String(latestMonth).padStart(2, '0')}-01`;
  
  console.log(`  Latest MO report: ${latestMonth}/${latestYear} → ${fullUrl}`);
  return { url: fullUrl, reportMonth };
}

function parseMissouriPDF(text) {
  const results = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let currentBoat = null;
  let currentMonth = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect casino name: "BOAT:    ARGOSY RIVERSIDE" or "BOAT: ARGOSY RIVERSIDE"
    const boatMatch = line.match(/^BOAT:\s*(.+)/i);
    if (boatMatch) {
      currentBoat = boatMatch[1].replace(/\s+/g, ' ').trim();
      continue;
    }
    
    // Detect month: "MONTH ENDED:  JANUARY 2026"
    const monthMatch = line.match(/MONTH ENDED:\s*(\w+)\s+(\d{4})/i);
    if (monthMatch) {
      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const mIdx = monthNames.findIndex(m => m === monthMatch[1].toLowerCase());
      if (mIdx >= 0) {
        currentMonth = `${monthMatch[2]}-${String(mIdx + 1).padStart(2, '0')}-01`;
      }
      continue;
    }
    
    // Detect TOTAL SLOTS line with overall payout %
    // Format: "1,060 118,033,412.72 11,222,923.14 90.492%  TOTAL SLOTS:"
    // Or could be on separate line: "TOTAL SLOTS:" followed by the numbers
    if (line.includes('TOTAL SLOTS:') && currentBoat && currentMonth) {
      // Payout % appears BEFORE "TOTAL SLOTS:" on same line or in adjacent lines
      // Look for a pattern like "90.492%" before "TOTAL SLOTS:"
      const combined = lines.slice(Math.max(0, i-3), i+2).join(' ');
      const pctMatches = [...combined.matchAll(/(\d{2,3}\.\d{1,3})%/g)];
      
      if (pctMatches.length > 0) {
        // Take the last percentage match on/near this line (overall total)
        const lastPct = parseFloat(pctMatches[pctMatches.length - 1][1]);
        if (lastPct >= 80 && lastPct <= 100) {
          results.push({
            boat: currentBoat,
            reportMonth: currentMonth,
            paybackPct: lastPct,
          });
        }
      }
      
      // Also check the line itself
      const lineMatch = line.match(/(\d{2,3}\.\d{1,3})%/);
      if (lineMatch && results[results.length - 1]?.boat !== currentBoat) {
        const pct = parseFloat(lineMatch[1]);
        if (pct >= 80 && pct <= 100) {
          results.push({
            boat: currentBoat,
            reportMonth: currentMonth,
            paybackPct: pct,
          });
        }
      }
      
      currentBoat = null; // reset for next casino
      continue;
    }
  }
  
  // De-duplicate (keep last occurrence per boat/month)
  const seen = new Map();
  for (const r of results) {
    seen.set(`${r.boat}|${r.reportMonth}`, r);
  }
  return [...seen.values()];
}

async function findCasinoId(pool, boatName, state) {
  // Try mapped name first
  const mappedName = MO_NAME_MAP[boatName.toUpperCase()] || 
    Object.entries(MO_NAME_MAP).find(([k]) => boatName.toUpperCase().includes(k))?.[1];
  
  const searchTerm = mappedName || boatName;
  
  const words = searchTerm.split(/\s+/).filter(w => w.length > 3 && !/casino|hotel|resort|the|gaming/i.test(w));
  
  // Try full mapped name
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
    [state, `%${searchTerm}%`]
  );
  if (r.rows.length) return r.rows[0];
  
  // Try key words from mapped name
  for (const word of words) {
    r = await pool.query(
      `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
      [state, `%${word}%`]
    );
    if (r.rows.length) return r.rows[0];
  }
  
  // Try original boat name words
  const boatWords = boatName.split(/\s+/).filter(w => w.length > 4);
  for (const word of boatWords) {
    r = await pool.query(
      `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
      [state, `%${word}%`]
    );
    if (r.rows.length) return r.rows[0];
  }
  
  return null;
}

async function storePayback(pool, casinoId, paybackPct, reportMonth, sourceUrl) {
  await pool.query(
    `INSERT INTO slot_payback (casino_id, report_month, denomination, payback_pct, source_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (casino_id, report_month, denomination) DO UPDATE SET
       payback_pct = EXCLUDED.payback_pct,
       source_url  = EXCLUDED.source_url`,
    [casinoId, reportMonth, 'all', paybackPct, sourceUrl]
  );
}

async function run() {
  console.log('🎲 Missouri Gaming Commission — Slot Payout Scraper\n');
  const startTime = Date.now();
  
  let pdfUrl, reportMonth;
  try {
    const result = await findLatestMOPdfUrl();
    pdfUrl = result.url;
    reportMonth = result.reportMonth;
  } catch (err) {
    // Fallback to known Jan 2026 report
    pdfUrl = 'https://www.mgc.dps.mo.gov/Casino_Gaming/rb_financials/FY26_FinReport/02_Feb/detail0126.pdf';
    reportMonth = '2026-01-01';
    console.log(`Using fallback: ${pdfUrl}`);
  }
  
  console.log(`Downloading PDF: ${pdfUrl}`);
  const resp = await axios.get(pdfUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const pdf = await pdfParse(Buffer.from(resp.data));
  console.log(`Extracted ${pdf.text.length.toLocaleString()} chars\n`);
  
  const records = parseMissouriPDF(pdf.text);
  console.log(`Parsed ${records.length} casino records:`);
  records.forEach(r => console.log(`  ${r.boat} → ${r.paybackPct}%`));
  
  let inserted = 0;
  
  for (const rec of records) {
    for (const pool of pools) {
      try {
        const casino = await findCasinoId(pool, rec.boat, 'MO');
        if (!casino) {
          if (pool === pools[0]) console.warn(`  ⚠️  No DB match for: "${rec.boat}"`);
          continue;
        }
        await storePayback(pool, casino.id, rec.paybackPct, rec.reportMonth, pdfUrl);
        if (pool === pools[0]) {
          console.log(`  ✅ ${casino.name}: ${rec.paybackPct}% payback (${rec.reportMonth})`);
          inserted++;
        }
      } catch (err) {
        console.error(`  DB error [${rec.boat}]: ${err.message}`);
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Missouri done in ${elapsed}s — ${inserted} records inserted/updated`);
  
  for (const pool of pools) {
    await pool.query(
      `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
       VALUES ('missouri-scraper', $1, $2, $3)`,
      [inserted > 0 ? 'success' : 'partial', inserted, new Date(startTime)]
    ).catch(() => {});
    await pool.end();
  }
  
  return inserted;
}

if (require.main === module) {
  run().catch(err => { console.error('Fatal:', err); process.exit(1); });
}

module.exports = { run };
