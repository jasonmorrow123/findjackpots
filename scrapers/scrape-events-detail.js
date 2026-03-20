/**
 * Detailed scrape of working casino event pages
 */
const { chromium } = require('playwright');

async function scrapeAll() {
  const browser = await chromium.launch({ headless: true });
  
  // Mystic Lake Promotions
  console.log('\n\n=== MYSTIC LAKE PROMOTIONS ===');
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    const page = await ctx.newPage();
    await page.goto('https://www.mysticlake.com/promotions', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    // Print everything
    const lines = text.split('\n').filter(l => l.trim().length > 2);
    lines.forEach(l => console.log(l));
    await ctx.close();
  } catch(e) { console.log('Error:', e.message); }

  // Grand Casino - try correct URL
  console.log('\n\n=== GRAND CASINO PROMOTIONS ===');
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    const page = await ctx.newPage();
    await page.goto('https://www.grandcasinomn.com/promotions', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').filter(l => l.trim().length > 2).slice(0, 60);
    lines.forEach(l => console.log(l));
    await ctx.close();
  } catch(e) { console.log('Error:', e.message); }

  // Prairie Meadows Events
  console.log('\n\n=== PRAIRIE MEADOWS EVENTS ===');
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    const page = await ctx.newPage();
    await page.goto('https://www.prairiemeadows.com/events', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').filter(l => l.trim().length > 2).slice(0, 80);
    lines.forEach(l => console.log(l));
    await ctx.close();
  } catch(e) { console.log('Error:', e.message); }

  // Prairie Meadows Promotions
  console.log('\n\n=== PRAIRIE MEADOWS PROMOTIONS ===');
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    const page = await ctx.newPage();
    await page.goto('https://www.prairiemeadows.com/promotions', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').filter(l => l.trim().length > 2).slice(0, 80);
    lines.forEach(l => console.log(l));
    await ctx.close();
  } catch(e) { console.log('Error:', e.message); }

  // South Point
  console.log('\n\n=== SOUTH POINT EVENTS ===');
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    const page = await ctx.newPage();
    await page.goto('https://www.southpointcasino.com/entertainment/events', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').filter(l => l.trim().length > 2).slice(0, 100);
    lines.forEach(l => console.log(l));
    await ctx.close();
  } catch(e) { console.log('Error:', e.message); }

  await browser.close();
}

scrapeAll().catch(console.error);
