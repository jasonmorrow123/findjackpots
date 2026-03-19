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

async function main() {
  console.log('\n========== TASK 2: Restricted and Nonrestricted Locations Report ==========');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
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
  
  // Show file links
  const fileLinks = links.filter(l => l.href.match(/\.(csv|xlsx|xls|pdf|zip|doc|docx)/i));
  console.log('\n=== FILE LINKS ===');
  if (fileLinks.length > 0) {
    fileLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  } else {
    console.log('No direct file links found');
  }
  
  // Show all gaming.nv.gov content links (excluding nav/social)
  const contentLinks = links.filter(l => 
    l.href.includes('gaming.nv.gov') && 
    !l.href.includes('adahelp') &&
    !l.href.includes('facebook') &&
    !l.href.includes('twitter') &&
    !l.href.includes('instagram') &&
    !l.href.includes('linkedin') &&
    !l.href.includes('youtube') &&
    !l.href.includes('nv.gov/agencies') &&
    !l.href.includes('nv.gov/jobs')
  );
  console.log('\n=== GAMING.NV.GOV CONTENT LINKS ===');
  contentLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Also look for any download/report links broadly
  const downloadLinks = links.filter(l => 
    l.href.includes('download') || 
    l.href.includes('export') ||
    l.href.includes('report') ||
    l.text.toLowerCase().includes('download') ||
    l.text.toLowerCase().includes('click here') ||
    l.text.toLowerCase().includes('excel') ||
    l.text.toLowerCase().includes('csv')
  );
  console.log('\n=== DOWNLOAD-RELATED LINKS ===');
  downloadLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Try to download any file found
  const toDownload = [...fileLinks, ...downloadLinks].filter((l, i, arr) => 
    arr.findIndex(x => x.href === l.href) === i
  );
  
  if (toDownload.length > 0) {
    for (const link of toDownload.slice(0, 3)) {
      const url = link.href;
      console.log('\nDownloading:', url);
      const ext = url.match(/\.(csv|xlsx|xls|pdf|zip)/i)?.[1] || 'bin';
      const dest = path.join(downloadDir, `task2_${Date.now()}.${ext}`);
      try {
        await downloadFile(url, dest);
        const stats = fs.statSync(dest);
        console.log('Size:', stats.size, 'bytes');
        if (ext === 'csv' || ext === 'txt') {
          const content = fs.readFileSync(dest, 'utf8');
          console.log('First 100 lines:');
          content.split('\n').slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
        } else if (ext === 'pdf') {
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(dest);
          const pdfData = await pdfParse(dataBuffer);
          const lines = pdfData.text.split('\n');
          console.log('Total PDF lines:', lines.length);
          console.log('First 100 lines:');
          lines.slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
        } else {
          console.log('Binary file, cannot show content directly');
        }
      } catch(e) {
        console.log('Download error:', e.message);
      }
    }
  }
  
  await browser.close();
}

main().catch(console.error);
