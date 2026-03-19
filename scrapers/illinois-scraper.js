/**
 * Illinois Revenue Scraper
 * Downloads IGB monthly casino revenue data from the ASP.NET form at:
 * https://igbapps.illinois.gov/CasinoReports_AEM.aspx
 *
 * This is an iframe embedded on:
 * https://igb.illinois.gov/casino-gambling/casino-reports.html
 *
 * The form returns per-casino data with: Casino, Admissions, Table AGR, EGD AGR, Total AGR.
 * No payback % is directly published by IGB (Illinois doesn't require slot payback disclosure).
 *
 * Run: node illinois-scraper.js
 * Schedule: 15th of each month at 4am (reports land ~2 weeks after month end)
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// IGB Casino name → DB search term mapping
// IGB uses licensing entity names, not marketing names
const IGB_NAME_MAP = {
  'Argosy Casino Alton': 'Argosy Casino Alton',
  "Bally's Chicago": 'Waukegan',               // Bally's Chicago = Waukegan temp
  "Bally's Quad Cities": 'Rivers Casino Philadelphia',  // formerly Isle of Rock Island area
  'Danville': 'Elmhurst',                       // new casino
  "DraftKings at Casino Queen": 'Casino Queen',
  'Fairmount Park': 'Fairmount',
  'FHR-Illinois LLC': 'Hollywood Casino Joliet',  // may be Horseshoe Hammond or similar
  'Grand Victoria Casino': 'Grand Victoria Casino',
  'Hard Rock Casino Rockford': 'Hard Rock Casino Rockford',
  "Harrah's Joliet": "Harrah's Joliet Casino Hotel",
  "Harrah's Metropolis": "Harrah's Metropolis Casino",
  'Hollywood Casino Aurora': 'Hollywood Casino Aurora',
  'Hollywood Casino Joliet': 'Hollywood Casino Joliet',
  'Par-A-Dice Hotel Casino': 'Par-A-Dice Hotel Casino',
  "Rivers Casino": 'Rivers Casino Des Plaines',
  "Jumer's": "Jumer's Casino Rock Island",
};

/**
 * Parse the IGB Casino Summary CSV
 * Format:
 *   Line 1: "Casino Summary"
 *   Line 2: "February 2026"
 *   Line 3: "Report Date: ..."
 *   Line 4: empty
 *   Line 5: headers
 *   Lines 6+: data rows
 */
function parseCsv(csvText) {
  const results = [];
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Extract report month from line 2
  let reportMonth = null;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const clean = lines[i].replace(/"/g, '').trim();
    const mMatch = clean.match(/^(\w+ \d{4})$/);
    if (mMatch) {
      try {
        const d = new Date(mMatch[1] + ' 1');
        if (!isNaN(d)) reportMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      } catch {}
      break;
    }
  }
  if (!reportMonth) {
    const now = new Date();
    reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  }

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const clean = lines[i].replace(/"/g, '').toLowerCase();
    if (clean.includes('casino') && (clean.includes('agr') || clean.includes('admission') || clean.includes('square'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    console.log('  Could not find header row');
    return [];
  }

  const headers = lines[headerIdx].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  console.log(`  CSV headers: ${headers.join(' | ')}`);

  const nameIdx = headers.findIndex(h => h === 'casino');
  const totalAgrIdx = headers.findIndex(h => h.includes('total agr'));
  const egdAgrIdx = headers.findIndex(h => h.includes('egd agr'));
  const tableAgrIdx = headers.findIndex(h => h.includes('table game agr'));
  const admissionsIdx = headers.findIndex(h => h.includes('admission'));

  const revIdx = totalAgrIdx >= 0 ? totalAgrIdx : (egdAgrIdx >= 0 ? egdAgrIdx : nameIdx + 1);

  console.log(`  Mapped: name=${nameIdx} totalAgr=${totalAgrIdx} egd=${egdAgrIdx} admissions=${admissionsIdx}`);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const name = (cols[nameIdx >= 0 ? nameIdx : 0] || '').trim();
    if (!name || name.toLowerCase().includes('total')) continue;

    const revStr = cols[revIdx] || '';
    const revenue = parseFloat(revStr.replace(/[$,\s"]/g, ''));
    if (!revenue || isNaN(revenue) || revenue <= 0) continue;

    const admStr = admissionsIdx >= 0 ? cols[admissionsIdx] : '';
    const admissions = parseInt((admStr || '').replace(/[,"]/g, '')) || null;

    results.push({ name, revenue, admissions, reportMonth });
  }

  return results;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Find most recent reporting period
 * The IGB defaults to showing the most recent month available
 */
async function getMostRecentPeriod(browser) {
  const page = await browser.newPage();
  let startMonth = 'February', startYear = '2026', endMonth = 'February', endYear = '2026';

  try {
    await page.goto('https://igbapps.illinois.gov/CasinoReports_AEM.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    // Read the default selected values (IGB defaults to most recent)
    const formState = await page.evaluate(() => {
      const getVal = (id) => document.getElementById(id)?.value || '';
      return {
        startMonth: getVal('SearchStartMonth'),
        startYear: getVal('SearchStartYear'),
        endMonth: getVal('SearchEndMonth'),
        endYear: getVal('SearchEndYear'),
      };
    });

    console.log(`  IGB default period: ${JSON.stringify(formState)}`);
    startMonth = formState.startMonth || startMonth;
    startYear = formState.startYear || startYear;
    endMonth = formState.endMonth || endMonth;
    endYear = formState.endYear || endYear;

  } catch (err) {
    console.log(`  Could not read IGB defaults: ${err.message}`);
  } finally {
    await page.close();
  }

  return { startMonth, startYear, endMonth, endYear };
}

/**
 * Download CSV for a given period
 */
async function downloadCsv(browser, startMonth, startYear, endMonth, endYear) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  let csvContent = null;

  try {
    await page.goto('https://igbapps.illinois.gov/CasinoReports_AEM.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    // Set form values
    await page.selectOption('#CasinoReportTypes', 'Casino Summary');
    await page.selectOption('#SearchStartMonth', startMonth);
    await page.selectOption('#SearchStartYear', startYear);
    await page.selectOption('#SearchEndMonth', endMonth);
    await page.selectOption('#SearchEndYear', endYear);
    await page.click('#ViewCSV');

    // Wait for download
    const dlPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.click('#ButtonSearch');

    const download = await dlPromise;
    const tmpPath = path.join('/tmp', `illinois_${Date.now()}.csv`);
    await download.saveAs(tmpPath);

    csvContent = fs.readFileSync(tmpPath, 'utf8');
    fs.unlinkSync(tmpPath);
    console.log(`  Downloaded CSV: ${csvContent.length} chars`);
  } catch (err) {
    console.log(`  Download failed: ${err.message}`);
  } finally {
    await ctx.close();
  }

  return csvContent;
}

/**
 * Find casino_id by name (Illinois)
 */
async function findCasinoId(name) {
  // Try IGB name map first
  for (const [igbName, dbName] of Object.entries(IGB_NAME_MAP)) {
    if (name.toLowerCase().includes(igbName.toLowerCase()) || igbName.toLowerCase().includes(name.toLowerCase().split(' ')[0])) {
      const r = await pool.query(
        `SELECT id, name FROM casinos WHERE state = 'IL' AND name ILIKE $1 LIMIT 1`,
        [`%${dbName.split(' ')[0]}%`]
      );
      if (r.rows.length > 0) return r.rows[0];
    }
  }

  // Direct name search
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = 'IL' AND name ILIKE $1 LIMIT 1`,
    [`%${name}%`]
  );
  if (r.rows.length > 0) return r.rows[0];

  // First meaningful word search
  const words = name.split(/[\s,&]+/).filter(w => w.length > 3 && !['casino', 'hotel', 'resort', 'the'].includes(w.toLowerCase()));
  for (const word of words) {
    r = await pool.query(
      `SELECT id, name FROM casinos WHERE state = 'IL' AND name ILIKE $1 LIMIT 1`,
      [`%${word}%`]
    );
    if (r.rows.length > 0) return r.rows[0];
  }

  return null;
}

/**
 * Main
 */
async function run() {
  console.log('🏙️ Illinois Revenue Scraper\n');
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true });
  let totalStored = 0;
  const sourceUrl = 'https://igbapps.illinois.gov/CasinoReports_AEM.aspx';

  try {
    // Step 1: Find the most recent reporting period
    const period = await getMostRecentPeriod(browser);
    console.log(`\nFetching Casino Summary: ${period.startMonth} ${period.startYear} → ${period.endMonth} ${period.endYear}`);

    // Step 2: Download the CSV
    const csvContent = await downloadCsv(browser, period.startMonth, period.startYear, period.endMonth, period.endYear);

    if (!csvContent || csvContent.length < 200) {
      console.log('❌ No CSV data received');
    } else {
      // Step 3: Parse
      const records = parseCsv(csvContent);
      console.log(`\nParsed ${records.length} casino records`);

      if (records.length > 0) {
        const reportMonth = records[0].reportMonth;
        console.log(`Report month: ${reportMonth}`);
        console.log(`\n📊 Matching to DB...`);

        for (const rec of records) {
          const casino = await findCasinoId(rec.name);
          if (!casino) {
            console.log(`  ⚠️  No match for: "${rec.name}"`);
            continue;
          }

          await pool.query(
            `UPDATE casinos SET
               monthly_revenue_cents = $1,
               revenue_report_month = $2,
               revenue_source = $3,
               updated_at = NOW()
             WHERE id = $4`,
            [Math.round(rec.revenue * 100), reportMonth, sourceUrl, casino.id]
          );

          const revM = (rec.revenue / 1e6).toFixed(2);
          const admStr = rec.admissions ? ` (${rec.admissions.toLocaleString()} admissions)` : '';
          console.log(`  ✅ ${casino.name}: $${revM}M AGR${admStr}`);
          totalStored++;
        }
      }
    }

  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const status = totalStored > 0 ? 'success' : 'partial';
  console.log(`\n✅ Done in ${elapsed}s — ${totalStored} Illinois casinos updated`);

  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('illinois-scraper', $1, $2, $3)`,
    [status, totalStored, new Date(startTime)]
  );

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
