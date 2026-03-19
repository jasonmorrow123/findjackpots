# JackpotMap Data Pipeline

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Set up database
psql -U postgres -c "CREATE DATABASE jackpotmap"
psql -U postgres -d jackpotmap -f db-schema.sql

# 4. Run individual scrapers
npm run scrape:yelp        # Yelp casino listings
npm run scrape:winners     # Casino winner pages (needs Playwright)
npm run scrape:reddit      # Reddit jackpot posts  
npm run scrape:gov         # Nevada GCB PDF reports

# 5. Install Playwright browsers (first time)
npx playwright install chromium

# 6. Run full pipeline (all scrapers on schedule)
npm run pipeline:all

# 7. Run Twitter stream (keep running separately)
npm run scrape:twitter
```

## API Keys You Need

| Key | Where to Get | Cost | Priority |
|-----|-------------|------|----------|
| YELP_API_KEY | yelp.com/developers | Free | ⭐⭐⭐ Start here |
| OPENAI_API_KEY | platform.openai.com | ~$5/mo | ⭐⭐⭐ Required for parsing |
| REDDIT_CLIENT_ID/SECRET | reddit.com/prefs/apps | Free | ⭐⭐⭐ Start here |
| TWITTER_BEARER_TOKEN | developer.twitter.com | $100/mo | ⭐⭐ Add later |
| GOOGLE_PLACES_API_KEY | console.cloud.google.com | ~$50/mo | ⭐⭐ Add later |

## Data Sources Summary

```
SOURCE              UPDATE FREQ    WHAT YOU GET                    COST
─────────────────────────────────────────────────────────────────────────
Nevada GCB PDFs     Monthly        Official slot payback %         Free
Casino winner pages Every 6h       Jackpot wins + amounts          Free*
Reddit monitor      Every 2h       Crowdsourced wins + photos      Free
Yelp Fusion API     Weekly         Ratings, reviews, hours         Free
Twitter/X Stream    Real-time      Live jackpot announcements      $100/mo
Google Places       Weekly         Ratings, popular times          ~$50/mo
User crowdsource    Real-time      Anything users report           Free
```
*Playwright hosting ~$20/mo on a VPS

## Architecture Notes

- **LLM Parsing**: We use GPT-4o-mini (~$0.15/1M tokens) to parse unstructured 
  text from PDFs, tweets, and web pages into structured data. Much more robust 
  than regex for casino text.

- **Trust Scoring**: Every jackpot record has a trust score (1-10):
  - 10: Nevada GCB official data
  - 7-8: Casino's own website
  - 6: Twitter/official casino social
  - 5: Reddit post with photo
  - 3: Reddit post without photo
  - 2: Unverified user report

- **Deduplication**: `ON CONFLICT (source, source_post_id) DO NOTHING` prevents
  duplicate ingestion. For user reports, dedup on (casino_id, amount, date) 
  with fuzzy matching.

## Production Deployment

```bash
# Install PM2 process manager
npm install -g pm2

# Start pipeline orchestrator
pm2 start run-all.js --name jackpotmap-pipeline

# Start Twitter stream (separate process)
pm2 start twitter-monitor.js --name jackpotmap-twitter

# Monitor
pm2 logs
pm2 status

# Auto-restart on reboot
pm2 startup
pm2 save
```

Recommended VPS: DigitalOcean $12/mo droplet (2GB RAM) is plenty.
