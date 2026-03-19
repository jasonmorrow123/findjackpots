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
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
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
  
  await page.goto('https://www.gaming.nv.gov/about-us/location-name-and-address-list/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Get page text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT (first 3000 chars) ===');
  console.log(bodyText.substring(0, 3000));
  
  // Get all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href);
  });
  console.log('\n=== ALL LINKS ===');
  links.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Get all buttons and form elements
  const forms = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(b => ({
      type: 'button',
      text: b.innerText || b.value,
      id: b.id,
      name: b.name
    }));
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      type: 'select',
      id: s.id,
      name: s.name,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
    }));
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
      type: 'input:' + i.type,
      id: i.id,
      name: i.name,
      value: i.value
    }));
    return { buttons, selects, inputs };
  });
  console.log('\n=== FORM ELEMENTS ===');
  console.log(JSON.stringify(forms, null, 2));
  
  // Look for download links specifically
  const downloadLinks = links.filter(l => 
    l.href.match(/\.(csv|xlsx|xls|pdf|zip)(\?|$)/i) ||
    l.text.toLowerCase().includes('download') ||
    l.text.toLowerCase().includes('export') ||
    l.text.toLowerCase().includes('nonrestricted') ||
    l.text.toLowerCase().includes('non-restricted')
  );
  console.log('\n=== POTENTIAL DOWNLOAD LINKS ===');
  downloadLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Try to find and interact with any filter for Nonrestricted
  const hasNonrestricted = await page.evaluate(() => {
    const all = document.body.innerHTML;
    return all.toLowerCase().includes('nonrestricted') || all.toLowerCase().includes('non-restricted');
  });
  console.log('\nPage contains "nonrestricted":', hasNonrestricted);
  
  // Try clicking any download/export button
  try {
    const downloadPromise = context.waitForEvent('download', { timeout: 10000 });
    const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), button:has-text("Export"), a:has-text("Export")').first();
    if (await downloadBtn.count() > 0) {
      console.log('\nFound download button, clicking...');
      await downloadBtn.click();
      const download = await downloadPromise;
      const filePath = path.join(downloadDir, download.suggestedFilename());
      await download.saveAs(filePath);
      console.log('Downloaded:', filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log('First 100 lines:');
      content.split('\n').slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
    } else {
      console.log('No download button found');
    }
  } catch(e) {
    console.log('No download triggered:', e.message);
  }
  
  await context.close();
}

async function task2(browser) {
  console.log('\n========== TASK 2: Restricted and Nonrestricted Locations Report ==========');
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  await page.goto('https://www.gaming.nv.gov/about-us/restricted-and-nonrestricted-locations-report/', { waitUntil: 'networkidle', timeout: 30000 });
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT (first 3000 chars) ===');
  console.log(bodyText.substring(0, 3000));
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href);
  });
  console.log('\n=== ALL LINKS ===');
  links.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Try to download any file
  const fileLinks = links.filter(l => 
    l.href.match(/\.(csv|xlsx|xls|pdf|zip|doc|docx)(\?|$)/i) ||
    l.text.toLowerCase().includes('download') ||
    l.text.toLowerCase().includes('report') ||
    l.href.includes('download')
  );
  console.log('\n=== FILE/DOWNLOAD LINKS ===');
  fileLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Try downloading the first file link
  if (fileLinks.length > 0) {
    const url = fileLinks[0].href;
    console.log('\nDownloading:', url);
    const ext = url.match(/\.(csv|xlsx|xls|pdf|zip)/i)?.[1] || 'bin';
    const dest = path.join(downloadDir, `task2_report.${ext}`);
    try {
      await downloadFile(url, dest);
      const stats = fs.statSync(dest);
      console.log('Downloaded:', dest, 'Size:', stats.size, 'bytes');
      if (ext === 'csv' || ext === 'txt') {
        const content = fs.readFileSync(dest, 'utf8');
        console.log('First 100 lines:');
        content.split('\n').slice(0, 100).forEach((line, i) => console.log(`${i+1}: ${line}`));
      } else {
        console.log('Binary file downloaded, size:', stats.size);
      }
    } catch(e) {
      console.log('Download error:', e.message);
    }
  }
  
  // Also try clicking download buttons
  try {
    const downloadPromise = context.waitForEvent('download', { timeout: 8000 });
    const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), a:has-text("Click here"), a[href*="download"]').first();
    if (await downloadBtn.count() > 0) {
      console.log('\nFound download button, clicking...');
      await downloadBtn.click();
      const download = await downloadPromise;
      const filePath = path.join(downloadDir, download.suggestedFilename());
      await download.saveAs(filePath);
      console.log('Downloaded via button:', filePath);
      const stats = fs.statSync(filePath);
      console.log('Size:', stats.size);
    }
  } catch(e) {
    console.log('Button download attempt:', e.message);
  }
  
  await context.close();
}

async function task3(browser) {
  console.log('\n========== TASK 3: Abbreviated Revenue Report ==========');
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  await page.goto('https://www.gaming.nv.gov/about-us/abbreviated-revenue-release-arr/', { waitUntil: 'networkidle', timeout: 30000 });
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT (first 2000 chars) ===');
  console.log(bodyText.substring(0, 2000));
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.href);
  });
  
  // Find PDF links
  const pdfLinks = links.filter(l => l.href.match(/\.pdf/i) || l.text.toLowerCase().includes('pdf'));
  console.log('\n=== PDF LINKS ===');
  pdfLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // All links for reference
  const allLinks = links.filter(l => l.href.includes('gaming.nv.gov') || l.href.match(/\.(pdf|csv|xlsx)/i));
  console.log('\n=== RELEVANT LINKS ===');
  allLinks.forEach(l => console.log(`  [${l.text}] => ${l.href}`));
  
  // Download the first (latest) PDF
  const pdfToDownload = pdfLinks[0];
  if (pdfToDownload) {
    console.log('\nDownloading PDF:', pdfToDownload.href);
    const dest = path.join(downloadDir, 'task3_arr.pdf');
    try {
      await downloadFile(pdfToDownload.href, dest);
      const stats = fs.statSync(dest);
      console.log('Downloaded PDF, size:', stats.size, 'bytes');
      
      // Parse PDF
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(dest);
      const pdfData = await pdfParse(dataBuffer);
      console.log('\n=== PDF TEXT (first 80 lines) ===');
      const lines = pdfData.text.split('\n');
      lines.slice(0, 80).forEach((line, i) => console.log(`${i+1}: ${line}`));
      
      // Look for casino names with revenue
      console.log('\n=== SEARCHING FOR CASINO/REVENUE DATA ===');
      const casinoLines = lines.filter(l => 
        l.match(/\$[\d,]+/) || 
        l.match(/[\d,]+\.\d{2}/) ||
        l.toLowerCase().includes('casino') ||
        l.toLowerCase().includes('hotel') ||
        l.toLowerCase().includes('resort') ||
        l.toLowerCase().includes('revenue')
      );
      console.log('Lines with revenue/casino data (first 50):');
      casinoLines.slice(0, 50).forEach((line, i) => console.log(`  ${i+1}: ${line}`));
      
    } catch(e) {
      console.log('PDF processing error:', e.message);
      console.log(e.stack);
    }
  } else {
    console.log('No PDF links found');
    console.log('All links:', links.map(l => `[${l.text}] ${l.href}`).join('\n'));
  }
  
  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await task1(browser);
    await task2(browser);
    await task3(browser);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
