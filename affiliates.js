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

module.exports = { AFFILIATE_CONFIG };
