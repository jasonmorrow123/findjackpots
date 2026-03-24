/**
 * NJ DGE + PA Gaming Control Board — Slot Payout Scraper
 *
 * NJ Source: https://www.njoag.gov/.../monthly-gross-revenue-reports/
 *   - Monthly Gross Revenue Reports (PDFs)
 *   - Format: "4Slot Machine Win{units}{win}   {handle}\n{win_pct}%"
 *   - WIN% = house win / handle → payback = 100 - win%
 *
 * PA Source: https://gamingcontrolboard.pa.gov/news-and-transparency/revenue
 *   - Monthly Slots Excel (FY 2025-2026)
 *   - Format: Wagers / Payouts per casino per month
 *   - payback = Payouts / Wagers * 100
 *
 * Run: node nj-payout-scraper.js
 * Schedule: Monthly (after ~10th of each month when new reports post)
 */

require('dotenv').config();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_NUMS = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};

const NJ_MGR_INDEX = 'https://www.njoag.gov/about/divisions-and-offices/division-of-gaming-enforcement-home/financial-and-statistical-information/monthly-gross-revenue-reports/';
const NJ_MGR_BASE  = 'https://www.nj.gov/oag/ge/docs/Financials/MGR';
const PA_REVENUE   = 'https://gamingcontrolboard.pa.gov/news-and-transparency/revenue';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findCasinoId(rawName, state) {
  // Direct name match
  let r = await pool.query(
    `SELECT id FROM casinos WHERE name ILIKE $1 AND state = $2 LIMIT 1`,
    [`%${rawName}%`, state]
  );
  if (r.rows.length) return r.rows[0].id;

  // Word-by-word fallback
  const words = rawName.split(/\s+/).filter(w => w.length > 3 && !/inc|llc|and|the/i.test(w));
  for (const word of words) {
    r = await pool.query(
      `SELECT id FROM casinos WHERE name ILIKE $1 AND state = $2 LIMIT 1`,
      [`%${word}%`, state]
    );
    if (r.rows.length) return r.rows[0].id;
  }
  return null;
}

async function storePayback(casinoId, paybackPct, reportMonth, sourceUrl) {
  const r = await pool.query(
    `INSERT INTO slot_payback (casino_id, report_month, denomination, payback_pct, source_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (casino_id, report_month, denomination) DO UPDATE SET
       payback_pct = EXCLUDED.payback_pct,
       source_url  = EXCLUDED.source_url`,
    [casinoId, reportMonth, 'all', paybackPct, sourceUrl]
  );
  return r.rowCount;
}

function parseAmountStr(str) {
  return parseFloat(str.replace(/[\$\s,]/g, '').replace('$$', ''));
}

// ── NJ scraper ────────────────────────────────────────────────────────────────

/**
 * Find the latest available NJ MGR PDF.
 * NJ posts at: https://www.nj.gov/oag/ge/docs/Financials/MGR{YYYY}/{Month}{YYYY}.pdf
 * Reports post ~10 days after month end.
 * Walk backwards from current month until we find one.
 */
async function findLatestNJReportUrl() {
  const now = new Date();
  for (let offset = 1; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthName = MONTHS[d.getMonth()];
    const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const url = `${NJ_MGR_BASE}${year}/${cap}${year}.pdf`;
    try {
      const resp = await axios.head(url, { timeout: 10000 });
      if (resp.status === 200) {
        const reportMonth = `${year}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        console.log(`  ✓ Latest NJ report: ${cap} ${year} → ${url}`);
        return { url, reportMonth };
      }
    } catch { /* try next */ }
  }
  throw new Error('Could not find a recent NJ MGR PDF');
}

/**
 * Parse the NJ Monthly Gross Revenue Report PDF.
 *
 * PDF layout per casino page (data appears BEFORE casino name):
 *   ...table/slot data rows...
 *   4Slot Machine Win{units}{win}   {handle}
 *   {win_pct}%   ← house win percentage, e.g. "10.1%"
 *   ...footer rows...
 *   CASINO NAME              ← casino name comes AFTER its own data
 *   MONTHLY GROSS REVENUE REPORT
 *
 * Strategy: collect all slot data lines and all casino name lines by index,
 * then pair each slot line with the NEXT casino name that follows it.
 *
 * payback = 100 - win_pct (house win % → player payback %)
 */
function parseNJPDF(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Collect slot data positions
  const slotItems = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('4Slot Machine Win')) {
      const pctLine = lines[i + 1] || '';
      const pctMatch = pctLine.match(/^(\d{1,2}\.\d{1,2})%/);
      if (pctMatch) {
        slotItems.push({ lineIdx: i, winPct: parseFloat(pctMatch[1]) });
      }
    }
  }

  // Collect casino name positions (line before "MONTHLY GROSS REVENUE REPORT")
  const casinoItems = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i + 1] === 'MONTHLY GROSS REVENUE REPORT') {
      casinoItems.push({ lineIdx: i, name: lines[i] });
    }
  }

  // Pair each slot item with the first casino name that comes after it
  const results = [];
  for (const slot of slotItems) {
    const nextCasino = casinoItems.find(c => c.lineIdx > slot.lineIdx);
    if (!nextCasino) continue;

    const winPct = slot.winPct;
    const paybackPct = parseFloat((100 - winPct).toFixed(2));

    results.push({
      casino_name: nextCasino.name,
      payback_pct: paybackPct,
      machine_count: null, // units are merged with amounts in text, not reliably parseable
    });
  }

  return results;
}

async function scrapeNJ() {
  console.log('\n🎰 NJ Division of Gaming Enforcement — Monthly Gross Revenue Reports');
  console.log('─'.repeat(60));

  const { url, reportMonth } = await findLatestNJReportUrl();
  console.log(`  Report month: ${reportMonth}`);

  console.log('  Downloading PDF...');
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Research-Bot/1.0 (data@findjackpots.com)' },
  });

  const pdf = await pdfParse(Buffer.from(resp.data));
  console.log(`  Extracted ${pdf.text.length.toLocaleString()} chars`);

  const records = parseNJPDF(pdf.text);
  console.log(`  Parsed ${records.length} casino records`);

  // NJ casino name → DB name mappings for edge cases
  const NAME_OVERRIDES = {
    "BALLY'S ATLANTIC CITY": "Bally's Atlantic City",
    "BORGATA HOTEL CASINO & SPA": "Borgata Hotel Casino & Spa",
    "CAESARS ATLANTIC CITY": "Caesars Atlantic City",
    "GOLDEN NUGGET": "Golden Nugget Atlantic City",
    "HARD ROCK ATLANTIC CITY": "Hard Rock Hotel & Casino Atlantic City",
    "HARRAH'S ATLANTIC CITY": "Harrah's Resort Atlantic City",
    "OCEAN CASINO RESORT": "Ocean Casino Resort",
    "RESORTS CASINO HOTEL": "Resorts Casino Hotel",
    "TROPICANA CASINO & RESORT": "Tropicana Atlantic City",
  };

  let inserted = 0;
  for (const rec of records) {
    const searchName = NAME_OVERRIDES[rec.casino_name] || rec.casino_name;
    const casinoId = await findCasinoId(searchName, 'NJ');

    if (!casinoId) {
      console.warn(`  ⚠️  No DB match for: "${rec.casino_name}"`);
      continue;
    }

    const n = await storePayback(casinoId, rec.payback_pct, reportMonth, url);
    inserted += n;
    console.log(`  ✅ ${rec.casino_name} → ${rec.payback_pct}% payback (${rec.machine_count || '?'} machines)`);
  }

  console.log(`\n  NJ: ${inserted} records inserted/updated for ${reportMonth}`);
  return { inserted, reportMonth, count: records.length };
}

// ── PA scraper ────────────────────────────────────────────────────────────────

/**
 * Find the latest PA Gaming Revenue Excel from the PGCB site.
 * Dynamically scrapes the revenue page for the Slots Excel URL.
 */
async function findLatestPAReportUrl() {
  console.log('  Fetching PA revenue page...');
  const resp = await axios.get(PA_REVENUE, {
    timeout: 15000,
    headers: { 'User-Agent': 'FindJackpots-Research-Bot/1.0' },
  });

  const $ = cheerio.load(resp.data);
  let excelUrl = null;
  let excelFilename = null;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().toLowerCase();
    if (href.includes('.xlsx') && (href.toLowerCase().includes('slot') || text.includes('slot'))) {
      excelUrl = href.startsWith('http') ? href : `https://gamingcontrolboard.pa.gov${href}`;
      excelFilename = href;
    }
  });

  if (!excelUrl) throw new Error('Could not find PA Slots Excel URL on revenue page');
  console.log(`  ✓ Found PA Slots Excel: ${excelUrl}`);
  return excelUrl;
}

/**
 * Parse the PA monthly slots Excel.
 *
 * Structure per casino block (every ~18 rows):
 *   row: [CasinoName, "", "", ...]   ← casino name at col 0
 *   row: ["", "", ...]                ← blank
 *   row: ["", "July 2025", "August 2025", ..., "January 2026", ...]  ← headers
 *   row: ["Wagers",  $$amount, ...]
 *   row: ["Payouts", $$amount, ...]
 *
 * payback = Payouts / Wagers * 100
 */
function parsePAExcel(buffer, targetMonths) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  const results = [];
  let currentCasino = null;
  let headerRow = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = String(row[0] || '').trim();

    // Casino name: non-empty col 0, all other cols empty, not a data label
    const isDataLabel = /wagers|payouts|promotional|adjustments|gross|state tax|lsa|edtf|prhdf|taxable|number|gtr|total/i.test(col0);
    const otherColsEmpty = row.slice(1, 13).every(c => !String(c || '').trim());
    if (col0 && otherColsEmpty && !isDataLabel && col0 !== 'MONTHLY SLOT MACHINE GAMING REVENUES') {
      currentCasino = col0;
      headerRow = null;
      continue;
    }

    // Header row: contains month names like "July 2025"
    if (row.some(c => /July 2025|August 2025/i.test(String(c || '')))) {
      headerRow = row.map(c => String(c || '').trim());
      continue;
    }

    // Wagers row
    if (col0 === 'Wagers' && currentCasino && headerRow) {
      const wagersRow = row;
      const payoutsRow = rows[i + 1] || [];

      for (const targetMonth of targetMonths) {
        // Find column index for this month
        const colIdx = headerRow.findIndex(h =>
          h.toLowerCase() === targetMonth.label.toLowerCase()
        );
        if (colIdx < 0) continue;

        const wagersStr = String(wagersRow[colIdx] || '');
        const payoutsStr = String(payoutsRow[colIdx] || '');

        if (!wagersStr || !payoutsStr) continue;

        const wagers  = parseAmountStr(wagersStr);
        const payouts = parseAmountStr(payoutsStr);

        if (isNaN(wagers) || wagers <= 0 || isNaN(payouts)) continue;

        const paybackPct = parseFloat((payouts / wagers * 100).toFixed(2));

        results.push({
          casino_name: currentCasino,
          payback_pct: paybackPct,
          report_month: targetMonth.reportMonth,
        });
      }
    }
  }

  return results;
}

/**
 * Determine which months to extract from the PA Excel.
 * Excel covers FY 2025-2026 (July 2025 – June 2026).
 * We grab the most recent completed month(s).
 */
function getPATargetMonths() {
  const now = new Date();
  const targets = [];

  // PA fiscal year starts July — determine available months
  // Reports typically posted mid-month for previous month
  for (let offset = 1; offset <= 2; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const monthName = MONTHS[d.getMonth()];
    const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    // Check if this month is in current FY (July 2025 – June 2026)
    const fyStart = d >= new Date(2025, 6, 1) && d < new Date(2026, 6, 1);
    if (fyStart) {
      targets.push({
        label: `${cap} ${year}`,
        reportMonth: `${year}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
      });
    }
  }

  // Also try Jan 2026 directly since we know it's there
  const janExists = targets.find(t => t.label === 'January 2026');
  if (!janExists) {
    targets.push({ label: 'January 2026', reportMonth: '2026-01-01' });
  }

  return targets;
}

// PA casino name → DB name mappings (null = not in DB, skip)
const PA_NAME_MAP = {
  'Mohegan Pennsylvania':                 null, // not in DB (Mohegan Sun Pocono)
  'Parx Casino':                          'Parx Casino',
  "Harrah's Philadelphia":                "Harrah's Philadelphia Casino & Racetrack",
  'Presque Isle':                         null, // not in DB
  'Hollywood Casino at the Meadows':      null, // not in DB
  'Mount Airy':                           null, // not in DB
  'Hollywood Casino at Penn National':    'Hollywood Casino at Penn National Race Course',
  'Wind Creek':                           'Wind Creek Bethlehem',
  'Rivers Pittsburgh':                    'Rivers Casino Pittsburgh',
  'Rivers Philadelphia':                  'Rivers Casino Philadelphia',
  'Valley Forge':                         'Valley Forge Casino Resort',
  'Nemacolin':                            null, // not in DB
  'Live! Casino Pittsburgh':              null, // not in DB
  'Live! Casino Philadelphia':            null, // not in DB
  'Hollywood Casino York':                null, // not in DB
  'Hollywood Casino Morgantown':          null, // not in DB
  'Parx Shippensburg':                    null, // not in DB
};

async function scrapePA() {
  console.log('\n🎰 Pennsylvania Gaming Control Board — Monthly Slots Revenue');
  console.log('─'.repeat(60));

  const excelUrl = await findLatestPAReportUrl();

  console.log('  Downloading Excel...');
  const resp = await axios.get(excelUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Research-Bot/1.0' },
  });

  const targetMonths = getPATargetMonths();
  console.log(`  Target months: ${targetMonths.map(t => t.label).join(', ')}`);

  const records = parsePAExcel(Buffer.from(resp.data), targetMonths);
  console.log(`  Parsed ${records.length} casino-month records`);

  let inserted = 0;
  const seen = new Set();

  for (const rec of records) {
    const key = `${rec.casino_name}|${rec.report_month}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Map to DB name
    const mapped = PA_NAME_MAP[rec.casino_name];
    if (mapped === null) {
      // Explicitly not in DB, skip silently
      continue;
    }
    const searchName = mapped || rec.casino_name;
    const casinoId = await findCasinoId(searchName, 'PA');

    if (!casinoId) {
      console.warn(`  ⚠️  No DB match for: "${rec.casino_name}" (tried "${searchName}")`);
      continue;
    }

    const n = await storePayback(casinoId, rec.payback_pct, rec.report_month, excelUrl);
    inserted += n;
    console.log(`  ✅ ${rec.casino_name} (${rec.report_month}) → ${rec.payback_pct}% payback`);
  }

  console.log(`\n  PA: ${inserted} records inserted/updated`);
  return { inserted, count: records.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('📊 FindJackpots — NJ/PA Slot Payout Scraper\n');
  console.log(`Database: ${process.env.DATABASE_URL ? 'connected' : 'NOT SET'}`);

  let totalInserted = 0;

  // NJ
  try {
    const njResult = await scrapeNJ();
    totalInserted += njResult.inserted;
  } catch (err) {
    console.error(`\n❌ NJ scraper failed: ${err.message}`);
  }

  // PA
  try {
    const paResult = await scrapePA();
    totalInserted += paResult.inserted;
  } catch (err) {
    console.error(`\n❌ PA scraper failed: ${err.message}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Total records inserted/updated: ${totalInserted}`);
  console.log(`${'═'.repeat(60)}\n`);

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
