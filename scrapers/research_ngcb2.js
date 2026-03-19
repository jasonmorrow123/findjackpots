const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const downloadDir = '/tmp/ngcb_downloads';
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = protocol.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        const redirectUrl = response.headers.location;
        console.log('  Redirecting to:', redirectUrl);
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }
      console.log('  Response status:', response.statusCode, 'content-type:', response.headers['content-type']);
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function task1(browser) {
  console.log('\n========== TASK 1: Location Name and Address List ==========');
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  // Intercept network requests to see what API calls are made
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('gaming.nv.gov') || req.url().includes('api') || req.url().includes('data')) {
      requests.push({ url: req.url(), method: req.method() });
    }
  });
  
  await page.goto('https://www.gaming.nv.gov/about-us/location-name-and-address-list/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check full page source for any embedded data or API endpoints
  const pageSource = await page.content();
  console.log('Page source length:', pageSource.length);
  
  // Look for any data-related attributes or script content
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML.substring(0, 200));
  });
  console.log('\n=== SCRIPTS ===');
  scripts.filter(s => s.length > 10).forEach(s => console.log(' ', s.substring(0, 300)));
  
  // Look for iframes
  const iframes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src, id: f.id }));
  });
  console.log('\n=== IFRAMES ===');
  iframes.forEach(f => console.log(' ', f));
  
  console.log('\n=== NETWORK REQUESTS (first 20) ===');
  requests.slice(0, 20).forEach(r => console.log(' ', r.method, r.url));
  
  // Try the page source for any download URLs
  const csvMatches = pageSource.match(/https?:\/\/[^\s"']+\.(csv|xlsx|xls|pdf)/gi);
  console.log('\n=== FILE URLs IN SOURCE ===', csvMatches);
  
  // Check for any API endpoints or data endpoints
  const apiMatches = pageSource.match(/https?:\/\/[^\s"']*(?:api|data|export|download|list)[^\s"']*/gi);
  console.log('\n=== API/DATA URLs IN SOURCE ===', apiMatches ? apiMatches.slice(0, 20) : null);
  
  await context.close();
}

async function task2(browser) {
  console.log('\n========== TASK 2: Restricted and Nonrestricted Locations Report ==========');
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  const requests = [];
  page.on('request', req => {
    requests.push({ url: req.url(), method: req.method() });
  });
  
  await page.goto('https://www.gaming.nv.gov/about-us/restricted-and-nonrestricted-locations-report/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT ===');
  console.log(bodyText.substring(0, 5000));
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href && l.href.startsWith('http'));
  });
  
  // Show all relevant links
  const relevantLinks = links.filter(l => 
    l.href.includes('gaming.nv.gov') && 
    !l.href.includes('facebook') &&
    !l.href.includes('twitter') &&
    !l.href.includes('instagram')
  );
  console.log('\n=== GAMING.NV.GOV LINKS ===');
  relevantLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Show download/file links
  const fileLinks = links.filter(l => l.href.match(/\.(csv|xlsx|xls|pdf|zip|doc|docx)/i));
  console.log('\n=== FILE LINKS ===');
  fileLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Check for any download-related network requests
  console.log('\n=== NETWORK REQUESTS ===');
  requests.filter(r => r.url.includes('download') || r.url.includes('export') || r.url.match(/\.(csv|xlsx|pdf)/i))
    .forEach(r => console.log(' ', r.method, r.url));
  
  // Try to find and download the file
  if (fileLinks.length > 0) {
    for (const link of fileLinks.slice(0, 3)) {
      const url = link.href;
      console.log('\nDownloading:', url);
      const ext = url.match(/\.(csv|xlsx|xls|pdf|zip)/i)?.[1] || 'bin';
      const dest = path.join(downloadDir, `task2_${Date.now()}.${ext}`);
      try {
        await downloadFile(url, dest);
        const stats = fs.statSync(dest);
        console.log('Downloaded:', dest, 'Size:', stats.size, 'bytes');
        if (ext === 'csv') {
          const content = fs.readFileSync(dest, 'utf8');
          console.log('First 100 lines:');
          content.split('\n').slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
        } else if (ext === 'pdf') {
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(dest);
          const pdfData = await pdfParse(dataBuffer);
          const lines = pdfData.text.split('\n');
          console.log('First 100 lines of PDF:');
          lines.slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
        }
      } catch(e) {
        console.log('Download error:', e.message);
      }
    }
  }
  
  await context.close();
}

async function task3(browser) {
  console.log('\n========== TASK 3: Abbreviated Revenue Report ==========');
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  await page.goto('https://www.gaming.nv.gov/about-us/abbreviated-revenue-release-arr/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT (first 3000 chars) ===');
  console.log(bodyText.substring(0, 3000));
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href && l.href.startsWith('http'));
  });
  
  // Find PDF and file links
  const fileLinks = links.filter(l => l.href.match(/\.(pdf|csv|xlsx)/i));
  console.log('\n=== FILE LINKS ===');
  fileLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // All gaming.nv.gov links
  const nvLinks = links.filter(l => l.href.includes('gaming.nv.gov'));
  console.log('\n=== GAMING.NV.GOV LINKS ===');
  nvLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Download latest PDF (first in list = most recent)
  const pdfLinks = fileLinks.filter(l => l.href.match(/\.pdf/i));
  if (pdfLinks.length > 0) {
    const pdfUrl = pdfLinks[0].href;
    console.log('\nDownloading latest PDF:', pdfUrl);
    const dest = path.join(downloadDir, 'task3_arr.pdf');
    try {
      await downloadFile(pdfUrl, dest);
      const stats = fs.statSync(dest);
      console.log('Downloaded PDF, size:', stats.size);
      
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(dest);
      const pdfData = await pdfParse(dataBuffer);
      const allLines = pdfData.text.split('\n');
      console.log('Total lines in PDF:', allLines.length);
      
      console.log('\n=== FIRST 80 LINES ===');
      allLines.slice(0, 80).forEach((line, i) => console.log(`${i+1}: ${line}`));
      
      // Look for lines with dollar amounts or percentages
      console.log('\n=== LINES WITH REVENUE/% DATA ===');
      const dataLines = allLines.filter(l => l.match(/\$[\d,]+/) || l.match(/\d+\.\d+%/) || (l.match(/[\d,]{4,}/) && l.length > 20));
      dataLines.slice(0, 50).forEach((line, i) => console.log(`  ${i+1}: ${line}`));
      
    } catch(e) {
      console.log('PDF error:', e.message);
      console.log(e.stack);
    }
  }
  
  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await task1(browser);
    await task2(browser);
    await task3(browser);
  } catch(e) {
    console.error('Main error:', e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
