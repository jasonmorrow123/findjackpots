/**
 * Nevada Gaming Control Board — Slot Payback PDF Scraper
 * 
 * The NGCB publishes monthly gaming revenue reports as PDFs.
 * These contain official slot machine payback percentages by casino.
 * 
 * Source: https://gaming.nv.gov/stats-and-reports/gaming-revenue-reports/
 * Format: PDF tables with casino name, machine count, % payback by denomination
 * 
 * Run: node gov-pdf-scraper.js
 * Schedule: Monthly (1st of each month)
 */

require('dotenv').config();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Nevada GCB report index page (updated URL — site restructured 2025)
const NGCB_INDEX = 'https://www.gaming.nv.gov/about-us/gaming-revenue-information-gri/';

// New Jersey DGE (Atlantic City)
const DGE_INDEX  = 'https://www.nj.gov/oag/ge/gamingrevenuereports.html';

// Pennsylvania Gaming Control Board
const PGCB_INDEX = 'https://gamingcontrolboard.pa.gov/gaming-revenue-reports/';

/**
 * Parse PDF text into structured slot payback records.
 * Uses GPT-4o-mini if OPENAI_API_KEY is set, otherwise falls back to regex.
 */
async function parsePaybackFromPDF(pdfText, reportMonth, state) {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    return parsePaybackWithLLM(pdfText, reportMonth, state);
  }
  console.log('  ℹ️  No OpenAI key — using regex parser (add OPENAI_API_KEY for better accuracy)');
  return parsePaybackWithRegex(pdfText);
}

async function parsePaybackWithLLM(pdfText, reportMonth, state) {
  const prompt = `You are parsing a state gaming control board monthly revenue report PDF.
Extract slot machine payback percentages for each casino property listed.
Return a JSON array. If no data found, return [].

Report month: ${reportMonth}
State: ${state}

PDF text (first 4000 chars):
${pdfText.slice(0, 4000)}

Return array:
[{
  "casino_name": "Bellagio Hotel Casino",
  "denomination": "all",
  "payback_pct": 94.23,
  "machine_count": 1200
}]

Notes:
- payback_pct should be a number like 94.23, NOT "94.23%"
- If multiple denominations are listed per casino, include one entry per denomination
- "all" denomination = overall average if only one row per casino
`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 2000,
  });
  try {
    const content = response.choices[0].message.content.trim();
    const json = content.match(/\[[\s\S]*\]/)?.[0];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Regex-based fallback parser for NGCB GRI PDFs.
 * These reports have consistent table formatting:
 *   CASINO NAME   machine_count   revenue   payback%
 */
function parsePaybackWithRegex(pdfText) {
  const results = [];
  const lines = pdfText.split('\n').map(l => l.trim()).filter(Boolean);

  // NGCB GRI format: lines contain casino name followed by numbers
  // Payback % appears as e.g. "94.23" or "94.2" at end of row
  // Pattern: casino name line, then a line with numbers including payback %
  const denomPatterns = [
    { key: 'penny',      re: /1¢|penny|\.01/i },
    { key: 'nickel',     re: /5¢|nickel|\.05/i },
    { key: 'quarter',    re: /25¢|quarter|\.25/i },
    { key: 'dollar',     re: /\$1|dollar|1\.00/i },
    { key: 'five_dollar',re: /\$5|five dollar|5\.00/i },
    { key: 'multi',      re: /multi|multiple/i },
  ];

  let currentDenom = 'all';
  let currentCasino = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect denomination headers
    for (const dp of denomPatterns) {
      if (dp.re.test(line) && line.length < 40) {
        currentDenom = dp.key;
        currentCasino = null;
        break;
      }
    }

    // Match lines that look like casino data rows
    // NGCB rows: casino name ... number_of_machines ... payback_pct
    // Payback % is typically 85.00 – 99.99 range
    const dataMatch = line.match(/^(.+?)\s+(\d{1,5})\s+[\d,]+(?:\s+[\d,]+)*\s+(8[5-9]\.\d{1,2}|9[0-9]\.\d{1,2})(?:\s|$)/);
    if (dataMatch) {
      const casino_name = dataMatch[1].replace(/\s+/g, ' ').trim();
      const machine_count = parseInt(dataMatch[2]);
      const payback_pct = parseFloat(dataMatch[3]);
      if (casino_name.length > 3 && casino_name.length < 60) {
        results.push({ casino_name, denomination: currentDenom, payback_pct, machine_count });
      }
      continue;
    }

    // Alternative: detect standalone payback % after a casino name line
    // Some PDFs split casino name and stats across lines
    const pctOnly = line.match(/^(8[5-9]\.\d{1,2}|9[0-9]\.\d{1,2})$/);
    if (pctOnly && currentCasino) {
      results.push({ casino_name: currentCasino, denomination: currentDenom, payback_pct: parseFloat(pctOnly[1]), machine_count: null });
      currentCasino = null;
      continue;
    }

    // Looks like a casino name line (text only, reasonable length)
    if (/^[A-Z][A-Za-z\s&',.-]{4,50}$/.test(line) && !/total|subtotal|average|grand|source|nevada|page|slot/i.test(line)) {
      currentCasino = line;
    }
  }

  return results;
}

/**
 * Fuzzy-match casino name to get casino_id
 * (PDF names often differ slightly from our stored names)
 */
async function findCasinoId(pdfName, state) {
  // Try exact match first
  let r = await pool.query(
    `SELECT id FROM casinos WHERE LOWER(name) = LOWER($1) AND state = $2`,
    [pdfName, state]
  );
  if (r.rows.length) return r.rows[0].id;

  // Try LIKE match (partial)
  const words = pdfName.split(' ').filter((w) => w.length > 3);
  for (const word of words) {
    r = await pool.query(
      `SELECT id FROM casinos WHERE name ILIKE $1 AND state = $2 LIMIT 1`,
      [`%${word}%`, state]
    );
    if (r.rows.length) return r.rows[0].id;
  }

  return null;
}

/**
 * Store payback records
 */
async function storePaybackData(records, reportMonth, state) {
  let added = 0;
  for (const rec of records) {
    if (!rec.casino_name || !rec.payback_pct) continue;

    const casinoId = await findCasinoId(rec.casino_name, state);
    if (!casinoId) {
      console.warn(`  ⚠️  No match for "${rec.casino_name}" — consider adding to DB`);
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO slot_payback 
           (casino_id, report_month, denomination, payback_pct, machine_count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (casino_id, report_month, denomination) DO UPDATE SET
           payback_pct = EXCLUDED.payback_pct,
           machine_count = EXCLUDED.machine_count`,
        [casinoId, reportMonth, rec.denomination || 'all', rec.payback_pct, rec.machine_count]
      );
      added++;
    } catch (err) {
      console.error(`  DB error for ${rec.casino_name}: ${err.message}`);
    }
  }
  return added;
}

/**
 * Download and parse a single PDF report
 */
async function processPDFReport(pdfUrl, reportMonth, state) {
  console.log(`  Downloading: ${pdfUrl}`);

  const response = await axios.get(pdfUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'JackpotMap-Research-Bot/1.0 (data@jackpotmap.com)' },
  });

  const data = await pdfParse(Buffer.from(response.data));
  console.log(`  PDF text extracted: ${data.text.length} chars`);

  const records = await parsePaybackFromPDF(data.text, reportMonth, state);
  console.log(`  Parsed ${records.length} casino records`);

  const added = await storePaybackData(records, reportMonth, state);
  console.log(`  ✅ ${added} records stored`);

  return { records: records.length, added };
}

/**
 * Scrape the NGCB index page to find the latest PDF report URL
 * (In production, parse the actual index page HTML)
 */
async function getLatestNGCBReportUrl() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(NGCB_INDEX, { waitUntil: 'networkidle', timeout: 25000 });

  // Find the first real GRI PDF link (skip ADA helper links)
  const links = await page.$$eval('a[href*=".pdf"]', els =>
    els
      .map(e => ({ text: e.textContent.trim(), href: e.href }))
      .filter(l => !l.href.includes('adahelp') && l.text.match(/GRI\s+\w+\s+\d{4}/i))
  );
  await browser.close();

  if (!links.length) throw new Error('No GRI PDF links found on NGCB page');

  // First link is latest
  const latest = links[0];
  console.log(`  Found latest: ${latest.text} → ${latest.href}`);

  // Parse month from link text e.g. "GRI Jan 2026"
  const match = latest.text.match(/(\w+)\s+(\d{4})/i);
  const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  let reportMonth = null;
  if (match) {
    const m = months[match[1].toLowerCase()];
    const y = match[2];
    if (m && y) reportMonth = `${y}-${String(m).padStart(2,'0')}-01`;
  }
  reportMonth = reportMonth || new Date().toISOString().slice(0, 7) + '-01';

  return { url: latest.href, month: reportMonth };
}

/**
 * Parse area-level slot win percentages from NGCB GRI PDF.
 * These are area aggregates (e.g. "Las Vegas Strip $72M+ range").
 * Individual casino-level payback data is in the Location Detail Report (separate).
 */
function parseAreaPaybackFromPDF(pdfText) {
  const results = [];
  const lines = pdfText.split('\n').map(l => l.trim()).filter(Boolean);

  let currentArea = null;
  let currentRange = null;

  // NGCB GRI PDF format: data is packed on single lines with no spaces between values
  // e.g. "1 Cent28528,378122,755(30.52)8.8228628,713378,435(26.19)8.7429230,9051,700,469(26.50)8.98"
  // The 3-month win% is the 2nd-to-last number, current month is 3rd group
  // Layout: [denom][loc][units][win][%chg][win%] × 3 periods
  // Win% = last decimal in each group — we take the FIRST (current month) win%

  const DENOM_NAMES = {
    '1 Cent': 'penny', '5 Cent': 'nickel', '25 Cent': 'quarter',
    '1 Dollar': 'dollar', '5 Dollar': 'five_dollar', '5 Dollars': 'five_dollar',
    '25 Dollar': 'twenty_five_dollar', '25 Dollars': 'twenty_five_dollar',
    '100 Dollar': 'hundred_dollar', '100 Dollars': 'hundred_dollar',
    'Multi Denomination': 'multi', 'Other': 'other',
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect area section headers
    // e.g. "Clark County Las Vegas Strip Area - $72,000,000 and Over Revenue Range"
    const areaMatch = line.match(/^(.+?)\s*[-–]\s*(\$[\d,]+ and Over|\$[\d,]+ to \$[\d,]+|All Nonrestricted) Revenue Range/i);
    if (areaMatch) {
      currentArea = areaMatch[1].replace(/^Nevada Gaming Control Board\s*/i, '').trim();
      currentRange = areaMatch[2].trim();
      continue;
    }
    // e.g. "Clark County Las Vegas Strip Area - All Nonrestricted Locations"
    const allMatch = line.match(/^(.+?)\s*[-–]\s*All Nonrestricted Locations/i);
    if (allMatch) {
      currentArea = allMatch[1].trim();
      currentRange = 'All';
      continue;
    }

    if (!currentArea) continue;

    // Match slot denomination data lines — they start with the denom name followed immediately by digits
    // e.g. "1 Cent28528,378122,755(30.52)8.82 ..."
    for (const [denomKey, denomVal] of Object.entries(DENOM_NAMES)) {
      if (!line.startsWith(denomKey)) continue;
      // Extract all decimal numbers from the line — win% values are small decimals (4-20 range)
      const decimals = [...line.matchAll(/\b(\d{1,2}\.\d{2})\b/g)]
        .map(m => parseFloat(m[1]))
        .filter(n => n >= 3 && n <= 20); // slot win% is always in this range

      if (decimals.length > 0) {
        const winPct = decimals[0]; // first match = current month win%
        results.push({
          area: currentArea,
          range: currentRange,
          denomination: denomVal,
          win_pct: winPct,
          payback_pct: parseFloat((100 - winPct).toFixed(2)),
        });
      }
      break;
    }
  }
  return results;
}

async function run() {
  console.log('📊 JackpotMap Government Data Scraper (Nevada GCB)\n');

  const { url, month } = await getLatestNGCBReportUrl();
  console.log(`Report month: ${month}`);
  console.log(`PDF URL: ${url}\n`);

  console.log('  Downloading PDF...');
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'JackpotMap-Research-Bot/1.0' },
  });
  const data = await pdfParse(Buffer.from(response.data));
  console.log(`  Extracted ${data.text.length.toLocaleString()} chars from PDF`);

  // Parse area-level data
  const areaResults = parseAreaPaybackFromPDF(data.text);
  console.log(`\n📊 Area-level slot win % data (${areaResults.length} records):`);
  
  // Show the Las Vegas Strip data as a highlight
  const stripData = areaResults.filter(r => r.area.includes('Las Vegas Strip'));
  if (stripData.length) {
    console.log('\n🎰 Las Vegas Strip slot payback by denomination:');
    stripData.forEach(r => {
      console.log(`  ${r.denomination.padEnd(20)} Win%: ${r.win_pct}%  →  Payback: ${r.payback_pct}%  (${r.range})`);
    });
  }

  // Store area-level data as a note — the GRI report is aggregates, not per-casino
  // Per-casino data requires the NGCB Location Detail Report (different dataset)
  console.log(`\n⚠️  Note: NGCB GRI report contains area aggregates, not per-casino data.`);
  console.log(`   Per-casino payback % requires the NGCB Location Detail Report.`);
  console.log(`   URL: https://www.gaming.nv.gov/link/a815f636ade64626ac8975a00425efcc.aspx`);
  console.log(`\n✅ Area data parsed successfully. ${areaResults.length} records extracted.`);
  console.log(`   All data written to: ngcb-area-data-${month}.json`);

  // Save to JSON for now
  const fs = require('fs');
  fs.writeFileSync(
    `ngcb-area-data-${month}.json`,
    JSON.stringify({ reportMonth: month, source: url, records: areaResults }, null, 2)
  );

  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('gov-pdf-scraper', 'success', $1, NOW())`,
    [areaResults.length]
  ).catch(() => {});

  await pool.end();
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
