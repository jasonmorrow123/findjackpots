/**
 * JackpotMap Pipeline Orchestrator
 * Runs all scrapers on their configured schedules via node-cron.
 * 
 * Run this as a persistent background process:
 *   node run-all.js
 * 
 * Or with PM2 (recommended for production):
 *   pm2 start run-all.js --name jackpotmap-pipeline
 */

require('dotenv').config();
const cron = require('node-cron');
const { execFile } = require('child_process');
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) =>
      `[${timestamp}] ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'pipeline.log' }),
  ],
});

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    logger.info(`Starting ${scriptName}...`);
    const scriptPath = path.join(__dirname, scriptName);
    const proc = execFile('node', [scriptPath], (err, stdout, stderr) => {
      if (err) {
        logger.error(`${scriptName} failed: ${err.message}`);
        logger.error(stderr);
        reject(err);
      } else {
        logger.info(`${scriptName} completed`);
        if (stdout) logger.info(stdout);
        resolve();
      }
    });
  });
}

// ─────────────────────────────────────────
// SCHEDULE CONFIGURATION
// ─────────────────────────────────────────

// News RSS monitor: every 4 hours (free source, no auth needed)
cron.schedule('0 */4 * * *', async () => {
  try {
    await runScript('news-monitor.js');
  } catch (e) { logger.error('News monitor failed:', e.message); }
});

// Winner pages: every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await runScript('winner-page-scraper.js');
    await runScript('../push-notifier.js');
  } catch (e) { logger.error('Winner scraper / push-notifier failed:', e.message); }
});

// Reddit monitor: every 2 hours  
cron.schedule('0 */2 * * *', async () => {
  try {
    await runScript('reddit-monitor.js');
    await runScript('../push-notifier.js');
  } catch (e) { logger.error('Reddit monitor / push-notifier failed:', e.message); }
});

// Yelp data: every Sunday at 3am (weekly refresh)
cron.schedule('0 3 * * 0', async () => {
  try { await runScript('yelp-scraper.js'); }
  catch (e) { logger.error('Yelp scraper failed:', e.message); }
});

// Government PDF: 5th of every month at 2am (reports land ~45 days after month-end)
cron.schedule('0 2 5 * *', async () => {
  try { await runScript('gov-pdf-scraper.js'); }
  catch (e) { logger.error('Gov PDF scraper failed:', e.message); }
});

// NGCB location registry: 1st of every month at 3am (picks up new licensees)
cron.schedule('0 3 1 * *', async () => {
  try { await runScript('ngcb-location-scraper.js'); }
  catch (e) { logger.error('NGCB location scraper failed:', e.message); }
});

// ─────────────────────────────────────────

logger.info('🎰 JackpotMap Pipeline Orchestrator running');
logger.info('Schedules:');
logger.info('  • News RSS:       every 4 hours  (Google News, no auth)');
logger.info('  • Winner pages:   every 6 hours  → push-notifier runs after');
logger.info('  • Reddit monitor: every 2 hours  → push-notifier runs after');
logger.info('  • Yelp refresh:   Sundays at 3am');
logger.info('  • Gov PDF:        5th of month at 2am');
logger.info('  • NGCB registry:  1st of month at 3am');
logger.info('  • Push notifier:  auto-runs after winner/reddit scrapers');
logger.info('  • Twitter stream: run separately (node twitter-monitor.js)');
logger.info('\nPress Ctrl+C to stop.\n');

// Run scrapers immediately on startup
setTimeout(async () => {
  try {
    await runScript('news-monitor.js');
    await runScript('winner-page-scraper.js');
    await runScript('reddit-monitor.js');
    await runScript('../push-notifier.js');
  } catch (e) {
    logger.error('Startup run failed:', e.message);
  }
}, 5000);
