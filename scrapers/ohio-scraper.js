/**
 * Ohio Casino Revenue Scraper
 * Source: https://casinocontrol.ohio.gov/about/revenue-reports
 * Format: Excel file with one sheet per casino, columns include "Slot Payout %"
 *
 * Ohio publishes "Slot Payout %" which is the % returned to players.
 * No conversion needed (unlike hold% states).
 *
 * Run: node ohio-scraper.js
 */

require('dotenv').config();
const axios = require('axios');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const REMOTE_DB = process.env.PROD_DATABASE_URL || 
  `postgresql://findjackpots-db:${process.env.PROD_DB_PASS}@app-4de65bbd-1f1c-4198-bb13-4d77de20bbfd-do-user-34822266-0.g.db.ondigitalocean.com:25060/findjackpots-db?sslmode=require`;

const pools = [
  new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap' }),
  new Pool({ connectionString: REMOTE_DB }),
];

const OHIO_REPORTS_URL = 'https://casinocontrol.ohio.gov/about/revenue-reports';

// Map sheet names (as they appear in Excel) to DB search terms
const SHEET_TO_DB = {
  'JACK CLEVELAND':     { state: 'OH', search: 'JACK Cleveland' },
  'HOLLYWOOD COLUMBUS': { state: 'OH', search: 'Hollywood Casino Columbus' },
  'HARD ROCK CINCINNATI': { state: 'OH', search: 'Hard Rock Casino Cincinnati' },
  'HOLLYWOOD TOLEDO':   { state: 'OH', search: 'Hollywood Casino at Toledo' },
  // Additional casinos if they appear in future reports
  'JACK CINCINNATI':    { state: 'OH', search: 'JACK Cincinnati' },
  'JACK THISTLEDOWN':   { state: 'OH', search: 'JACK Thistledown' },
  'MGM NORTHFIELD':     { state: 'OH', search: 'MGM Northfield' },
  'BELTERRA PARK':      { state: 'OH', search: 'Belterra Park' },
  'HOLLYWOOD MAHONING': { state: 'OH', search: 'Hollywood Gaming at Mahoning' },
};

async function findCasinoId(pool, searchTerm, state) {
  const words = searchTerm.split(/\s+/).filter(w => w.length > 3 && !/casino|hotel|resort|gaming/i.test(w));
  
  // Try full name
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = $1 AND name ILIKE $2 LIMIT 1`,
    [state, `%${searchTerm}%`]
  );
  if (r.rows.length) return r.rows[0];
  
  // Try key words
  for (const word of words) {
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

async function findLatestOhioExcelUrl() {
  const resp = await axios.get(OHIO_REPORTS_URL, { timeout: 15000, headers: { 'User-Agent': 'FindJackpots-Bot/1.0' } });
  const $ = cheerio.load(resp.data);
  
  let excelUrl = null;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().toLowerCase();
    if (href.includes('.xlsx') && text.includes('excel') && href.includes('Casino')) {
      // Prefer 2026 report
      if (!excelUrl || href.includes('2026')) excelUrl = href;
    }
  });
  
  if (!excelUrl) throw new Error('No Ohio Excel URL found');
  return excelUrl.startsWith('http') ? excelUrl : `https://dam.assets.ohio.gov${excelUrl}`;
}

function parseOhioExcel(buffer, sourceUrl) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const results = [];
  
  for (const sheetName of wb.SheetNames) {
    if (sheetName === 'STATEWIDE' || sheetName === 'REVENUE REPORTING NOTES') continue;
    
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    
    // Find header row with "Slot Payout %"
    let headerIdx = -1;
    let slotPayoutColIdx = -1;
    let monthColIdx = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const joined = row.join('|').toLowerCase();
      if (joined.includes('slot payout')) {
        headerIdx = i;
        for (let j = 0; j < row.length; j++) {
          if (String(row[j]).toLowerCase().includes('slot payout')) slotPayoutColIdx = j;
          if (String(row[j]).toLowerCase() === 'month') monthColIdx = j;
        }
        break;
      }
    }
    
    if (headerIdx < 0 || slotPayoutColIdx < 0) continue;
    
    // Get the report month from title row (row 0 usually has "2026 CASINO NAME CASINO REVENUE")
    let reportYear = new Date().getFullYear();
    const titleRow = rows[0]?.[0] || '';
    const yearMatch = String(titleRow).match(/^(\d{4})/);
    if (yearMatch) reportYear = parseInt(yearMatch[1]);
    
    // Process data rows (skip Total rows)
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const monthStr = String(row[monthColIdx] || '').trim();
      const slotPayoutStr = String(row[slotPayoutColIdx] || '').trim();
      
      if (!monthStr || monthStr.toLowerCase() === 'total') continue;
      if (!slotPayoutStr) continue;
      
      // Parse month name to date
      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const monthIdx = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
      if (monthIdx < 0) continue;
      
      // Parse payout %: "92.67%" or "92.67"
      const pct = parseFloat(slotPayoutStr.replace('%', '').trim());
      if (isNaN(pct) || pct < 50 || pct > 100) continue;
      
      const reportMonth = `${reportYear}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      
      results.push({
        sheetName,
        reportMonth,
        paybackPct: pct,
      });
    }
  }
  
  return results;
}

async function run() {
  console.log('🎰 Ohio Casino Revenue Scraper\n');
  const startTime = Date.now();
  
  let excelUrl;
  try {
    excelUrl = await findLatestOhioExcelUrl();
    console.log(`Found Excel: ${excelUrl}`);
  } catch (err) {
    // Fallback to known URL
    excelUrl = 'https://dam.assets.ohio.gov/raw/upload/v1772208620/casinocontrol.ohio.gov/revenue-reports/2026/Casino/2026_Ohio_Casino_Monthly_Revenue_Report01.xlsx';
    console.log(`Using fallback URL: ${excelUrl}`);
  }
  
  console.log('Downloading Excel...');
  const resp = await axios.get(excelUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'FindJackpots-Bot/1.0' },
  });
  
  const records = parseOhioExcel(Buffer.from(resp.data), excelUrl);
  console.log(`Parsed ${records.length} casino-month records from ${[...new Set(records.map(r => r.sheetName))].length} casinos\n`);
  
  let inserted = 0;
  const dbInfo = SHEET_TO_DB;
  
  for (const rec of records) {
    const info = dbInfo[rec.sheetName];
    const searchTerm = info ? info.search : rec.sheetName;
    
    for (const pool of pools) {
      try {
        const casino = await findCasinoId(pool, searchTerm, 'OH');
        if (!casino) {
          // Only warn once (first pool)
          if (pool === pools[0]) console.warn(`  ⚠️  No DB match for sheet: "${rec.sheetName}"`);
          continue;
        }
        await storePayback(pool, casino.id, rec.paybackPct, rec.reportMonth, excelUrl);
        if (pool === pools[0]) {
          console.log(`  ✅ ${casino.name} (${rec.reportMonth}): ${rec.paybackPct}% payback`);
          inserted++;
        }
      } catch (err) {
        console.error(`  DB error [${rec.sheetName}]: ${err.message}`);
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Ohio done in ${elapsed}s — ${inserted} records inserted/updated`);
  
  for (const pool of pools) {
    await pool.query(
      `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
       VALUES ('ohio-scraper', $1, $2, $3)`,
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
