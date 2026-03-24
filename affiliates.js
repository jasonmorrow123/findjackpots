// affiliates.js — Affiliate config module for JackpotMap
// AFFILIATE_CONFIG maps casino slug patterns to affiliate data
// These are placeholder tracking URLs — real ones come after sign-up
// To activate: sign up, get your publisher IDs, update placeholderTrackingUrl,
// change status to 'active', and re-run affiliate-seeder.js

const AFFILIATE_CONFIG = [
  {
    chains: ['MGM Resorts'],
    slugPatterns: ['bellagio', 'mgm-grand', 'aria', 'vdara', 'park-mgm', 'new-york-new-york', 'excalibur', 'luxor', 'mandalay-bay', 'cosmopolitan'],
    network: 'Rakuten Advertising',
    signupUrl: 'https://rakutenadvertising.com',
    programUrl: 'https://rakutenadvertising.com/advertiser/mgm-resorts',
    commissionNote: '$30-75 per new MGM Rewards signup',
    placeholderTrackingUrl: 'https://click.linksynergy.com/deeplink?id=YOURPUBLISHERID&mid=MGMMID&murl=',
    status: 'pending_signup', // pending_signup | active | inactive
  },
  {
    chains: ['Caesars Entertainment'],
    slugPatterns: ['caesars-palace', 'harrahs', 'horseshoe', 'paris-las-vegas', 'bally', 'flamingo', 'linq', 'cromwell', 'planet-hollywood'],
    network: 'Rakuten Advertising',
    signupUrl: 'https://rakutenadvertising.com',
    programUrl: 'https://rakutenadvertising.com',
    commissionNote: '$50 per new Caesars Rewards signup',
    placeholderTrackingUrl: 'https://click.linksynergy.com/deeplink?id=YOURPUBLISHERID&mid=CAESARSMID&murl=',
    status: 'pending_signup',
  },
  {
    chains: ['Station Casinos'],
    slugPatterns: ['palace-station', 'red-rock', 'green-valley-ranch', 'santa-fe-station', 'sunset-station', 'boulder-station'],
    network: 'Direct',
    signupUrl: 'https://www.stationcasinos.com/partners',
    programUrl: 'https://www.stationcasinos.com/partners',
    commissionNote: 'Contact directly — best locals loyalty program in LV',
    placeholderTrackingUrl: null,
    status: 'pending_signup',
  },
  {
    chains: ['Boyd Gaming Corporation', 'Boyd Gaming'],
    slugPatterns: ['suncoast', 'gold-coast', 'orleans', 'sam-s-town', 'main-street-station', 'california-hotel', 'aliante', 'cannery'],
    network: 'Direct',
    signupUrl: 'https://www.boydgaming.com/about/contact',
    programUrl: 'https://www.boydgaming.com',
    commissionNote: 'Contact Boyd Gaming directly for affiliate deal',
    placeholderTrackingUrl: null,
    status: 'pending_signup',
  },
  {
    chains: ['Hard Rock'],
    slugPatterns: ['mirage', 'hard-rock'],
    network: 'Impact',
    signupUrl: 'https://app.impact.com/signup/publisher',
    programUrl: 'https://app.impact.com',
    commissionNote: 'Hard Rock Rewards affiliate — search Impact marketplace',
    placeholderTrackingUrl: null,
    status: 'pending_signup',
  },
];

// ── Legendz.com — CJ Affiliate (active) ───────────────────────────────────
// Social casino + free-to-play sportsbook. $30 per signup.
// Excluded states: NV, NJ, MI, NY, WV, MS, IN, DE, MT, KS, IA
const LEGENDZ = {
  legendz: {
    name: 'Legendz',
    regLink: 'https://www.dpbolvw.net/click-101711107-17107127',
    bannerLink: 'https://www.dpbolvw.net/click-101711107-17133749',
    bannerImg: 'https://www.ftjcfx.com/image-101711107-17133749',
    pixelImg: 'https://www.awltovhc.com/image-101711107-17107127',
    cpa: 3000, // $30 in cents
    network: 'CJ',
    notes: 'Social casino + sportsbook. $30/signup. Excluded: NV, NJ, MI, NY, WV, MS, IN, DE, MT, KS, IA',
    excludedStates: ['NV', 'NJ', 'MI', 'NY', 'WV', 'MS', 'IN', 'DE', 'MT', 'KS', 'IA'],
  },
};

// ── Hotels.com — CJ Affiliate (active) ────────────────────────────────────
// Generic hotel search — shows for any casino with has_hotel=true
// Commission: $5-15 per hotel booking
const HOTELS_COM = {
  hotels_com: {
    name: 'Hotels.com',
    trackingUrl: 'https://www.kqzyfj.com/click-101711107-10433860',
    pixelUrl: 'https://www.ftjcfx.com/image-101711107-10433860',
    network: 'CJ',
    commission: '$5-15 per booking',
    epc: 166.88,
    notes: 'Generic hotel search — works for all casino hotels'
  }
};

module.exports = { AFFILIATE_CONFIG, LEGENDZ, HOTELS_COM };
