-- JackpotMap PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS postgis; -- for geo queries

-- ─────────────────────────────────────────
-- CASINOS (master record)
-- ─────────────────────────────────────────
CREATE TABLE casinos (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  chain           TEXT,
  address         TEXT,
  city            TEXT,
  state           CHAR(2),
  zip             TEXT,
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  phone           TEXT,
  website         TEXT,
  twitter_handle  TEXT,
  facebook_page   TEXT,
  instagram_handle TEXT,
  winner_page_url TEXT,
  yelp_id         TEXT,
  google_place_id TEXT,
  has_bingo       BOOLEAN DEFAULT false,
  has_poker       BOOLEAN DEFAULT false,
  has_sportsbook  BOOLEAN DEFAULT false,
  has_hotel       BOOLEAN DEFAULT false,
  free_parking    BOOLEAN DEFAULT false,
  min_table_bet   INTEGER,  -- in dollars
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- JACKPOT WINS
-- ─────────────────────────────────────────
CREATE TABLE jackpots (
  id              SERIAL PRIMARY KEY,
  casino_id       INTEGER REFERENCES casinos(id),
  machine_name    TEXT,
  machine_type    TEXT,  -- 'slot', 'video_poker', 'table', 'progressive'
  amount_cents    BIGINT NOT NULL,  -- store as cents to avoid float issues
  won_at          TIMESTAMPTZ,
  source          TEXT NOT NULL,  -- 'twitter', 'website', 'user_report', 'gov', 'facebook'
  source_url      TEXT,
  source_post_id  TEXT,  -- tweet id, post id, etc.
  trust_score     INTEGER DEFAULT 5,  -- 1-10 scale
  photo_url       TEXT,
  raw_text        TEXT,  -- original text before parsing
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_post_id)  -- prevent duplicate ingestion
);

CREATE INDEX idx_jackpots_casino ON jackpots(casino_id);
CREATE INDEX idx_jackpots_amount ON jackpots(amount_cents DESC);
CREATE INDEX idx_jackpots_won_at ON jackpots(won_at DESC);

-- ─────────────────────────────────────────
-- SLOT PAYBACK (from gaming control boards)
-- ─────────────────────────────────────────
CREATE TABLE slot_payback (
  id              SERIAL PRIMARY KEY,
  casino_id       INTEGER REFERENCES casinos(id),
  report_month    DATE NOT NULL,  -- first day of the month
  denomination    TEXT,  -- 'penny', 'nickel', 'quarter', 'dollar', 'five_dollar', 'all'
  payback_pct     DECIMAL(5,2),  -- e.g. 94.23
  machine_count   INTEGER,
  source_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(casino_id, report_month, denomination)
);

-- ─────────────────────────────────────────
-- LOYALTY PROGRAMS
-- ─────────────────────────────────────────
CREATE TABLE loyalty_programs (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,  -- e.g. 'Boarding Pass', 'MGM Rewards'
  chain           TEXT,
  website         TEXT,
  signup_url      TEXT,
  affiliate_url   TEXT,  -- your affiliate tracking link
  affiliate_commission_cents INTEGER,  -- typical payout per signup
  tiers           JSONB,  -- [{name: 'Gold', points_required: 5000, benefits: [...]}]
  points_per_dollar DECIMAL(5,2),
  free_play       BOOLEAN DEFAULT false,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE casino_loyalty (
  casino_id       INTEGER REFERENCES casinos(id),
  loyalty_id      INTEGER REFERENCES loyalty_programs(id),
  PRIMARY KEY (casino_id, loyalty_id)
);

-- ─────────────────────────────────────────
-- PROMOTIONS (scraped from casino sites)
-- ─────────────────────────────────────────
CREATE TABLE promotions (
  id              SERIAL PRIMARY KEY,
  casino_id       INTEGER REFERENCES casinos(id),
  title           TEXT,
  description     TEXT,
  promo_type      TEXT,  -- 'free_play', 'multiplier', 'tournament', 'bingo', 'drawing'
  start_date      DATE,
  end_date        DATE,
  days_of_week    TEXT[],  -- ['monday', 'tuesday']
  value_dollars   INTEGER,  -- estimated dollar value
  source_url      TEXT,
  scraped_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- USER REPORTS (crowdsourced)
-- ─────────────────────────────────────────
CREATE TABLE user_reports (
  id              SERIAL PRIMARY KEY,
  casino_id       INTEGER REFERENCES casinos(id),
  machine_name    TEXT,
  amount_cents    BIGINT,
  report_type     TEXT,  -- 'jackpot', 'loose_machine', 'tight_machine', 'promotion'
  notes           TEXT,
  photo_url       TEXT,
  user_id         TEXT,  -- hashed, no PII stored
  ip_hash         TEXT,
  trust_score     INTEGER DEFAULT 3,
  approved        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- REVIEWS (from Yelp, Google, TripAdvisor)
-- ─────────────────────────────────────────
CREATE TABLE reviews (
  id              SERIAL PRIMARY KEY,
  casino_id       INTEGER REFERENCES casinos(id),
  source          TEXT,  -- 'yelp', 'google', 'tripadvisor'
  rating          DECIMAL(2,1),  -- 4.5
  review_count    INTEGER,
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PIPELINE LOG
-- ─────────────────────────────────────────
CREATE TABLE pipeline_runs (
  id              SERIAL PRIMARY KEY,
  scraper_name    TEXT NOT NULL,
  status          TEXT,  -- 'success', 'error', 'partial'
  records_added   INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ DEFAULT NOW()
);
