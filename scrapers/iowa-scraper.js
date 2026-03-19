/**
 * Iowa Revenue Scraper
 * Scrapes Iowa Racing and Gaming Commission (IRGC) monthly revenue PDF.
 * Reports page: https://irgc.iowa.gov/publications-reports/gaming-revenue
 *
 * Iowa publishes per-casino ADJUSTED GROSS REVENUE and SLOT REVENUE %
 * each month. The SLOT REVENUE PERCENTAGE is the house win percentage;
 * slot payback % = 100 - SLOT REVENUE PERCENTAGE.
 *
 * PDF format: casino names are column headers; metrics are row labels.
 *
 * Run: node iowa-scraper.js
 * Schedule: 10th of each month at 4am (reports land ~10 days after month end)
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const pdfParse = require('pdf-parse');

/**
 * Download file to temp path, following redirects
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const req = proto.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JackpotMap/1.0)' },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    });
    req.on('error', (e) => { file.close(); reject(e); });
  });
}

/**
 * Parse Iowa IRGC gaming revenue PDF.
 *
 * The PDF has a transposed table structure:
 *   Row 1: Casino names (columns)
 *   Row 2: ADJUSTED GROSS REVENUE + dollar values
 *   ...
 *   Row N: SLOT REVENUE PERCENTAGE + percentages
 *
 * We extract:
 *   - ADJUSTED GROSS REVENUE per casino  → monthly_revenue_cents
 *   - SLOT REVENUE PERCENTAGE per casino → slot payback = 100 - slot_revenue_pct
 *   - SLOT COIN IN, SLOT DROP            → (optional, for verification)
 */
function parseIowaPdf(text) {
  const results = [];

  // Split into lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Iowa casino name fragments to identify casino columns in header
  const IOWA_CASINO_NAMES = [
    'Ameristar', 'Casino Queen', 'Catfish Bend', 'Diamond Jo', 'Grand Falls',
    'Hard Rock', "Harrah's", 'Horseshoe', 'Isle Casino', 'Isle of Capri',
    'Lakeside', 'Meskwaki', 'Mystique', 'Prairie Meadows', 'Q Casino',
    'Rhythm City', 'Riverside', 'Wild Rose', 'WinnaVegas', 'Marquette'
  ];

  // Find the report month from header line
  let reportMonthStr = null;
  for (const line of lines) {
    const m = line.match(/GAMING REVENUE REPORT\s*--\s*(\w+ \d{4})/i);
    if (m) {
      reportMonthStr = m[1];
      console.log(`  Report month: ${reportMonthStr}`);
      break;
    }
  }

  // Parse report month to ISO date
  let reportMonth = null;
  if (reportMonthStr) {
    try {
      const d = new Date(reportMonthStr + ' 1');
      if (!isNaN(d)) reportMonth = d.toISOString().split('T')[0];
    } catch {}
  }
  if (!reportMonth) {
    // Fall back to prior month
    const now = new Date();
    reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  }

  // Strategy: Look for ADJUSTED GROSS REVENUE line and extract dollar amounts
  // Then look for SLOT REVENUE PERCENTAGE line and extract percentages
  // The casino names appear on multiple lines before the data rows

  // Collect all casino segments by splitting text at "GAMING REVENUE REPORT" headers
  const reportSections = text.split(/GAMING REVENUE REPORT\s*--\s*\w+ \d{4}/i).filter(s => s.trim());

  for (const section of reportSections) {
    const sectionLines = section.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract casino name block (lines before first metric line)
    // Casino names appear as multi-word names, one per "column"
    // Dollar amounts follow on ADJUSTED GROSS REVENUE line

    // Find ADJUSTED GROSS REVENUE line
    let agrLineIdx = -1;
    let slotRevPctIdx = -1;
    let slotCoinInIdx = -1;

    for (let i = 0; i < sectionLines.length; i++) {
      if (sectionLines[i].toUpperCase().includes('ADJUSTED GROSS REVENUE')) agrLineIdx = i;
      if (sectionLines[i].toUpperCase().includes('SLOT REVENUE PERCENTAGE')) slotRevPctIdx = i;
      if (sectionLines[i].toUpperCase().includes('SLOT COIN IN')) slotCoinInIdx = i;
    }

    if (agrLineIdx < 0) continue;

    // Casino names are in lines before ADJUSTED GROSS REVENUE
    // They're in a "header block" — each casino name is fragmented across lines
    const headerLines = sectionLines.slice(0, agrLineIdx);

    // Extract casino names by joining consecutive non-numeric lines
    // The format alternates casino name fragments: "Ameristar II", "Casino Queen -", "Marquette"
    const casinoNames = extractCasinoNames(headerLines, sectionLines[agrLineIdx]);

    if (casinoNames.length === 0) continue;

    // Extract AGR values from the ADJUSTED GROSS REVENUE line
    const agrLine = sectionLines[agrLineIdx];
    const agrValues = extractDollarAmounts(agrLine);

    // Extract slot revenue percentages
    let slotRevPcts = [];
    if (slotRevPctIdx >= 0) {
      const pctLine = sectionLines[slotRevPctIdx];
      slotRevPcts = extractPercentages(pctLine);
    }

    // Skip "Totals" entry (last column)
    const count = Math.min(casinoNames.length, agrValues.length);
    for (let i = 0; i < count; i++) {
      const name = casinoNames[i].trim();
      if (!name || name.toLowerCase() === 'totals' || name.toLowerCase().includes('total')) continue;

      const agr = agrValues[i];
      const slotRevPct = slotRevPcts[i] ? parseFloat(slotRevPcts[i]) : null;
      const slotPaybackPct = slotRevPct ? (100 - slotRevPct).toFixed(2) : null;

      results.push({
        name,
        revenue: agr,
        slotRevenuePct: slotRevPct,
        slotPaybackPct,
        reportMonth,
      });
    }
  }

  return results;
}

/**
 * Extract casino names from header lines before the first data row.
 * In Iowa PDFs, casino names appear as multi-line column headers.
 */
function extractCasinoNames(headerLines, agrLine) {
  // The AGR line has dollar amounts after the label
  // Number of dollar amounts = number of casinos
  const dollarAmounts = extractDollarAmounts(agrLine);
  const count = dollarAmounts.length;

  if (count === 0) return [];

  // Casino names are fragmented. Common Iowa casino patterns:
  const KNOWN_FRAGMENTS = [
    /Ameristar\s*II/i, /Casino\s*Queen/i, /Catfish\s*Bend/i,
    /Diamond\s*Jo\s*-?\s*Dubuque/i, /Diamond\s*Jo\s*-?\s*Worth/i,
    /Grand\s*Falls/i, /Hard\s*Rock/i, /Harrah'?s/i,
    /Horseshoe/i, /Isle\s*Casino\s*Hotel\s*Waterloo/i,
    /Isle\s*of\s*Capri/i, /Isle\s*Casino.*Bettendorf/i,
    /Lakeside/i, /Meskwaki/i, /Mystique/i, /Prairie\s*Meadows/i,
    /Q\s*Casino/i, /Rhythm\s*City/i, /Riverside/i,
    /Wild\s*Rose.*Clinton/i, /Wild\s*Rose.*Emmetsburg/i,
    /Wild\s*Rose.*Jefferson/i, /WinnaVegas/i,
    /Marquette/i, /Totals/i,
  ];

  const fullText = headerLines.join(' ');
  const found = [];

  for (const pattern of KNOWN_FRAGMENTS) {
    const m = fullText.match(pattern);
    if (m) found.push(m[0].replace(/\s+/g, ' ').trim());
  }

  // If we found roughly the right count, use these
  if (found.length >= count - 1) return found;

  // Fallback: split header text and extract multi-word names
  // Look for capitalized phrases
  const words = headerLines.join('\n');
  const nameMatches = words.match(/[A-Z][A-Za-z'-]+(?:\s+[A-Za-z'-]+)*/g) || [];
  return nameMatches.slice(0, count);
}

/**
 * Extract dollar amounts from a line like:
 * "ADJUSTED GROSS REVENUE $12,918,686 $1,524,908 ..."
 */
function extractDollarAmounts(line) {
  const amounts = [];
  const re = /\$\s*([\d,]+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    amounts.push(parseFloat(m[1].replace(/,/g, '')));
  }
  return amounts;
}

/**
 * Extract percentages from a line like:
 * "SLOT REVENUE PERCENTAGE 10.03% 10.51% ..."
 */
function extractPercentages(line) {
  const pcts = [];
  const re = /([\d.]+)%/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    pcts.push(parseFloat(m[1]));
  }
  return pcts;
}

/**
 * Alternative parser: treats the full PDF text as a flat stream.
 * Looks for AGR values after casino name identifiers.
 *
 * This handles the Iowa PDF where each "page" of the transposed table
 * has casino names as column headers followed by all metric rows.
 */
function parseIowaPdfFlatMode(text) {
  const results = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find report month
  let reportMonth = null;
  for (const line of lines) {
    const m = line.match(/GAMING REVENUE REPORT\s*--\s*(\w+ \d{4})/i);
    if (m) {
      try {
        const d = new Date(m[1] + ' 1');
        if (!isNaN(d)) reportMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      } catch {}
      break;
    }
  }
  if (!reportMonth) {
    const now = new Date();
    reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  }

  // Iowa casino name → slug/search term mapping
  const IOWA_CASINOS = [
    { pattern: /Ameristar\s*II/i, search: 'Ameristar' },
    { pattern: /Casino\s*Queen\s*-?\s*Marquette/i, search: 'Isle Casino Hotel Marquette' },
    { pattern: /Catfish\s*Bend/i, search: 'Catfish Bend' },
    { pattern: /Diamond\s*Jo\s*-?\s*Dubuque/i, search: 'Diamond Jo Casino Dubuque' },
    { pattern: /Diamond\s*Jo\s*-?\s*Worth/i, search: 'Diamond Jo Casino Worth' },
    { pattern: /Grand\s*Falls/i, search: 'Grand Falls' },
    { pattern: /Hard\s*Rock/i, search: 'Hard Rock' },
    { pattern: /Harrah'?s\s*Council\s*Bluffs/i, search: "Harrah's Council Bluffs" },
    { pattern: /Horseshoe\s*Casino\s*Council\s*Bluffs/i, search: 'Horseshoe Council Bluffs' },
    { pattern: /Isle\s*Casino\s*Hotel\s*Waterloo/i, search: 'Isle Casino Waterloo' },
    { pattern: /Isle\s*of\s*Capri\s*-?\s*Bettendorf/i, search: 'Isle Casino Hotel Bettendorf' },
    { pattern: /Lakeside/i, search: 'Lakeside Casino' },
    { pattern: /Meskwaki/i, search: 'Meskwaki' },
    { pattern: /Mystique/i, search: 'Mystique' },
    { pattern: /Prairie\s*Meadows/i, search: 'Prairie Meadows' },
    { pattern: /Q\s*Casino/i, search: 'Mystique' },  // Q Casino rebranded to Mystique
    { pattern: /Rhythm\s*City/i, search: 'Rhythm City' },
    { pattern: /Riverside/i, search: 'Riverside Casino' },
    { pattern: /Wild\s*Rose.*Clinton/i, search: 'Wild Rose Clinton' },
    { pattern: /Wild\s*Rose.*Emmetsburg/i, search: 'Wild Rose Emmetsburg' },
    { pattern: /Wild\s*Rose.*Jefferson/i, search: 'Wild Rose Jefferson' },
    { pattern: /WinnaVegas/i, search: 'WinnaVegas' },
    { pattern: /Marquette/i, search: 'Isle Casino Hotel Marquette' },
  ];

  // Build a combined regex to find casino name occurrences
  const allText = lines.join('\n');

  // Split text at ADJUSTED GROSS REVENUE occurrences
  // Each table section has: [casino names...] ADJUSTED GROSS REVENUE [$val $val ...]
  const tableBlocks = allText.split(/(?=ADJUSTED GROSS REVENUE)/i);

  for (const block of tableBlocks) {
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);

    // Get AGR line values
    const agrLineIdx = blockLines.findIndex(l => /ADJUSTED GROSS REVENUE/i.test(l));
    if (agrLineIdx < 0) continue;

    const agrLine = blockLines[agrLineIdx];
    const agrValues = extractDollarAmounts(agrLine);
    if (agrValues.length === 0) continue;

    // Get SLOT REVENUE PERCENTAGE
    const slotPctLineIdx = blockLines.findIndex(l => /SLOT REVENUE PERCENTAGE/i.test(l));
    let slotPcts = [];
    if (slotPctLineIdx >= 0) {
      slotPcts = extractPercentages(blockLines[slotPctLineIdx]);
    }

    // Get casino names from lines before ADJUSTED GROSS REVENUE
    const headerText = blockLines.slice(0, agrLineIdx).join(' ');

    // Match known casinos in header text
    const foundNames = [];
    for (const casino of IOWA_CASINOS) {
      if (casino.pattern.test(headerText)) {
        foundNames.push({ search: casino.search, pattern: casino.pattern });
      }
    }

    // If we found named casinos, pair them with values by position
    // The order in headerText roughly matches column order
    if (foundNames.length > 0 && foundNames.length <= agrValues.length) {
      for (let i = 0; i < foundNames.length; i++) {
        const agr = agrValues[i];
        const slotRevPct = slotPcts[i] || null;
        const slotPaybackPct = slotRevPct ? (100 - slotRevPct).toFixed(2) : null;

        // Skip "Totals" (last value)
        if (foundNames[i].search.toLowerCase().includes('total')) continue;

        results.push({
          name: foundNames[i].search,
          revenue: agr,
          slotRevenuePct: slotRevPct,
          slotPaybackPct,
          reportMonth,
        });
      }
    }
  }

  // De-duplicate by name (keep first occurrence)
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

/**
 * Find the most recent Iowa gaming revenue report URL
 */
async function findLatestReportUrl(browser) {
  const page = await browser.newPage();
  let reportUrl = null;
  let reportText = null;

  try {
    await page.goto('https://irgc.iowa.gov/publications-reports/gaming-revenue', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.textContent.trim(),
      }))
    );

    // Find "XXXX Gaming Revenue" or "XXXX 2025/2026 Gaming Revenue" links
    // Sort by most recent (prefer current year, most recent month)
    const monthOrder = ['december','november','october','september','august','july','june','may','april','march','february','january'];
    const revenueLinks = links
      .filter(l => /gaming revenue/i.test(l.text) && l.href.includes('/media/'))
      .filter(l => !/fiscal year|sport|fantasy|archived/i.test(l.text));

    // Sort: prefer most recent month
    revenueLinks.sort((a, b) => {
      const aMonth = monthOrder.findIndex(m => a.text.toLowerCase().includes(m));
      const bMonth = monthOrder.findIndex(m => b.text.toLowerCase().includes(m));
      if (aMonth !== bMonth) return aMonth - bMonth;
      return 0;
    });

    if (revenueLinks.length > 0) {
      reportUrl = revenueLinks[0].href;
      reportText = revenueLinks[0].text;
      console.log(`  Found report: "${reportText}" → ${reportUrl}`);
    }
  } finally {
    await page.close();
  }

  return { url: reportUrl, text: reportText };
}

/**
 * Find casino_id by name (Iowa)
 */
async function findCasinoId(searchName) {
  const firstWord = searchName.split(/[\s,]+/)[0];
  let r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = 'IA' AND name ILIKE $1`,
    [`%${searchName}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  r = await pool.query(
    `SELECT id, name FROM casinos WHERE state = 'IA' AND name ILIKE $1`,
    [`%${firstWord}%`]
  );
  if (r.rows.length >= 1) return r.rows[0];

  return null;
}

/**
 * Main runner
 */
async function run() {
  console.log('🌾 Iowa Revenue Scraper\n');
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true });
  let totalStored = 0;

  try {
    // Find report URL
    const { url: reportUrl, text: reportText } = await findLatestReportUrl(browser);
    if (!reportUrl) {
      console.log('❌ Could not find report URL on IRGC site');
    } else {
      console.log(`\nDownloading: ${reportUrl}`);
      const tmpPath = path.join('/tmp', `iowa_report_${Date.now()}.pdf`);

      try {
        await downloadFile(reportUrl, tmpPath);
        const stat = fs.statSync(tmpPath);
        console.log(`Downloaded ${stat.size} bytes`);

        // Parse PDF
        const pdfData = await pdfParse(fs.readFileSync(tmpPath));
        console.log(`PDF text: ${pdfData.text.length} chars`);

        // Try flat-mode parser (more reliable for Iowa's transposed tables)
        let records = parseIowaPdfFlatMode(pdfData.text);
        console.log(`Flat parser found ${records.length} records`);

        // If flat parser got nothing, try section-based parser
        if (records.length === 0) {
          records = parseIowaPdf(pdfData.text);
          console.log(`Section parser found ${records.length} records`);
        }

        // Clean up
        try { fs.unlinkSync(tmpPath); } catch {}

        if (records.length > 0) {
          console.log(`\n📊 Storing ${records.length} casino revenue records...`);
          for (const rec of records) {
            const casino = await findCasinoId(rec.name);
            if (!casino) {
              console.log(`  ⚠️  No DB match for: "${rec.name}"`);
              continue;
            }

            // Store revenue
            await pool.query(
              `UPDATE casinos SET
                 monthly_revenue_cents = $1,
                 revenue_report_month = $2,
                 revenue_source = $3,
                 updated_at = NOW()
               WHERE id = $4`,
              [Math.round(rec.revenue * 100), rec.reportMonth, reportUrl, casino.id]
            );

            // Store payback if available
            if (rec.slotPaybackPct && !isNaN(rec.slotPaybackPct)) {
              await pool.query(
                `INSERT INTO slot_payback (casino_id, report_month, denomination, payback_pct, source_url)
                 VALUES ($1, $2, 'all', $3, $4)
                 ON CONFLICT (casino_id, report_month, denomination) DO UPDATE SET
                   payback_pct = EXCLUDED.payback_pct,
                   source_url = EXCLUDED.source_url`,
                [casino.id, rec.reportMonth, rec.slotPaybackPct, reportUrl]
              );
              console.log(`  ✅ ${casino.name}: $${(rec.revenue / 1e6).toFixed(2)}M AGR, ${rec.slotPaybackPct}% slot payback`);
            } else {
              console.log(`  ✅ ${casino.name}: $${(rec.revenue / 1e6).toFixed(2)}M AGR`);
            }
            totalStored++;
          }
        }

      } catch (err) {
        try { fs.unlinkSync(tmpPath); } catch {}
        console.error(`PDF error: ${err.message}`);
      }
    }

    if (totalStored === 0) {
      console.log('\n⚠️  No revenue data stored. Check IRGC site for updated report URLs.');
    }

  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const status = totalStored > 0 ? 'success' : 'partial';
  console.log(`\n✅ Done in ${elapsed}s — ${totalStored} Iowa casinos updated`);

  await pool.query(
    `INSERT INTO pipeline_runs (scraper_name, status, records_added, started_at)
     VALUES ('iowa-scraper', $1, $2, $3)`,
    [status, totalStored, new Date(startTime)]
  );

  await pool.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
