# JackpotMap — Data Layer Strategy

## Executive Summary

There is no single API for casino data. The strategy is a **multi-source data pipeline** that
combines public government records, social media monitoring, casino website scraping, partner
affiliate feeds, and crowdsourced user submissions. Each layer fills gaps the others miss.

---

## Source Tier 1 — Government / Regulatory (Free, High Trust)

### Nevada Gaming Control Board (NGCB)
- **URL:** https://gaming.nv.gov/stats-and-reports/gaming-revenue-reports/
- **What you get:** Monthly slot payback % by casino, gross revenue, machine counts
- **Format:** PDF reports (requires PDF parsing — pdfplumber or Adobe API)
- **Update freq:** Monthly, ~45 days lag
- **How to access:** Public records, no auth required
- **Key fields:** Slot machine hold %, number of machines, table game revenue
- **Limitation:** Aggregate per property, not per-machine; no jackpot specifics

### New Jersey Division of Gaming Enforcement (DGE)
- **URL:** https://www.nj.gov/oag/ge/gamingrevenuereports.html
- **What you get:** Atlantic City casino revenue, slot hold %, monthly
- **Format:** Excel/PDF — same scraping approach
- **Update freq:** Monthly

### Mississippi Gaming Commission
- **URL:** https://www.mgc.state.ms.us/
- **What you get:** Tunica, Gulf Coast casino revenue reports
- **Format:** PDF

### Pennsylvania Gaming Control Board
- **URL:** https://gamingcontrolboard.pa.gov/
- **What you get:** PA casino slot hold, table games data
- **Format:** Excel downloads, well-structured

### Missouri Gaming Commission / Illinois Gaming Board / Colorado/Michigan etc.
- All publish similar monthly PDFs. This is the backbone of slot payback data.

### **Key Insight:** Nevada reports slot payback as a RANGE by denomination
(penny slots: ~87-89%, dollar slots: ~93-95%, $5+ slots: ~96-98%)
This lets you show "best payback casinos" with real government-sourced data.

---

## Source Tier 2 — Casino Social Media (Free, Real-Time)

### Twitter/X — Casino Official Accounts
Casinos tweet jackpot winners constantly. This is your real-time jackpot feed.

**High-value accounts to monitor:**
- @Bellagio, @MGMGrand, @CaesarsEntertainment
- @PalaceStation, @GreenValleyRanch (Station Casinos)
- @SouthPointCasino, @GoldenNugget
- @HardRockHotelLV, @WynnLasVegas

**What they post:** Photos of jackpot winners with amount, machine name, date
**API:** Twitter API v2 — filtered stream by account + keywords
  - Keywords: "jackpot", "winner", "hits", "$", "million"
  - Cost: ~$100/mo for Basic tier (enough for this use case)

**Instagram:**
- Same accounts post winner photos — use Instagram Graph API (requires business account partner)
- Can extract: jackpot amount from caption, machine type, date

**Facebook:**
- Many regional/tribal casinos ONLY post jackpots on Facebook
- Facebook Graph API — public page posts accessible with app token

### Example Twitter API Query:
```
(from:Bellagio OR from:MGMGrand OR from:PalaceStation) 
jackpot (winner OR hits OR wins) lang:en
```

---

## Source Tier 3 — Casino Websites (Scraping)

### Jackpot Winner Pages
Many casinos have dedicated winner pages. These are goldmines.

| Casino | Winner Page URL Pattern |
|--------|------------------------|
| Station Casinos | stationcasinos.com/winners |
| South Point | southpointcasino.com/promotions/winners |
| Golden Nugget | goldennugget.com/las-vegas/casino/winners |
| Harrah's | caesars.com/harrahs-las-vegas/casino/big-wins |

**Scraping stack:** Playwright (handles JS-rendered pages) + Cheerio for parsing
**Schedule:** Every 6 hours via cron job
**Store in:** PostgreSQL with dedup on (casino_id, amount, date, machine_name)

### Promotions & Offers Pages
- Scrape each casino's promotions page weekly
- Extract: bonus offers, free play amounts, multiplier events, bingo schedules
- Parse with LLM (GPT-4o-mini is cheap) to normalize to structured fields

### Loyalty Program Pages
- Scrape tier requirements (points needed, tier names, benefits)
- Update monthly — these change infrequently

---

## Source Tier 4 — Affiliate & Partner APIs (Revenue Generating)

### Everi / IGT / Aristocrat (Slot Manufacturers)
- These companies track progressive jackpot pools across linked machines
- **IGT's Megabucks network** tracks the current jackpot amount in real time
- Approach: contact their B2B/affiliate teams — they WANT distribution
- IGT has a partner portal: igtonlinegaming.com
- **What you get:** Live progressive jackpot amounts across their network

### Commission Junction / Impact / ShareASale
- Many casino hotel properties run affiliate programs through these networks
- Commission: $25–$200 per player card signup or first visit
- CJ.com: search "casino" — MGM Resorts, Caesars, Hard Rock all listed

### Rakuten Advertising
- Caesars Entertainment affiliate program pays ~$50/new member
- MGM Rewards affiliate: ~$30-75/signup

---

## Source Tier 5 — Crowdsourcing (Your Moat Builder)

This is your **competitive differentiator**. No one else has this.

### User-Reported Jackpots
- In-app "Report a Win" button — user submits:
  - Casino name (dropdown)
  - Machine name (text or dropdown)
  - Amount won
  - Optional: photo of winner screen
- Gamify: "Top Reporter" badges, leaderboard
- Trust scoring: photo verification bumps trust score; multiple reports of same win confirm it

### Slot Machine Reviews
- Let users rate individual slot machines: "loose" vs "tight"
- Aggregate by machine model + casino = powerful signal
- Similar to how Waze crowdsources speed traps

### "At the Casino Now" Check-ins
- Live floor activity: "just saw someone win on Lightning Link at Palace Station"
- Creates urgency / social proof = drives visits

---

## Source Tier 6 — Third-Party Data APIs

### Yelp Fusion API
- **URL:** api.yelp.com/v3/businesses/search
- **What you get:** Casino ratings, reviews, hours, photos, categories
- **Auth:** Free API key (500 calls/day free, $0 after)
- **Use for:** Star ratings, user review snippets, phone/address/hours
- **Category filter:** `categories=casinos`

### Google Places API
- **URL:** maps.googleapis.com/maps/api/place
- **What you get:** Rating, review count, hours, popular times (foot traffic!)
- **Cost:** $17/1000 requests — cheap for batch updates
- **Unique value:** "Popular times" shows when casino floor is busiest

### Foursquare Places API
- Casino metadata, tips/reviews, check-in data
- Free tier: 1,000 calls/day

### TripAdvisor Content API
- Casino reviews and ratings
- Requires partnership — apply at developer.tripadvisor.com

---

## Source Tier 7 — News & Media Monitoring

### Google News RSS
- RSS feed: `news.google.com/rss/search?q=casino+jackpot+winner`
- Free, no API key needed
- Parse for jackpot stories — extract casino name + amount with regex/LLM

### Casino Industry Trade Press
- Casino Journal, CDC Gaming Reports, Las Vegas Review-Journal
- All have RSS feeds — monitor for jackpot announcements and regulatory changes

### Reddit
- r/gambling, r/LasVegas, r/casinogaming — users post jackpot wins with photos
- Reddit API (free tier): monitor these subs for jackpot posts
- Massive qualitative signal + real user sentiment on loyalty programs

---

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA INGESTION LAYER                     │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Gov PDFs │ Twitter  │ Scrapers │ Affiliate│ User Reports    │
│ (monthly)│ (live)   │ (6hr)    │ APIs     │ (real-time)     │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PROCESSING & NORMALIZATION                  │
│  • LLM extraction (GPT-4o-mini for unstructured text)       │
│  • Deduplication (fuzzy match casino name + amount + date)  │
│  • Trust scoring (gov data=10, photo-verified=8, tweet=6)   │
│  • Geocoding (Google Maps API for lat/lng)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                            │
│  PostgreSQL (primary) + Redis (cache) + S3 (media)          │
│                                                              │
│  Tables: casinos, jackpots, promotions, loyalty_programs,   │
│          user_reports, machines, reviews                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
│  REST API (Node/Express or FastAPI) → Frontend + Mobile     │
│  WebSocket for live jackpot alerts                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Estimated Data Coverage

| Source | Casinos Covered | Update Speed | Cost/Mo | Trust |
|--------|----------------|--------------|---------|-------|
| NV Gaming Control Board | ~260 NV properties | Monthly | Free | ★★★★★ |
| Twitter/X API | ~50 major casinos | Real-time | $100 | ★★★ |
| Website scraping | ~200 properties | 6 hours | $20 (hosting) | ★★★★ |
| IGT/Everi partner | Thousands of machines | Real-time | Negotiated | ★★★★★ |
| Yelp API | ~500 per city | Weekly | Free | ★★★ |
| Google Places | Unlimited | Weekly | ~$50 | ★★★★ |
| User crowdsource | Anywhere | Real-time | Free | ★★ |

---

## Quick Start: What to Build First

### Phase 1 (Week 1-2): Government Data + Scraping
1. Write Nevada GCB PDF scraper → slot payback % by casino
2. Scrape 10 casino winner pages → jackpot history table
3. Yelp API → ratings and reviews for all casinos in target city

### Phase 2 (Week 3-4): Social Monitoring
1. Twitter filtered stream for casino accounts + jackpot keywords
2. Reddit r/LasVegas monitor for win reports
3. Parse with GPT-4o-mini → structured jackpot records

### Phase 3 (Month 2): Crowdsourcing + Monetization
1. "Report a Win" feature in app
2. Sign up for Caesars + MGM affiliate programs
3. Push notifications for jackpot alerts (premium tier)

### Phase 4 (Month 3+): Partner APIs
1. Approach IGT/Everi for progressive jackpot data partnership
2. Station Casinos / Boyd Gaming direct data deal
3. Build casino dashboard — sell data back to casinos

---

## Legal Considerations

- **Scraping:** Review each casino's robots.txt and ToS. Start with public data.
  Avoid scraping behind login walls. Respect rate limits.
- **Social media:** Twitter/X API ToS allows aggregation but prohibits redistribution
  of raw tweet content. Display summaries, not raw tweets.
- **Government data:** Fully public domain — use freely.
- **Affiliate programs:** Must disclose affiliate relationships to users (FTC requirement).
- **Gambling content:** Most ad platforms (Google, Facebook) restrict gambling ads.
  Apple App Store requires compliance with local gambling laws per market.
