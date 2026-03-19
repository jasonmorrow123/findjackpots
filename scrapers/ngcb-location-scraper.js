/**
 * NGCB Location Scraper
 * Downloads the official Nevada Gaming Control Board Location Name & Address List
 * and imports all Nevada nonrestricted casino licensees into the jackpotmap DB.
 *
 * Sources:
 *   - NameAndAddressReport (Nonrestricted): POST https://gcbmobile.nv.gov/Report/NameAndAddressReport
 *   - RestrictedandNonrestrictedReport:     POST https://gcbmobile.nv.gov/Report/RestrictedandNonrestrictedReport
 *
 * Both reports have title rows at the top; the actual column headers are at row index 7 (0-based).
 */

require('dotenv').config();
const axios = require('axios');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DB_URL = process.env.DATABASE_URL || 'postgresql://jasonmorrow@localhost:5432/jackpotmap';
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'JackpotMap/1.0 (research; contact: data@jackpotmap.com)';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isHtml(buf) {
  const start = buf.slice(0, 100).toString('utf8').trim().toLowerCase();
  return start.startsWith('<!') || start.startsWith('<html');
}

// ─────────────────────────────────────────
// Download via axios
// ─────────────────────────────────────────

async function downloadXls(url, body) {
  const resp = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Accept': 'application/vnd.ms-excel,application/octet-stream,*/*',
    },
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(resp.data);
}

// ─────────────────────────────────────────
// Download via Playwright (fallback)
// ─────────────────────────────────────────

async function downloadXlsPlaywright(url, body) {
  console.log('  [playwright] Launching browser to download via form submit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto('https://gcbmobile.nv.gov/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const params = new URLSearchParams(body);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.evaluate(({ actionUrl, params }) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = actionUrl;
      for (const [k, v] of Object.entries(params)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    }, { actionUrl: url, params: Object.fromEntries(params.entries()) }),
  ]);

  const tmpPath = path.join(__dirname, `_tmp_download_${Date.now()}.xls`);
  await download.saveAs(tmpPath);
  await browser.close();

  const buf = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  return buf;
}

// ─────────────────────────────────────────
// Fetch XLS (axios first, Playwright fallback)
// ─────────────────────────────────────────

async function fetchXls(url, body) {
  let buf;
  try {
    buf = await downloadXls(url, body);
    if (isHtml(buf)) {
      console.log(`  [warn] Got HTML response, falling back to Playwright...`);
      buf = await downloadXlsPlaywright(url, body);
    }
  } catch (err) {
    console.log(`  [warn] axios failed (${err.message}), falling back to Playwright...`);
    buf = await downloadXlsPlaywright(url, body);
  }
  return buf;
}

// ─────────────────────────────────────────
// Parse XLS buffer → array of row objects
// Both NGCB reports have title rows 0-6 and actual column headers at row 7.
// ─────────────────────────────────────────

function parseXls(buf) {
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read all rows as arrays first
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find the header row — look for 'Loc. ID' or 'Loc ID'
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (row.some(cell => String(cell).includes('Loc') && String(cell).includes('ID'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: assume row 7
    headerIdx = 7;
  }

  const headers = rawRows[headerIdx].map(h => String(h).trim());
  const dataRows = rawRows.slice(headerIdx + 1);

  return dataRows
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
}

// ─────────────────────────────────────────
// Match a casino against existing DB records
// ─────────────────────────────────────────

async function findExistingCasino(client, locationName) {
  const slug = slugify(locationName);

  // 1) Exact slug match
  let res = await client.query('SELECT id, name, slug FROM casinos WHERE slug = $1', [slug]);
  if (res.rows.length) return { casino: res.rows[0], matchType: 'slug' };

  // 2) ILIKE exact name
  res = await client.query('SELECT id, name, slug FROM casinos WHERE name ILIKE $1', [locationName]);
  if (res.rows.length) return { casino: res.rows[0], matchType: 'ilike-exact' };

  // 3) Prefix match (handles truncated names like "Alamo Casino - Las Vegas Ta")
  //    Use first 25 chars, strip trailing punctuation/spaces
  const prefix = locationName.replace(/[-\s.,]+$/, '').slice(0, 25).trim();
  if (prefix.length >= 6) {
    res = await client.query("SELECT id, name, slug FROM casinos WHERE name ILIKE $1", [`${prefix}%`]);
    if (res.rows.length === 1) return { casino: res.rows[0], matchType: 'prefix-25' };
  }

  // 4) Shorter prefix (first 15 chars)
  const short = locationName.replace(/[-\s.,]+$/, '').slice(0, 15).trim();
  if (short.length >= 8) {
    res = await client.query("SELECT id, name, slug FROM casinos WHERE name ILIKE $1", [`${short}%`]);
    if (res.rows.length === 1) return { casino: res.rows[0], matchType: 'prefix-15' };
  }

  // 5) Normalized string prefix — strip all non-alphanumeric
  const normTarget = normalizeName(locationName).slice(0, 20);
  if (normTarget.length >= 8) {
    res = await client.query(
      `SELECT id, name, slug FROM casinos 
       WHERE lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) LIKE $1`,
      [`${normTarget}%`]
    );
    if (res.rows.length === 1) return { casino: res.rows[0], matchType: 'norm-prefix' };
  }

  return { casino: null, matchType: null };
}

// ─────────────────────────────────────────
// Ensure unique slug
// ─────────────────────────────────────────

async function uniqueSlug(client, base) {
  let slug = base;
  let i = 2;
  while (true) {
    const res = await client.query('SELECT id FROM casinos WHERE slug = $1', [slug]);
    if (res.rows.length === 0) return slug;
    slug = `${base}-${i++}`;
  }
}

// ─────────────────────────────────────────
// Parse date strings (MM/DD/YYYY, YYYY-MM-DD, or Excel serial)
// ─────────────────────────────────────────

function parseDate(raw) {
  if (!raw && raw !== 0) return null;
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const str = String(raw).trim();
  if (!str) return null;
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {

    // ── Step 1: Download & parse NameAndAddressReport ──────────────────────

    console.log('\n📥 Downloading NGCB NameAndAddressReport (Nonrestricted)...');
    const nameBuf = await fetchXls(
      'https://gcbmobile.nv.gov/Report/NameAndAddressReport',
      'AccountTypeId=22&IsRaceBookSportsPool=False'
    );
    console.log(`  Downloaded ${nameBuf.length} bytes`);

    const nameRows = parseXls(nameBuf);
    console.log(`  Parsed ${nameRows.length} data rows`);
    if (nameRows.length > 0) {
      console.log('  Columns:', Object.keys(nameRows[0]).join(' | '));
      console.log('  Sample row:', JSON.stringify(nameRows[0]));
    }

    // ── Step 2: Download & parse RestrictedandNonrestrictedReport ──────────

    console.log('\n📥 Downloading NGCB RestrictedandNonrestrictedReport...');
    const licBuf = await fetchXls(
      'https://gcbmobile.nv.gov/Report/RestrictedandNonrestrictedReport',
      ''
    );
    console.log(`  Downloaded ${licBuf.length} bytes`);

    const licRows = parseXls(licBuf);
    console.log(`  Parsed ${licRows.length} data rows`);
    if (licRows.length > 0) {
      console.log('  Columns:', Object.keys(licRows[0]).join(' | '));
    }

    // Build a lookup: locId → { licenseStart, licenseType }
    const licMap = {};
    for (const row of licRows) {
      const locId = String(row['Loc. ID'] || row['Loc ID'] || '').trim();
      const locType = String(row['Loc. Type'] || row['Loc Type'] || '').trim();
      const startRaw = row['Start'] || row['License Start'] || row['Start Date'] || '';
      if (!locId) continue;
      licMap[locId] = {
        licenseType: locType || null,
        licenseStart: startRaw || null,
      };
    }
    console.log(`  Built license map with ${Object.keys(licMap).length} entries`);

    // ── Step 3: Import NameAndAddress rows ─────────────────────────────────

    let totalRows = 0;
    let matched = 0;
    let added = 0;
    let skipped = 0;

    console.log('\n🏨 Importing casino records...\n');

    for (const row of nameRows) {
      const locId      = String(row['Loc. ID'] || row['Loc ID'] || '').trim();
      const locType    = String(row['Loc. Type'] || row['Loc Type'] || '').trim();
      const accountName = String(row['Account Name'] || '').trim();
      const locationName = String(row['Location Name'] || '').trim();
      const streetAddr = String(row['Street Address'] || '').trim();
      const city       = String(row['City'] || '').trim();
      // The report has two "City" and "State" columns (physical + mailing).
      // After deduplication by xlsx, the first is physical; mailing may be named differently.
      const state      = String(row['State'] || '').trim();
      const county     = String(row['County'] || '').trim();

      // Skip empty rows
      if (!locationName) continue;

      // Only Nonrestricted NV
      if (locType && !locType.toLowerCase().includes('nonrestricted')) { skipped++; continue; }
      if (state && state.toUpperCase() !== 'NV') { skipped++; continue; }

      totalRows++;

      // License data from second report
      const lic = licMap[locId] || {};

      // Try to match existing casino
      const { casino, matchType } = await findExistingCasino(client, locationName);

      if (casino) {
        await client.query(`
          UPDATE casinos SET
            ngcb_loc_id   = COALESCE(ngcb_loc_id, $1),
            ngcb_county   = COALESCE(ngcb_county, $2),
            legal_entity  = COALESCE(legal_entity, $3),
            address       = COALESCE(address, NULLIF($4, '')),
            city          = COALESCE(city, NULLIF($5, '')),
            state         = COALESCE(state, NULLIF($6, '')),
            license_start = COALESCE(license_start, $7::date),
            license_type  = COALESCE(license_type, NULLIF($8, '')),
            updated_at    = now()
          WHERE id = $9
        `, [
          locId || null,
          county || null,
          accountName || null,
          streetAddr,
          city,
          state || 'NV',
          lic.licenseStart ? parseDate(lic.licenseStart) : null,
          lic.licenseType || null,
          casino.id,
        ]);
        console.log(`  ✅ MATCH [${matchType}] "${locationName}" → "${casino.name}"`);
        matched++;
      } else {
        const baseSlug = slugify(locationName);
        const slug = await uniqueSlug(client, baseSlug);

        await client.query(`
          INSERT INTO casinos (
            name, slug, address, city, state,
            ngcb_loc_id, ngcb_county, legal_entity,
            license_start, license_type,
            created_at, updated_at
          ) VALUES (
            $1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''),
            $6, $7, $8,
            $9::date, $10,
            now(), now()
          )
        `, [
          locationName,
          slug,
          [streetAddr, city, state || 'NV'].filter(Boolean).join(', '),
          city || null,
          state || 'NV',
          locId || null,
          county || null,
          accountName || null,
          lic.licenseStart ? parseDate(lic.licenseStart) : null,
          lic.licenseType || null,
        ]);
        console.log(`  ➕ NEW "${locationName}" (${city || '?'}, ${county || '?'} County)`);
        added++;
      }
    }

    // ── Step 4: Summary ────────────────────────────────────────────────────

    const countRes = await client.query('SELECT COUNT(*) as total FROM casinos');
    const total = parseInt(countRes.rows[0].total, 10);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 NGCB Import Summary');
    console.log('═'.repeat(60));
    console.log(`  Spreadsheet rows (Nonrestricted NV): ${totalRows}`);
    console.log(`  Matched existing casinos:            ${matched}`);
    console.log(`  New casinos added:                   ${added}`);
    console.log(`  Skipped (non-NV or restricted):      ${skipped}`);
    console.log(`  Total casinos in DB after run:       ${total}`);
    console.log('═'.repeat(60) + '\n');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
