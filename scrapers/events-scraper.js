/**
 * JackpotMap Casino Events Scraper
 * Scrapes event/promotions pages for casinos in the DB that have known URLs.
 * Stores results in casino_events table.
 * 
 * Schedule: daily at 6am via run-all.js
 * Run manually: node events-scraper.js
 */

require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const { chromium } = require('playwright');

const pool = new Pool({
  connectionString: 'postgresql://jasonmorrow@localhost:5432/jackpotmap',
});

// Casinos with known scrapeable event pages
// casino_id from casinos table, url to scrape
const SCRAPE_TARGETS = [
  {
    casino_id: 448, // Mystic Lake Casino Hotel
    name: 'Mystic Lake Casino Hotel',
    url: 'https://www.mysticlake.com/promotions',
    type: 'promotions',
  },
  {
    casino_id: 450, // Grand Casino Hinckley
    name: 'Grand Casino Hinckley',
    url: 'https://www.grandcasinomn.com/promotions',
    type: 'promotions',
  },
  {
    casino_id: 451, // Grand Casino Mille Lacs
    name: 'Grand Casino Mille Lacs',
    url: 'https://www.grandcasinomn.com/promotions',
    type: 'promotions',
  },
  {
    casino_id: 473, // Prairie Meadows
    name: 'Prairie Meadows',
    url: 'https://www.prairiemeadows.com/events',
    type: 'events',
  },
  {
    casino_id: 473, // Prairie Meadows promotions
    name: 'Prairie Meadows',
    url: 'https://www.prairiemeadows.com/promotions',
    type: 'promotions',
  },
  {
    casino_id: 19, // South Point
    name: 'South Point Hotel, Casino & Spa',
    url: 'https://www.southpointcasino.com/entertainment/events',
    type: 'events',
  },
];

// Map event title keywords to event_type
function classifyEvent(title) {
  const t = (title || '').toLowerCase();
  if (/bingo/.test(t)) return 'bingo';
  if (/tournament|tourney/.test(t)) return 'tournament';
  if (/drawing|giveaway|win|prize|sweepstake/.test(t)) return 'drawing';
  if (/concert|band|show|music|perform|live entertain/.test(t)) return 'concert';
  if (/promotion|bonus|earn|swipe|spin|reward|points|birthday/.test(t)) return 'promotion';
  return 'other';
}

// Detect recurring patterns in text
function detectRecurring(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  
  if (/every day|daily|all week/.test(text)) {
    return { recurring: 'daily', recurring_days: null };
  }
  
  const matchedDays = DAYS.filter(day => {
    const re = new RegExp(`every ${day}|${day}s (through|thru|until)|each ${day}`, 'i');
    return re.test(text);
  });
  
  if (matchedDays.length > 0) {
    return { recurring: 'weekly', recurring_days: matchedDays };
  }
  
  if (/monthly|every month/.test(text)) {
    return { recurring: 'monthly', recurring_days: null };
  }
  
  return { recurring: null, recurring_days: null };
}

// Parse a date string to ISO format, return null if can't parse
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Handle formats like "March 20, 2026", "March 20 2026", "03/20/2026"
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// Parse time string to HH:MM:SS
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`;
}

// Extract prize amount in cents from text
function extractPrize(text) {
  if (!text) return null;
  // Look for patterns like "$30,000", "$7,000", "$5,000"
  const match = (text || '').match(/\$([0-9,]+)/);
  if (!match) return null;
  const amount = parseInt(match[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;
  return amount * 100; // Convert to cents
}

// Scrape Prairie Meadows style (structured event cards)
async function scrapePrairieMeadows(page, target) {
  const events = [];
  
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    
    // Extract event data from structured HTML
    const rawEvents = await page.evaluate(() => {
      const results = [];
      // Try multiple selectors for event containers
      const containers = document.querySelectorAll('[class*="event"], article, .card, [class*="listing"]');
      
      containers.forEach(el => {
        const text = el.innerText || '';
        if (text.trim().length < 10) return;
        
        // Look for date pattern
        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
        const timeMatch = text.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)/i);
        
        if (dateMatch) {
          // Get title (first significant text block)
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
          const title = lines[0];
          const description = lines.slice(2).join(' ').substring(0, 500);
          
          results.push({
            title,
            date: dateMatch[0],
            time: timeMatch ? timeMatch[0] : null,
            description,
          });
        }
      });
      
      return results;
    });
    
    for (const ev of rawEvents) {
      if (!ev.title || ev.title.length < 3) continue;
      const eventDate = parseDate(ev.date);
      if (!eventDate) continue;
      
      // Skip past events (more than 1 day ago)
      const today = new Date();
      today.setDate(today.getDate() - 1);
      if (new Date(eventDate) < today) continue;
      
      const recurring = detectRecurring(ev.title, ev.description);
      
      events.push({
        casino_id: target.casino_id,
        title: ev.title.substring(0, 200),
        event_type: classifyEvent(ev.title),
        event_date: eventDate,
        start_time: parseTime(ev.time),
        description: ev.description || null,
        prize_amount_cents: extractPrize(ev.title + ' ' + ev.description),
        recurring: recurring.recurring,
        recurring_days: recurring.recurring_days,
        source_url: target.url,
      });
    }
  } catch (err) {
    console.error(`  Error scraping ${target.name} (${target.url}): ${err.message}`);
  }
  
  return events;
}

// Scrape Mystic Lake style (text-based promotions list)
async function scrapeMysticLake(page, target) {
  const events = [];
  
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Parse Mystic Lake format: TITLE\nDATE(S)\nDETAILS
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // Skip nav/footer items
      if (['DETAILS', 'SIGN IN', 'CASINO', 'PROMOTIONS', 'SKIP NAVIGATION', 'CLUB M'].includes(line)) continue;
      if (line.length < 5 || line.length > 100) continue;
      
      // Check if next line looks like a date
      const datePattern = /(\d{1,2}\/\d{1,2}|\d{2}\/\d{2}\/\d{4}|ALL WEEK|MONDAYS|TUESDAYS|WEDNESDAYS|THURSDAYS|FRIDAYS|SATURDAYS|SUNDAYS)/i;
      if (!datePattern.test(nextLine)) continue;
      
      // Parse dates from next line (can be multiple like "THURSDAY, 03/19, MONDAY, 03/23")
      const dateMatches = nextLine.match(/\d{2}\/\d{2}(\/\d{4})?/g) || [];
      const recurring = detectRecurring(line, nextLine);
      
      if (dateMatches.length > 0) {
        for (const dm of dateMatches) {
          // Parse MM/DD or MM/DD/YYYY
          const parts = dm.split('/');
          const month = parts[0];
          const day = parts[1];
          const year = parts[2] || '2026';
          const dateStr = parseDate(`${month}/${day}/${year}`);
          if (!dateStr) continue;
          
          // Skip past events
          const today = new Date();
          today.setDate(today.getDate() - 1);
          if (new Date(dateStr) < today) continue;
          
          events.push({
            casino_id: target.casino_id,
            title: line.substring(0, 200),
            event_type: classifyEvent(line),
            event_date: dateStr,
            start_time: null,
            description: null,
            prize_amount_cents: extractPrize(line),
            recurring: recurring.recurring,
            recurring_days: recurring.recurring_days,
            source_url: target.url,
          });
        }
      } else if (recurring.recurring) {
        // All-week or weekly recurring — create a placeholder for next 30 days
        // handled by the recurring event expansion in API
        const today = new Date();
        events.push({
          casino_id: target.casino_id,
          title: line.substring(0, 200),
          event_type: classifyEvent(line),
          event_date: today.toISOString().split('T')[0],
          start_time: null,
          description: 'Recurring event. Check casino website for full schedule.',
          prize_amount_cents: null,
          recurring: recurring.recurring,
          recurring_days: recurring.recurring_days,
          source_url: target.url,
        });
      }
    }
  } catch (err) {
    console.error(`  Error scraping ${target.name} (${target.url}): ${err.message}`);
  }
  
  return events;
}

// Generic scraper dispatcher
async function scrapeTarget(browser, target) {
  console.log(`  Scraping ${target.name} (${target.url})...`);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  
  let events = [];
  try {
    if (target.url.includes('mysticlake.com')) {
      events = await scrapeMysticLake(page, target);
    } else {
      events = await scrapePrairieMeadows(page, target);
    }
  } finally {
    await context.close();
  }
  
  console.log(`    Found ${events.length} events`);
  return events;
}

// Upsert events to DB
async function saveEvents(events) {
  let inserted = 0;
  let updated = 0;
  
  for (const ev of events) {
    try {
      const result = await pool.query(`
        INSERT INTO casino_events (
          casino_id, title, event_type, event_date, start_time, end_time,
          description, prize_amount_cents, recurring, recurring_days, source_url, scraped_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        ON CONFLICT (casino_id, title, event_date) DO UPDATE SET
          event_type = EXCLUDED.event_type,
          start_time = EXCLUDED.start_time,
          description = COALESCE(EXCLUDED.description, casino_events.description),
          prize_amount_cents = COALESCE(EXCLUDED.prize_amount_cents, casino_events.prize_amount_cents),
          recurring = EXCLUDED.recurring,
          recurring_days = EXCLUDED.recurring_days,
          scraped_at = NOW()
        RETURNING (xmax = 0) as is_new
      `, [
        ev.casino_id, ev.title, ev.event_type, ev.event_date,
        ev.start_time, ev.end_time || null, ev.description,
        ev.prize_amount_cents, ev.recurring, ev.recurring_days, ev.source_url,
      ]);
      
      if (result.rows[0]?.is_new) inserted++;
      else updated++;
    } catch (err) {
      console.error(`  DB error for "${ev.title}": ${err.message}`);
    }
  }
  
  return { inserted, updated };
}

async function main() {
  console.log('🎰 JackpotMap Events Scraper starting...');
  console.log(`Targets: ${SCRAPE_TARGETS.length} casino pages`);
  
  const browser = await chromium.launch({ headless: true });
  let totalInserted = 0;
  let totalUpdated = 0;
  
  for (const target of SCRAPE_TARGETS) {
    try {
      const events = await scrapeTarget(browser, target);
      if (events.length > 0) {
        const { inserted, updated } = await saveEvents(events);
        totalInserted += inserted;
        totalUpdated += updated;
        console.log(`    Saved: ${inserted} new, ${updated} updated`);
      }
    } catch (err) {
      console.error(`  Failed ${target.name}: ${err.message}`);
    }
    
    // Polite delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }
  
  await browser.close();
  
  console.log(`\n✅ Events scraper complete: ${totalInserted} new, ${totalUpdated} updated`);
  
  await pool.end();
}

main().catch(err => {
  console.error('Events scraper fatal error:', err);
  pool.end();
  process.exit(1);
});
