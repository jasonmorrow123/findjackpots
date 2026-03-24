/**
 * seo-routes.js — Server-side rendered SEO landing pages for FindJackpots
 *
 * Registers all SEO routes on the given Express app.
 * Call: require('./seo-routes')(app, pool)
 */

'use strict';

// ─── Helpers ───────────────────────────────────────────────────────────────

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmt$(cents) {
  if (!cents) return 'N/A';
  const dollars = Math.round(cents / 100);
  return '$' + dollars.toLocaleString();
}

function scoreLabel(rating, reviewCount) {
  if (!rating) return null;
  const r = parseFloat(rating);
  if (r >= 4.5) return 'Excellent';
  if (r >= 4.0) return 'Very Good';
  if (r >= 3.5) return 'Good';
  if (r >= 3.0) return 'Average';
  return 'Below Average';
}

function amenityBadges(c) {
  const badges = [];
  if (c.has_hotel) badges.push('<span class="badge">🏨 Hotel</span>');
  if (c.has_poker) badges.push('<span class="badge">🃏 Poker</span>');
  if (c.has_slots !== false) badges.push('<span class="badge">🎰 Slots</span>');
  if (c.has_sportsbook) badges.push('<span class="badge">📊 Sportsbook</span>');
  if (c.has_bingo) badges.push('<span class="badge">🎱 Bingo</span>');
  if (c.free_parking) badges.push('<span class="badge">🅿️ Free Parking</span>');
  return badges.join(' ');
}

// Shared <head> boilerplate
function htmlHead({ title, description, canonical, ogImage = 'https://findjackpots.com/icons/icon-512.png', ogType = 'website' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">

  <!-- Open Graph -->
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="FindJackpots">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-M2HPLEE6RW"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-M2HPLEE6RW');
  </script>

  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1953658342958950" crossorigin="anonymous"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #fff; color: #1a1a2e; line-height: 1.6; }
    a { color: #5c7aaa; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Header */
    .site-header { background: #5c7aaa; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
    .site-header .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .site-header .logo img { width: 32px; height: 32px; border-radius: 6px; }
    .site-header .logo span { font-size: 1.2rem; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .site-header nav a { color: #fff; font-size: 0.9rem; margin-left: 20px; opacity: 0.9; text-decoration: none; }
    .site-header nav a:hover { opacity: 1; text-decoration: underline; }

    /* Container */
    .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }

    /* Hero */
    .page-hero { background: linear-gradient(135deg, #5c7aaa 0%, #3a5a8a 100%); color: #fff; padding: 48px 24px 40px; text-align: center; }
    .page-hero h1 { margin: 0 0 12px; font-size: 2.2rem; font-weight: 800; }
    .page-hero p { margin: 0; font-size: 1.05rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }

    /* Sections */
    .section { padding: 40px 0; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    h2 { font-size: 1.5rem; color: #1a1a2e; margin: 0 0 20px; }
    h3 { font-size: 1.15rem; color: #1a1a2e; margin: 0 0 8px; }

    /* Casino table */
    .casino-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .casino-table th { background: #f0f4f9; text-align: left; padding: 12px 16px; font-size: 0.85rem; font-weight: 600; color: #5c7aaa; border-bottom: 2px solid #dde6f0; }
    .casino-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 0.92rem; vertical-align: top; }
    .casino-table tr:hover td { background: #fafcff; }
    .casino-table .casino-name a { font-weight: 600; color: #1a1a2e; }
    .casino-table .casino-name a:hover { color: #5c7aaa; }
    .casino-table .casino-city { color: #666; font-size: 0.85rem; }

    /* Score badge */
    .score-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; background: #f2c94c; color: #1a1a2e; }
    .score-badge.excellent { background: #4caf50; color: #fff; }
    .score-badge.very-good { background: #8bc34a; color: #fff; }
    .score-badge.good { background: #f2c94c; color: #1a1a2e; }
    .score-badge.average { background: #ff9800; color: #fff; }

    /* Amenity badges */
    .badge { display: inline-block; background: #f0f4f9; border: 1px solid #dde6f0; border-radius: 12px; padding: 2px 8px; font-size: 0.78rem; margin: 2px 2px 2px 0; white-space: nowrap; }

    /* Jackpot list */
    .jackpot-list { list-style: none; margin: 0; padding: 0; }
    .jackpot-list li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .jackpot-list li:last-child { border-bottom: none; }
    .jackpot-amount { font-size: 1.1rem; font-weight: 700; color: #5c7aaa; min-width: 90px; }
    .jackpot-meta { flex: 1; }
    .jackpot-meta .machine { font-weight: 600; color: #1a1a2e; }
    .jackpot-meta .casino { color: #666; font-size: 0.85rem; }

    /* State nav */
    .state-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .state-nav li a { display: inline-block; padding: 6px 14px; background: #f0f4f9; border: 1px solid #dde6f0; border-radius: 20px; font-size: 0.85rem; color: #5c7aaa; transition: all 0.15s; }
    .state-nav li a:hover, .state-nav li a.active { background: #5c7aaa; color: #fff; border-color: #5c7aaa; text-decoration: none; }

    /* CTA */
    .cta-box { background: linear-gradient(135deg, #f0f4f9 0%, #e8eef5 100%); border: 1px solid #dde6f0; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0; }
    .cta-box h3 { margin: 0 0 12px; font-size: 1.3rem; }
    .cta-box p { color: #555; margin: 0 0 20px; }
    .cta-btn { display: inline-block; background: #5c7aaa; color: #fff !important; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 1rem; text-decoration: none !important; transition: background 0.15s; }
    .cta-btn:hover { background: #4a6898; }
    .cta-btn.gold { background: #f2c94c; color: #1a1a2e !important; }
    .cta-btn.gold:hover { background: #e0b83a; }

    /* Intro text */
    .intro-text { font-size: 1.02rem; color: #333; line-height: 1.8; max-width: 800px; }
    .intro-text p { margin: 0 0 16px; }
    .intro-text p:last-child { margin: 0; }

    /* AdSense placeholder */
    .ad-slot { text-align: center; padding: 20px 0; min-height: 90px; }

    /* FAQ */
    .faq-item { margin-bottom: 20px; padding: 20px; background: #f9fbff; border-left: 3px solid #5c7aaa; border-radius: 0 8px 8px 0; }
    .faq-item dt { font-weight: 700; margin-bottom: 6px; color: #1a1a2e; }
    .faq-item dd { margin: 0; color: #444; }

    /* Casino detail */
    .casino-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
    .overview-card { background: #f9fbff; border: 1px solid #dde6f0; border-radius: 8px; padding: 16px; }
    .overview-card .label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .overview-card .value { font-weight: 600; color: #1a1a2e; }

    /* Nearby casinos */
    .nearby-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 16px; }
    .nearby-card { border: 1px solid #dde6f0; border-radius: 8px; padding: 16px; background: #fff; }
    .nearby-card h4 { margin: 0 0 4px; font-size: 1rem; }
    .nearby-card .location { color: #666; font-size: 0.85rem; margin-bottom: 8px; }

    /* Footer */
    .site-footer { background: #f0f4f9; border-top: 1px solid #dde6f0; padding: 32px 24px; text-align: center; color: #888; font-size: 0.85rem; margin-top: 40px; }
    .site-footer a { color: #5c7aaa; margin: 0 8px; }

    @media (max-width: 640px) {
      .page-hero h1 { font-size: 1.6rem; }
      .casino-table { font-size: 0.85rem; }
      .casino-table th:nth-child(n+4), .casino-table td:nth-child(n+4) { display: none; }
    }
  </style>
</head>`;
}

function siteHeader() {
  return `<header class="site-header">
  <a class="logo" href="https://findjackpots.com">
    <img src="https://findjackpots.com/logo-icon.svg" alt="FindJackpots logo" onerror="this.style.display='none'">
    <span>FindJackpots</span>
  </a>
  <nav>
    <a href="https://findjackpots.com">Home</a>
    <a href="/biggest-jackpots">Top Jackpots</a>
    <a href="/best-midwest-casinos">Midwest</a>
    <a href="/best-casinos-near-me">Near Me</a>
  </nav>
</header>`;
}

const STATE_LINKS = [
  { slug: 'minnesota', name: 'Minnesota' },
  { slug: 'nevada',    name: 'Nevada'    },
  { slug: 'iowa',      name: 'Iowa'      },
  { slug: 'wisconsin', name: 'Wisconsin' },
  { slug: 'illinois',  name: 'Illinois'  },
  { slug: 'michigan',  name: 'Michigan'  },
  { slug: 'indiana',   name: 'Indiana'   },
  { slug: 'ohio',      name: 'Ohio'      },
  { slug: 'missouri',  name: 'Missouri'  },
];

function stateNavHtml(activeSlug) {
  return `<ul class="state-nav">
    ${STATE_LINKS.map(s => `<li><a href="/casinos/${s.slug}"${s.slug === activeSlug ? ' class="active"' : ''}>${s.name}</a></li>`).join('\n    ')}
  </ul>`;
}

// State counts for pill labels
const STATE_CASINO_COUNTS = {
  minnesota: 21, nevada: 426, iowa: 23, wisconsin: 26,
  illinois: 14, michigan: 28, indiana: 13, ohio: 11, missouri: 13,
};

function otherStatesHtml(currentSlug) {
  const pillStyle = 'background:#5c7aaa;color:white;padding:8px 16px;border-radius:20px;text-decoration:none;font-size:13px;white-space:nowrap;';
  const pills = STATE_LINKS
    .filter(s => s.slug !== currentSlug)
    .map(s => `<a href="/casinos/${s.slug}" style="${pillStyle}">${s.name} (${STATE_CASINO_COUNTS[s.slug] || ''})</a>`)
    .join('\n      ');
  return `<div style="margin:40px 0;padding:24px;background:#f4f7fb;border-radius:12px;">
  <h3 style="margin:0 0 16px;color:#1e3a5f;font-size:1.1rem;">Explore Casinos in Other States</h3>
  <div style="display:flex;flex-wrap:wrap;gap:10px;">
    ${pills}
  </div>
</div>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <div class="container">
    <p>
      <a href="https://findjackpots.com">FindJackpots Home</a> ·
      <a href="/biggest-jackpots">Biggest Jackpots</a> ·
      <a href="/best-casinos-near-me">Casinos Near Me</a> ·
      <a href="/best-midwest-casinos">Midwest Casinos</a> ·
      <a href="/casino-jackpot-tracker">Jackpot Tracker</a> ·
      <a href="/highest-payout-casinos">Highest Payout</a>
    </p>
    <p>
      ${STATE_LINKS.map(s => `<a href="/casinos/${s.slug}">${s.name}</a>`).join(' · ')}
    </p>
    <p style="margin-top:16px;">
      <a href="https://findjackpots.com/privacy">Privacy Policy</a> ·
      <a href="https://findjackpots.com/terms">Terms of Use</a>
    </p>
    <p style="margin-top:12px;">© ${new Date().getFullYear()} FindJackpots · Track jackpots, compare casinos, find winners near you.</p>
    <p style="font-size:0.78rem;color:#bbb;margin-top:8px;">FindJackpots is for entertainment and informational purposes only. Gambling involves risk. Please gamble responsibly. 21+</p>
  </div>
</footer>`;
}

function adSlot() {
  return `<div class="ad-slot">
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1953658342958950" data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

function scoreBadgeHtml(rating) {
  if (!rating) return '';
  const r = parseFloat(rating);
  let cls = 'good';
  let label = 'Good';
  if (r >= 4.5) { cls = 'excellent'; label = 'Excellent'; }
  else if (r >= 4.0) { cls = 'very-good'; label = 'Very Good'; }
  else if (r < 3.0) { cls = 'average'; label = 'Average'; }
  return `<span class="score-badge ${cls}">${label} ${r.toFixed(1)}★</span>`;
}

// ─── State Content ─────────────────────────────────────────────────────────

const STATE_INFO = {
  MN: {
    name: 'Minnesota',
    slug: 'minnesota',
    intro: `<p>Gambling in Minnesota is a uniquely tribal affair — every one of the state's 20+ casinos is operated by a federally recognized Native American tribe under a compact with the state government. There are no commercial casinos in Minnesota, and sports betting remains unavailable, making tribal properties the only legal in-person gaming option in the state. That exclusivity has actually worked in players' favor: Minnesota's tribal casinos have invested heavily in their facilities, and the best casinos in Minnesota rival resort destinations anywhere in the Midwest.</p>
<p>Topping every list is <strong>Mystic Lake Casino Hotel</strong> near Prior Lake — the largest casino in the Upper Midwest. With over 4,000 slot machines, a full table game floor, a world-class spa, luxury hotel, and top-tier entertainment, Mystic Lake is a destination unto itself. The <strong>Club M loyalty program</strong> is one of the most generous in the region: tiered rewards, free play credits, hotel discounts, and priority access to sold-out shows. Regular bonus-point events and birthday rewards make Club M worth signing up for before your first visit. Other leading Minnesota casino loyalty programs include Grand Rewards (Grand Casino Mille Lacs and Grand Casino Hinckley) and TI Rewards at Treasure Island Resort &amp; Casino near Red Wing.</p>
<p>Slot jackpots in Minnesota are a major draw for players across the Upper Midwest. While tribal casinos aren't required to publicly report payout percentages, progressive jackpots — including multi-casino linked networks — regularly produce wins from tens of thousands of dollars into the seven-figure range. Dollar denomination slots and video poker machines tend to offer the best casino payouts in Minnesota, and FindJackpots tracks <a href="/biggest-jackpots">the biggest slot jackpot wins</a> from Minnesota casinos in real time so you always know where the action is.</p>
<p>Beyond Mystic Lake, great options include Fond-du-Luth Casino in downtown Duluth, Black Bear Casino Resort near Carlton, Shooting Star Casino in Mahnomen, and the remote but spectacular Seven Clans casinos in the Red Lake Nation territory. Each property has its own character — from the woodsy, northwoods vibe of the UP-adjacent casinos to the polished resort feel of the metro-area properties.</p>
<p>Minnesota's location makes it a natural hub for Midwest casino exploration. You're within a few hours of <a href="/casinos/wisconsin">Wisconsin's tribal casinos</a>, <a href="/casinos/iowa">Iowa's riverboat casinos</a>, and even <a href="/casinos/michigan">Michigan's Detroit casinos</a>. For a full cross-state comparison, see our <a href="/best-midwest-casinos">Best Midwest Casinos guide</a>, or use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> to find out which Minnesota casino is running hot right now.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Minnesota?',
        a: 'Yes, gambling is legal in Minnesota. The state permits casino gambling exclusively at tribally operated casinos under compacts with the state government. There are 20+ tribal casinos statewide offering slots, table games, and poker. Commercial casinos and sports betting are not currently legal in Minnesota.',
      },
      {
        q: 'What is the best casino in Minnesota?',
        a: 'Mystic Lake Casino Hotel near Prior Lake is widely considered the best casino in Minnesota. It is the largest casino in the Upper Midwest with over 4,000 slot machines, live entertainment, a luxury hotel, spa, and the Club M loyalty program. Grand Casino Mille Lacs and Treasure Island Resort & Casino are also top-rated options.',
      },
      {
        q: 'Do Minnesota casinos have slot machines?',
        a: 'Yes, all Minnesota tribal casinos feature slot machines as a central part of their gaming floors. Machines range from penny slots to high-limit progressives, with jackpots frequently reaching six and seven figures. Many casinos also offer video poker and electronic table games alongside traditional slots.',
      },
      {
        q: 'What casino has the best payouts in Minnesota?',
        a: 'Minnesota tribal casinos are not required to publicly disclose payout percentages, but Mystic Lake and Grand Casino properties are consistently cited by players for strong slot returns. Dollar denomination slots and video poker machines typically offer better odds than penny slots. Use FindJackpots to see where recent big jackpots have hit.',
      },
    ],
  },
  NV: {
    name: 'Nevada',
    slug: 'nevada',
    intro: `<p>Gambling in Nevada is unlike anywhere else in the world. Nevada became the first U.S. state to legalize commercial casino gambling in 1931, and over nine decades it has perfected the art of the casino experience. Whether you're chasing slot jackpots in Nevada, looking for the best casino payouts, or simply want to experience the energy of the Las Vegas Strip for the first time, Nevada delivers at every level.</p>
<p>The best casinos in Nevada span the full spectrum. On the Strip, <strong>Bellagio</strong>, <strong>Caesars Palace</strong>, <strong>MGM Grand</strong>, <strong>The Venetian</strong>, and <strong>Wynn Las Vegas</strong> define global luxury gaming — massive floors, Michelin-starred restaurants, world-class entertainment, and hotel towers that stretch to the sky. Just a mile north, <strong>Fremont Street</strong> in downtown Las Vegas offers the old-Vegas experience: classic casinos like the Golden Nugget, lower table minimums, and the iconic Fremont Street Experience light canopy overhead. For locals, Station Casinos properties (Red Rock Resort, Green Valley Ranch, Sunset Station) and Boyd Gaming clubs offer outstanding value, tight slot action, and strong Nevada casino loyalty programs — including Station's Boarding Pass and Boyd's B Connected.</p>
<p>Nevada casino payouts are among the best in the country, and it's not by accident. The <strong>Nevada Gaming Control Board</strong> requires all licensed casinos to report slot machine returns by denomination every month, and that data is publicly available. Dollar slots in Clark County (Las Vegas) typically return 95%+ to players. Penny slots average around 88–90%. This regulated transparency is a significant reason why serious slot players gravitate toward Nevada over other states.</p>
<p>Slot jackpots in Nevada produce some of the most spectacular wins in casino history. <strong>Megabucks</strong> — a Nevada-wide progressive network with starting jackpots of $10 million — has generated wins exceeding $39 million. IGT's Wide Area Progressives and linked local progressives mean multi-million-dollar jackpots are a regular part of Nevada's casino landscape. FindJackpots tracks <a href="/biggest-jackpots">the biggest jackpot wins</a> from Nevada casinos so you can see which properties are paying out right now.</p>
<p>Nevada casino loyalty programs are built to reward frequent visitors. <strong>Caesars Rewards</strong> (covering Caesars Palace, Harrah's, Horseshoe, Paris Las Vegas) and <strong>MGM Rewards</strong> (covering MGM Grand, Bellagio, Aria, Park MGM, Vdara) are the two dominant programs, each offering hotel comps, free play, dining credits, and event access across dozens of properties. Use the <a href="/casino-jackpot-tracker">FindJackpots Jackpot Tracker</a> to monitor which Nevada casinos are running hot, and check our <a href="/biggest-jackpots">biggest jackpots</a> page for the latest massive wins.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Nevada?',
        a: 'Yes, Nevada has had legal commercial gambling since 1931, making it the oldest legal casino gambling jurisdiction in the United States. All forms of casino gambling — slots, table games, poker, sports betting — are legal for adults 21 and older. The Nevada Gaming Control Board licenses and regulates all casino operations.',
      },
      {
        q: 'What is the best casino in Nevada?',
        a: 'Bellagio and Caesars Palace on the Las Vegas Strip are perennially ranked among the best casinos in Nevada for their combination of gaming, amenities, entertainment, and overall experience. For value-focused players, Station Casinos properties like Red Rock Resort and Green Valley Ranch offer excellent locals-focused gaming with strong loyalty programs.',
      },
      {
        q: 'Do Nevada casinos have slot machines?',
        a: 'Yes, slot machines are the cornerstone of Nevada casino floors. Nevada has more slot machines per capita than any other state, ranging from penny slots to $100+ high-limit machines. Nevada is also home to Megabucks, a statewide progressive slot network with jackpots that regularly exceed $10 million.',
      },
      {
        q: 'What casino has the best payouts in Nevada?',
        a: 'The Nevada Gaming Control Board publishes monthly slot payout reports by casino and denomination. Dollar slots at major Las Vegas Strip casinos consistently return 95%+ to players. Locals casinos (Station Casinos, Boyd Gaming, Coast Casinos) often post higher average payback percentages than Strip mega-resorts, particularly on lower-denomination machines.',
      },
    ],
  },
  IA: {
    name: 'Iowa',
    slug: 'iowa',
    intro: `<p>Iowa was a genuine pioneer in Midwest casino gambling, launching the country's first legal riverboat casinos along the Mississippi River in 1991. That early start gave Iowa decades to build a mature, well-regulated gaming industry. Today the state has over 20 licensed casinos — a mix of tribal operations, commercial riverboats, and modern land-based facilities — making Iowa one of the most casino-dense states in the Midwest on a per-capita basis.</p>
<p>Gambling in Iowa is regulated by the <strong>Iowa Racing and Gaming Commission (IRGC)</strong>, which publishes detailed monthly revenue reports for every licensed casino in the state. This transparency is a genuine advantage for players: you can actually compare casino payouts in Iowa by looking at adjusted gross revenue trends, which gives a rough indication of how much each property is returning to players. The IRGC reports are publicly available and updated monthly.</p>
<p>The best casinos in Iowa span from east to west. On the Mississippi River, <strong>Rhythm City Casino Resort</strong> in Davenport is one of the state's most modern facilities, having completed a major renovation in recent years. Further south, Isle Casino Hotel Bettendorf and Catfish Bend Casino in Burlington round out the Quad Cities and southeast Iowa options. On the western border, <strong>Harrah's Council Bluffs</strong> and Ameristar Casino Council Bluffs draw heavily from the Omaha metro area just across the Missouri River. In central Iowa, Prairie Meadows Casino, Race Track &amp; Hotel in Altoona is the state's top-grossing property, featuring over 2,000 slots, table games, and live horse racing.</p>
<p>Iowa also has tribal gaming: the <strong>Meskwaki Bingo Casino Hotel</strong> near Tama, operated by the Sac and Fox Tribe of the Mississippi in Iowa, is one of the state's best-regarded casinos for slot jackpots in Iowa. Players report solid payouts and a well-run loyalty program. Iowa casino loyalty programs vary by operator — Caesars Rewards (at Harrah's), mychoice (at Hollywood/Penn properties), and independent programs at Iowa tribal casinos all offer free play, dining credits, and hotel discounts for frequent players.</p>
<p>Iowa's central location makes it ideal for Midwest casino road trips. It's within easy driving distance of <a href="/casinos/minnesota">Minnesota's tribal casinos</a>, <a href="/casinos/illinois">Illinois riverboat casinos</a>, and <a href="/casinos/missouri">Missouri's casino corridor</a>. See the <a href="/best-midwest-casinos">Best Midwest Casinos guide</a> for cross-state comparisons, and use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> to follow recent Iowa jackpot wins.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Iowa?',
        a: 'Yes, gambling is legal in Iowa. The state licenses commercial casinos, tribal gaming operations, and racinos (racing facilities with gaming). The Iowa Racing and Gaming Commission regulates all licensed gaming establishments. Iowa also offers sports betting and online sports wagering for adults 21 and older.',
      },
      {
        q: 'What is the best casino in Iowa?',
        a: 'Prairie Meadows Casino, Race Track & Hotel in Altoona is Iowa\'s top-grossing casino and a popular destination for its combination of slots, table games, live horse racing, and hotel amenities. Meskwaki Bingo Casino Hotel near Tama and Harrah\'s Council Bluffs are also consistently ranked among Iowa\'s best casinos.',
      },
      {
        q: 'Do Iowa casinos have slot machines?',
        a: 'Yes, all Iowa casinos feature slot machines. Both commercial and tribal casinos offer hundreds to thousands of slots including video slots, classic reel machines, video poker, and progressive jackpot games. The Iowa Racing and Gaming Commission regulates all gaming devices.',
      },
      {
        q: 'What casino has the best payouts in Iowa?',
        a: 'The Iowa Racing and Gaming Commission publishes monthly revenue reports for each casino, which can indicate relative payout performance. Prairie Meadows and Meskwaki are frequently cited by players for solid slot returns. Dollar denomination machines and video poker typically offer better odds than penny slots at any Iowa casino.',
      },
    ],
  },
  WI: {
    name: 'Wisconsin',
    slug: 'wisconsin',
    intro: `<p>Gambling in Wisconsin is entirely a tribal affair — the state has no commercial casinos. Eleven federally recognized Native American tribes operate more than 25 casinos across Wisconsin, from the shores of Lake Superior in the north to the Illinois border in the south. This tribal exclusivity has driven significant investment: Wisconsin's best casinos are genuinely world-class facilities with resort amenities, live entertainment, and some of the most competitive loyalty programs in the Midwest.</p>
<p>The largest and most prominent casino in Wisconsin is <strong>Potawatomi Hotel &amp; Casino</strong> in Milwaukee, operated by the Forest County Potawatomi Community. With over 3,000 slot machines, a full table game floor, a dedicated poker room, a luxury hotel, multiple restaurants, and a 500-seat bingo hall, Potawatomi is the closest thing Wisconsin has to a Las Vegas-style destination casino. Its <strong>Bingo &amp; More Rewards</strong> loyalty program offers tiered free play, dining comps, and hotel discounts, making it one of the best Wisconsin casino loyalty programs for regular players.</p>
<p>The <strong>Ho-Chunk Nation</strong> operates an impressive network of gaming facilities: Ho-Chunk Gaming Wisconsin Dells (adjacent to the state's most popular tourist destination), Ho-Chunk Gaming Madison, Ho-Chunk Gaming Black River Falls, and others. The <strong>Oneida Nation</strong> operates Oneida Casino near Green Bay, a major destination for Packers fans and northern Wisconsin visitors. Up north, tribal casinos like <strong>Lake of the Torches</strong> in Lac du Flambeau, <strong>St. Croix Casino</strong> in Turtle Lake, and the Mole Lake Sokaogon Chippewa Community's casinos serve visitors to Wisconsin's Northwoods lake country.</p>
<p>Slot jackpots in Wisconsin are a popular topic but somewhat opaque: tribal casinos are exempt from state gaming revenue reporting requirements, so payout data isn't publicly available the way it is in Nevada or Iowa. What players do know is that Wisconsin casinos run regular jackpot promotions, drawing events, and progressive machines with frequent mid-range wins. Use FindJackpots to track <a href="/biggest-jackpots">the biggest recent jackpots</a> and see where Wisconsin wins are being reported.</p>
<p>Casino payouts in Wisconsin vary by property and game type, and Wisconsin casino loyalty programs are a key differentiator. Beyond Potawatomi and Ho-Chunk, programs like Oneida One Club and the various rewards clubs at Ojibwe-operated casinos offer meaningful value — free play on visits, birthday bonuses, and invite-only events. For Midwest comparisons, check our <a href="/best-midwest-casinos">Best Midwest Casinos guide</a> and use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> to find active Wisconsin wins.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Wisconsin?',
        a: 'Yes, gambling is legal in Wisconsin, but only at tribally operated casinos. Wisconsin has no commercial casinos. Eleven federally recognized tribes operate more than 25 casinos under compacts with the state government. Lottery and charitable gaming are also legal. Sports betting and online casino gaming are not currently legal in Wisconsin.',
      },
      {
        q: 'What is the best casino in Wisconsin?',
        a: 'Potawatomi Hotel & Casino in Milwaukee is widely considered the best casino in Wisconsin, offering over 3,000 slot machines, table games, a poker room, luxury hotel, and multiple dining options. Ho-Chunk Gaming Wisconsin Dells and Oneida Casino near Green Bay are also top-rated Wisconsin casinos.',
      },
      {
        q: 'Do Wisconsin casinos have slot machines?',
        a: 'Yes, all Wisconsin tribal casinos feature slot machines as their primary gaming offering. Machines range from penny video slots to high-limit progressive games. Video poker is also widely available. Wisconsin tribal casinos are not required to report payout percentages publicly.',
      },
      {
        q: 'What casino has the best payouts in Wisconsin?',
        a: 'Wisconsin tribal casinos do not publicly disclose slot payout percentages. However, Potawatomi and Ho-Chunk Gaming properties are consistently well-regarded by players for return rates and game variety. Dollar denomination slots and video poker machines generally offer better odds. Use FindJackpots to see recent jackpot wins from Wisconsin casinos.',
      },
    ],
  },
  IL: {
    name: 'Illinois',
    slug: 'illinois',
    intro: `<p>Illinois has one of the most dynamic commercial casino industries in the Midwest, with a mix of riverboat and land-based facilities spread across the state. The Illinois Gaming Board (IGB) regulates all licensed casinos and publishes detailed monthly revenue reports — making gambling in Illinois one of the most transparent gaming markets in the country. That data is publicly accessible and useful for comparing casino payouts in Illinois across different properties.</p>
<p>The best casinos in Illinois are concentrated around the Chicago metro area. <strong>Rivers Casino</strong> in Des Plaines is the state's highest-grossing casino by a wide margin, regularly generating over $50–60 million in monthly adjusted gross revenue — one of the top single-property gaming revenues in the entire United States. Its location just minutes from O'Hare Airport makes it convenient for travelers. <strong>Hollywood Casino Aurora</strong> has operated along the Fox River since the riverboat era and remains a popular destination for western Chicago suburbs. <strong>Grand Victoria Casino</strong> in Elgin and <strong>Harrah's Joliet</strong> round out the Chicago-area options.</p>
<p>Outside Chicagoland, <strong>Hollywood Casino Joliet</strong>, <strong>Par-A-Dice Hotel Casino</strong> in East Peoria, and <strong>Jumer's Casino &amp; Hotel</strong> in Rock Island serve the central and western Illinois markets. Illinois expanded its gaming law in 2019, authorizing six new casino licenses — including a Chicago city casino — along with sports betting. This expansion means Illinois casino gaming is actively growing, with new properties opening in the coming years that will add significant competition and choice for players.</p>
<p>Slot jackpots in Illinois are plentiful, particularly at the high-volume Chicago-area properties. Rivers Casino and Hollywood Aurora both see significant jackpot activity. Illinois casino loyalty programs include mychoice (the Penn Entertainment/Hollywood Casino network) and Rush Rewards (Rivers Casino), both offering tiered free play, hotel discounts, dining comps, and event access. Illinois is also one of the few states where you can cross-reference loyalty points earned in-state with national casino networks, giving frequent players substantial value.</p>
<p>For Midwest players, Illinois connects naturally with <a href="/casinos/indiana">Indiana's casino corridor</a> to the east and <a href="/casinos/iowa">Iowa's riverboat casinos</a> to the west. Check the <a href="/best-midwest-casinos">Best Midwest Casinos guide</a> for regional comparisons and use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> to follow recent Illinois wins.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Illinois?',
        a: 'Yes, gambling is legal in Illinois. The state licenses commercial casinos (both riverboat and land-based), racinos, and video gaming terminals (VGTs) at bars and restaurants. Sports betting is also legal. The Illinois Gaming Board regulates all licensed gaming. The legal gambling age is 21.',
      },
      {
        q: 'What is the best casino in Illinois?',
        a: 'Rivers Casino in Des Plaines is consistently the highest-grossing casino in Illinois and one of the top-revenue casinos in the entire United States. Hollywood Casino Aurora and Grand Victoria Casino in Elgin are also popular destinations. For a full resort experience, Par-A-Dice Hotel Casino in East Peoria is highly regarded.',
      },
      {
        q: 'Do Illinois casinos have slot machines?',
        a: 'Yes, all Illinois casinos feature slot machines. Rivers Casino in Des Plaines alone has over 1,000 slot and electronic gaming machines. Illinois also has thousands of video gaming terminals (VGTs) at licensed bars and restaurants statewide, offering additional slot-style gaming options.',
      },
      {
        q: 'What casino has the best payouts in Illinois?',
        a: 'The Illinois Gaming Board publishes monthly revenue and payout data for all licensed casinos. Rivers Casino in Des Plaines and Hollywood Casino Aurora have high gaming volumes which tend to support competitive payouts. Video poker machines and dollar slots typically offer better odds than penny slots at any Illinois casino.',
      },
    ],
  },
  MI: {
    name: 'Michigan',
    slug: 'michigan',
    intro: `<p>Michigan offers one of the most diverse casino landscapes in the Midwest — a dual market of commercial and tribal gaming that gives players more options than almost any other state. Gambling in Michigan includes three world-class commercial casinos in downtown Detroit, over 20 tribal casinos operated by 12 Native American tribes, and a fully legal online casino market that launched in 2021. Few states can match Michigan's breadth of gaming options.</p>
<p>The Detroit commercial casinos — <strong>MGM Grand Detroit</strong>, <strong>MotorCity Casino Hotel</strong>, and <strong>Greektown Casino-Hotel</strong> — are major destination resorts anchoring downtown Detroit's revitalized core. Each features thousands of slot machines, full table game floors, high-limit rooms, hotels, multiple restaurants, and entertainment venues. The <strong>Michigan Gaming Control Board</strong> regulates these commercial properties and requires detailed monthly revenue reporting, giving players valuable transparency into casino payouts in Michigan.</p>
<p>Michigan's tribal casino scene is equally impressive. <strong>Soaring Eagle Casino &amp; Resort</strong> near Mount Pleasant, operated by the Saginaw Chippewa Indian Tribe, is one of the largest tribal casinos in the Midwest with over 4,000 machines and a major entertainment arena. <strong>Four Winds Casinos</strong>, operated by the Pokagon Band of Potawatomi Indians, run four properties in New Buffalo, South Bend (Indiana), Hartford, and Dowagiac — particularly popular with Chicago-area visitors. <strong>FireKeepers Casino Hotel</strong> near Battle Creek is another top-tier destination, frequently cited for solid slot jackpots in Michigan and a competitive loyalty program.</p>
<p>Michigan casino loyalty programs span both tribal and commercial operators. MGM Rewards (at MGM Grand Detroit), M life (integrated with national MGM properties), and individual tribal clubs like Soaring Eagle Rewards all offer tiered benefits, free play, hotel comps, and dining credits. Michigan casino payouts at commercial properties are publicly reported and competitive with regional peers.</p>
<p>Michigan's 2021 launch of online casino gaming and sports betting through DraftKings, BetMGM, FanDuel, and other operators makes it one of the most progressive gambling states in the country. Whether you prefer in-person or digital play, Michigan has you covered. Track <a href="/biggest-jackpots">the biggest Michigan jackpots</a>, compare properties on the <a href="/casino-jackpot-tracker">Jackpot Tracker</a>, or explore the <a href="/best-midwest-casinos">Best Midwest Casinos</a> guide for regional context.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Michigan?',
        a: 'Yes, gambling is legal in Michigan. The state has three licensed commercial casinos in Detroit, over 20 tribal casinos statewide, and a fully legal online casino and sports betting market that launched in 2021. The Michigan Gaming Control Board regulates commercial casinos; tribal gaming is governed by tribal-state compacts. The legal gambling age is 21.',
      },
      {
        q: 'What is the best casino in Michigan?',
        a: 'MGM Grand Detroit is widely considered the best commercial casino in Michigan for its size, amenities, and loyalty program integration. Among tribal casinos, Soaring Eagle Casino & Resort near Mount Pleasant and Four Winds New Buffalo are consistently top-rated. FireKeepers Casino Hotel near Battle Creek is also highly regarded.',
      },
      {
        q: 'Do Michigan casinos have slot machines?',
        a: 'Yes, all Michigan casinos — both commercial and tribal — feature slot machines. Soaring Eagle alone has over 4,000 machines. Michigan commercial casinos report monthly gaming data, and all offer a range of slots from penny games to high-limit progressives capable of producing major jackpots.',
      },
      {
        q: 'What casino has the best payouts in Michigan?',
        a: 'The Michigan Gaming Control Board publishes monthly revenue reports for Detroit\'s three commercial casinos. MGM Grand Detroit and MotorCity Casino are frequently cited for competitive slot payouts. Among tribal casinos, Soaring Eagle and Four Winds New Buffalo are popular choices. Dollar slots and video poker typically offer the best return rates at any Michigan casino.',
      },
    ],
  },
  IN: {
    name: 'Indiana',
    slug: 'indiana',
    intro: `<p>Indiana's casino industry has a rich history rooted in the riverboat gambling era of the 1990s — and today it has evolved into one of the most significant gaming markets in the Midwest. Gambling in Indiana is conducted through licensed commercial casinos regulated by the Indiana Gaming Commission (IGC), which requires detailed monthly reporting from all operators. That transparency makes Indiana one of the best-documented casino markets in the country for comparing casino payouts and property performance.</p>
<p>The best casinos in Indiana include some of the highest-revenue gaming facilities in the United States. <strong>Horseshoe Hammond</strong>, located in Hammond just minutes from Chicago, is among the top-grossing riverboat casinos in the country, regularly posting $40–55 million in monthly adjusted gross revenue. Its proximity to Chicago's massive population makes it a perennial powerhouse. <strong>Hard Rock Casino Northern Indiana</strong>, which opened in Gary in 2021, has quickly become a major destination with over 2,000 machines, live table games, a hotel, and a full entertainment venue.</p>
<p>Further south, <strong>Caesars Southern Indiana</strong> (formerly Horseshoe Southern Indiana) in Elizabeth is a resort-scale destination casino with a hotel, spa, multiple restaurants, and an entertainment center. <strong>Blue Chip Casino Hotel &amp; Spa</strong> in Michigan City serves Northwest Indiana and southwest Michigan. <strong>Belterra Casino Resort</strong> in Florence sits on the Ohio River and offers a genuine resort experience with golf, hotel, and multiple dining options. Indiana's casino geography spans from the Chicago metro suburbs all the way south to the Kentucky border, providing strong regional coverage.</p>
<p>Indiana casino loyalty programs are led by <strong>Caesars Rewards</strong> (covering Caesars Southern Indiana, Horseshoe Hammond, and affiliated properties) and <strong>mychoice</strong> (the Penn Entertainment network covering Hollywood Casino Lawrenceburg and others). These are nationally networked programs, meaning points and tier status earned in Indiana can be used at partner properties across the country — a significant benefit for frequent casino travelers.</p>
<p>Slot jackpots in Indiana are well-documented thanks to IGC reporting, and Indiana's high-volume casinos produce regular large wins. Track recent activity on the <a href="/casino-jackpot-tracker">FindJackpots Jackpot Tracker</a>, see the <a href="/biggest-jackpots">biggest jackpots</a> hitting right now, or compare Indiana with neighboring markets in our <a href="/best-midwest-casinos">Best Midwest Casinos guide</a>.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Indiana?',
        a: 'Yes, gambling is legal in Indiana. The state licenses commercial casinos (including riverboat and land-based facilities), racinos at horse racing tracks, and sports betting. The Indiana Gaming Commission regulates all licensed casinos. The legal gambling age is 21 for casinos and 18 for the lottery.',
      },
      {
        q: 'What is the best casino in Indiana?',
        a: 'Horseshoe Hammond near Chicago is Indiana\'s highest-revenue casino and one of the top-grossing casinos in the country. Hard Rock Casino Northern Indiana in Gary is a newer property that has quickly become a premier destination. Caesars Southern Indiana in Elizabeth is the top choice for a full resort experience with hotel, spa, and entertainment.',
      },
      {
        q: 'Do Indiana casinos have slot machines?',
        a: 'Yes, all Indiana casinos feature slot machines. Indiana\'s larger properties like Horseshoe Hammond and Hard Rock Northern Indiana have 2,000+ machines each, ranging from penny slots to high-limit progressive games. Indiana Gaming Commission reporting tracks total gaming positions at each licensed property.',
      },
      {
        q: 'What casino has the best payouts in Indiana?',
        a: 'The Indiana Gaming Commission publishes monthly adjusted gross revenue data for all licensed casinos, which can indicate relative payout performance. High-volume properties like Horseshoe Hammond and Caesars Southern Indiana typically support competitive payouts due to machine volume. Dollar denomination slots and video poker offer better return rates than penny slots at any Indiana casino.',
      },
    ],
  },
  OH: {
    name: 'Ohio',
    slug: 'ohio',
    intro: `<p>Ohio launched its commercial casino industry in 2012, making it one of the newer gaming markets in the Midwest — but what it lacks in history, it makes up for with scale and regulation. Four full-scale commercial casinos opened in Ohio's major cities in 2012, quickly followed by a network of racinos (racing facilities with video lottery terminals) that extended gaming access across the state. Today, gambling in Ohio is a major industry regulated by the <strong>Ohio Casino Control Commission (OCCC)</strong>, which enforces strict standards and publishes regular financial reports.</p>
<p>The four original Ohio commercial casinos are the anchors of the state's gaming scene. <strong>JACK Cleveland Casino</strong> occupies the historic Higbee Building in downtown Cleveland, offering slots, table games, a poker room, and multiple dining options. <strong>Hollywood Casino Columbus</strong> is one of the largest casinos in Ohio, featuring 2,200+ slot machines and an extensive table game floor. <strong>JACK Cincinnati Casino</strong> in downtown Cincinnati is a sleek modern facility that draws heavily from the Cincinnati metro area and nearby Kentucky. <strong>Hollywood Casino Toledo</strong> rounds out the original four, serving Northwest Ohio and Southeast Michigan visitors.</p>
<p>Ohio racinos add another dimension to the state's gaming landscape. <strong>MGM Northfield Park</strong> north of Akron, <strong>Hard Rock Rocksino Northfield Park</strong> (now part of MGM), <strong>JACK Thistledown Racino</strong> in North Randall, and nearly a dozen other facilities offer video lottery terminals alongside live horse racing. While technically VLTs rather than Class III casino slots, these machines provide comparable entertainment and jackpot opportunities, and the facilities have been continuously upgraded since opening.</p>
<p>Casino payouts in Ohio are reported monthly by the OCCC, and slot jackpots in Ohio are tracked at all commercial casino properties. The OCCC's reporting is among the most detailed in the Midwest, allowing players to compare adjusted gross revenue and gaming hold percentages across properties. Ohio casino loyalty programs include <strong>mychoice</strong> (Penn Entertainment/Hollywood Casinos), <strong>JACK Rewards</strong> (JACK casinos in Cleveland and Cincinnati), and <strong>MGM Rewards</strong> at Northfield Park.</p>
<p>Ohio legalized sports betting in 2023, adding another reason to visit casinos that have integrated sportsbooks. See the <a href="/biggest-jackpots">biggest Ohio jackpots</a> happening now, use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> for real-time win data, and check the <a href="/best-midwest-casinos">Best Midwest Casinos guide</a> to compare Ohio with neighboring states like <a href="/casinos/indiana">Indiana</a> and <a href="/casinos/michigan">Michigan</a>.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Ohio?',
        a: 'Yes, gambling is legal in Ohio. The state has four licensed commercial casinos, numerous racinos (racing facilities with video lottery terminals), and legal sports betting that launched in 2023. The Ohio Casino Control Commission regulates commercial casinos. The legal gambling age is 21 for casinos.',
      },
      {
        q: 'What is the best casino in Ohio?',
        a: 'Hollywood Casino Columbus is widely regarded as the best casino in Ohio for its size, variety of games, and amenities. JACK Cleveland Casino in downtown Cleveland and JACK Cincinnati Casino are also top-rated destinations. For a racino experience, MGM Northfield Park north of Akron is among the most popular in the state.',
      },
      {
        q: 'Do Ohio casinos have slot machines?',
        a: 'Yes, all Ohio commercial casinos feature Class III slot machines. Racinos across the state offer video lottery terminals (VLTs) that function similarly. Hollywood Casino Columbus alone has over 2,200 gaming machines. Ohio Casino Control Commission reporting covers all licensed gaming positions statewide.',
      },
      {
        q: 'What casino has the best payouts in Ohio?',
        a: 'The Ohio Casino Control Commission publishes monthly revenue and hold percentage data for commercial casinos. Hollywood Casino Columbus and JACK Cleveland Casino consistently show strong gaming volumes. Dollar denomination slots and video poker machines typically offer better return rates than penny slots. FindJackpots tracks recent jackpot wins across Ohio properties.',
      },
    ],
  },
  MO: {
    name: 'Missouri',
    slug: 'missouri',
    intro: `<p>Missouri has been a commercial casino state since 1993 when it legalized riverboat gambling along its river corridors, and today it operates one of the most established gaming markets in the Midwest. With 13 licensed commercial casinos regulated by the <strong>Missouri Gaming Commission (MGC)</strong>, gambling in Missouri is a major industry that generates billions in annual revenue. The MGC publishes detailed monthly financial reports for every licensed casino, making Missouri one of the most transparent gaming markets in the country for players interested in comparing casino payouts.</p>
<p>Missouri's casino geography follows its rivers. The <strong>Kansas City metro area</strong> hosts a cluster of major properties: <strong>Ameristar Casino Resort Spa Kansas City</strong> is one of the largest in the state, with a hotel, spa, multiple restaurants, and an expansive gaming floor. <strong>Hollywood Casino Kansas City</strong> and <strong>Argosy Casino Alton</strong> compete for the KC market, offering loyalty programs and regular jackpot promotions. In the <strong>St. Louis area</strong>, <strong>Lumiere Place Casino</strong> (operated by Caesars Entertainment) is a premier destination anchored to a full hotel and dining complex. <strong>River City Casino</strong> in Lemay and <strong>Harrah's St. Louis</strong> in Maryland Heights round out the metro offerings.</p>
<p>The best casinos in Missouri also include notable properties outside the two major metros. <strong>Isle of Capri Casino Hotel Boonville</strong> sits along the Missouri River in central Missouri. <strong>Lady Luck Casino Caruthersville</strong> serves the Bootheel region near the Tennessee and Arkansas borders. <strong>Mark Twain Casino</strong> in La Grange occupies a scenic spot on the Mississippi River in northeast Missouri. Each property reflects Missouri's strong river heritage while offering modern gaming amenities.</p>
<p>Slot jackpots in Missouri are regularly reported from the state's high-volume Kansas City and St. Louis properties. Missouri casino loyalty programs include <strong>Caesars Rewards</strong> (at Lumiere Place, Harrah's St. Louis), <strong>mychoice</strong> (at Hollywood Casino Kansas City and other Penn Gaming properties), and <strong>Ameristar's M life / MGM Rewards</strong> connection — giving Missouri players access to nationally networked reward programs with hotel, dining, and entertainment benefits across dozens of partner properties.</p>
<p>Missouri is ideally positioned for Midwest casino travel, bordering <a href="/casinos/iowa">Iowa</a>, <a href="/casinos/illinois">Illinois</a>, <a href="/casinos/indiana">Indiana</a>, and Kansas. Track <a href="/biggest-jackpots">the biggest Missouri jackpot wins</a> in real time, use the <a href="/casino-jackpot-tracker">Jackpot Tracker</a> to find active Missouri machines, or see how Missouri stacks up in our <a href="/best-midwest-casinos">Best Midwest Casinos guide</a>.</p>`,
    faqs: [
      {
        q: 'Is gambling legal in Missouri?',
        a: 'Yes, gambling is legal in Missouri. The state licenses 13 commercial casinos — all located on or near the Missouri and Mississippi rivers — under the oversight of the Missouri Gaming Commission. Sports betting and online gambling are not currently legal in Missouri. The legal gambling age is 21.',
      },
      {
        q: 'What is the best casino in Missouri?',
        a: 'Ameristar Casino Resort Spa Kansas City is widely regarded as one of the best casinos in Missouri for its combination of gaming floor size, hotel, spa, and dining options. Lumiere Place Casino in St. Louis (operated by Caesars) and River City Casino in Lemay are also top-rated Missouri destinations.',
      },
      {
        q: 'Do Missouri casinos have slot machines?',
        a: 'Yes, all Missouri casinos feature slot machines as a core part of their gaming floors. Missouri\'s licensed casinos collectively offer thousands of slot machines ranging from penny video slots to high-limit progressive games. The Missouri Gaming Commission tracks and reports gaming positions at each licensed property.',
      },
      {
        q: 'What casino has the best payouts in Missouri?',
        a: 'The Missouri Gaming Commission publishes monthly revenue reports for all 13 licensed casinos. High-volume properties like Ameristar Kansas City and River City Casino in the St. Louis area tend to support competitive payout rates. Dollar slots and video poker machines offer better return rates than penny slots at any Missouri casino. Use FindJackpots to track recent jackpot wins statewide.',
      },
    ],
  },
};

// ─── Module Export ─────────────────────────────────────────────────────────

module.exports = function registerSEORoutes(app, pool) {

  // ══════════════════════════════════════════════════════════════
  // TASK 1: State Landing Pages
  // ══════════════════════════════════════════════════════════════

  const STATE_MAP = {
    minnesota: 'MN', nevada: 'NV', iowa: 'IA', wisconsin: 'WI',
    illinois:  'IL', michigan:  'MI', indiana: 'IN', ohio:  'OH', missouri: 'MO',
  };

  for (const [stateSlug, stateCode] of Object.entries(STATE_MAP)) {
    app.get(`/casinos/${stateSlug}`, async (req, res) => {
      try {
        const info = STATE_INFO[stateCode] || { name: stateSlug, slug: stateSlug, intro: '' };
        const stateName = info.name;

        // Query casinos
        const casinosResult = await pool.query(`
          SELECT c.id, c.name, c.slug, c.city, c.state, c.address,
                 c.has_hotel, c.has_poker, c.has_sportsbook, c.has_bingo, c.has_slots, c.free_parking,
                 c.loyalty_program_name, c.loyalty_points_per_dollar,
                 c.monthly_revenue_cents, c.lat, c.lng,
                 r.rating, r.review_count
          FROM casinos c
          LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
          WHERE TRIM(c.state) = $1
          ORDER BY r.review_count DESC NULLS LAST, c.name ASC
          LIMIT 100
        `, [stateCode]);
        const casinos = casinosResult.rows;

        // Query jackpots for this state
        const jackpotsResult = await pool.query(`
          SELECT j.amount_cents, j.machine_name, j.won_at, j.created_at,
                 c.name AS casino_name, c.city, c.id AS casino_id, c.slug AS casino_slug
          FROM jackpots j
          JOIN casinos c ON c.id = j.casino_id
          WHERE TRIM(c.state) = $1
          ORDER BY j.amount_cents DESC
          LIMIT 10
        `, [stateCode]);
        const jackpots = jackpotsResult.rows;

        // JSON-LD: ItemList
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Best Casinos in ${stateName}`,
          url: `https://findjackpots.com/casinos/${stateSlug}`,
          numberOfItems: casinos.length,
          itemListElement: casinos.slice(0, 20).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            url: `https://findjackpots.com/casino/${c.id}/${slugify(c.name)}`,
          })),
        };

        // JSON-LD: FAQPage
        const stateFaqs = info.faqs || [];
        const faqJsonLd = stateFaqs.length > 0 ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: stateFaqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        } : null;

        // Casinos table rows
        const casinoRows = casinos.map(c => `
          <tr>
            <td class="casino-name">
              <a href="/casino/${c.id}/${slugify(c.name)}">${c.name}</a>
              <div class="casino-city">${c.city || ''}</div>
            </td>
            <td>${scoreBadgeHtml(c.rating)}</td>
            <td>${amenityBadges(c)}</td>
            <td>${c.loyalty_program_name || '—'}</td>
          </tr>`).join('');

        // Jackpot rows
        const jackpotItems = jackpots.length > 0
          ? `<ul class="jackpot-list">
            ${jackpots.map(j => `
              <li>
                <div class="jackpot-amount">${fmt$(j.amount_cents)}</div>
                <div class="jackpot-meta">
                  <div class="machine">${j.machine_name || 'Slot Machine'}</div>
                  <div class="casino"><a href="/casino/${j.casino_id}/${slugify(j.casino_name)}">${j.casino_name}</a> · ${j.city || ''}</div>
                </div>
              </li>`).join('')}
          </ul>`
          : `<p style="color:#888;">No jackpots recorded for ${stateName} yet. Check back soon!</p>`;

        const html = `${htmlHead({
          title: `Best Casinos in ${stateName} | FindJackpots`,
          description: `Find the best casinos in ${stateName}. Compare ${casinos.length} casinos by jackpots, amenities, loyalty programs, and ratings. Updated daily.`,
          canonical: `https://findjackpots.com/casinos/${stateSlug}`,
        })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>Best Casinos in ${stateName}</h1>
    <p>Compare ${casinos.length} casinos by jackpots, amenities, ratings, and loyalty programs</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">${info.intro || `<p>Explore the best casinos in ${stateName} on FindJackpots. We track jackpots, amenities, and loyalty programs so you can find the best place to play.</p>`}</div>
  </div>

  ${adSlot()}

  <div class="section">
    <h2>Casinos in ${stateName} (${casinos.length})</h2>
    <div style="overflow-x:auto;">
      <table class="casino-table">
        <thead>
          <tr>
            <th>Casino</th>
            <th>Rating</th>
            <th>Amenities</th>
            <th>Loyalty Program</th>
          </tr>
        </thead>
        <tbody>
          ${casinoRows || '<tr><td colspan="4" style="color:#888;padding:20px;">No casinos found.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>Top Jackpots in ${stateName}</h2>
    ${jackpotItems}
    <p style="margin-top:16px;"><a href="/casino-jackpot-tracker" style="font-weight:600;color:#5c7aaa;">See all jackpot winners →</a> &nbsp;|&nbsp; <a href="/biggest-jackpots">Biggest jackpots nationwide</a></p>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🎰 See Live Jackpots &amp; Casino Map</h3>
    <p>Use FindJackpots to explore the full interactive map, set jackpot alerts, and compare casinos side-by-side.</p>
    <a class="cta-btn" href="https://findjackpots.com">Open FindJackpots App →</a>
  </div>

  ${stateFaqs.length > 0 ? `
  <div class="section">
    <h2>Frequently Asked Questions: Gambling in ${stateName}</h2>
    <dl>
      ${stateFaqs.map(f => `
      <div class="faq-item">
        <dt>${f.q}</dt>
        <dd>${f.a}</dd>
      </div>`).join('')}
    </dl>
  </div>` : ''}

  ${otherStatesHtml(stateSlug)}

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(stateSlug)}
    <p style="margin-top:16px;color:#666;font-size:0.9rem;">
      Also explore: <a href="/biggest-jackpots">Biggest Jackpots Right Now</a> ·
      <a href="/best-midwest-casinos">Best Midwest Casinos</a> ·
      <a href="/casino-jackpot-tracker">Jackpot Tracker</a> ·
      <a href="/best-casinos-near-me">Compare Casinos Near Me</a>
    </p>
    <p style="margin-top:8px;"><a href="/casino-jackpot-tracker" style="font-weight:600;color:#5c7aaa;">See all jackpot winners →</a></p>
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd, null, 2)}</script>` : ''}

${siteFooter()}
</body>
</html>`;

        res.send(html);
      } catch (err) {
        console.error(`/casinos/${stateSlug} error:`, err.message);
        res.status(500).send('<h1>Server Error</h1><p>' + err.message + '</p>');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TASK 2: Intent / Keyword Landing Pages
  // ══════════════════════════════════════════════════════════════

  // /biggest-jackpots
  app.get('/biggest-jackpots', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT j.amount_cents, j.machine_name, j.machine_type, j.won_at, j.created_at,
               c.id AS casino_id, c.name AS casino_name, c.city, c.state, c.slug AS casino_slug
        FROM jackpots j
        JOIN casinos c ON c.id = j.casino_id
        ORDER BY j.amount_cents DESC
        LIMIT 20
      `);
      const jackpots = result.rows;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Biggest Casino Jackpots Right Now | FindJackpots',
        url: 'https://findjackpots.com/biggest-jackpots',
        description: 'Track the biggest casino jackpots in the USA. See the top 20 largest slot machine and casino jackpot wins tracked by FindJackpots.',
      };

      const jackpotItems = jackpots.map((j, i) => `
        <li>
          <div class="jackpot-amount">#${i + 1} ${fmt$(j.amount_cents)}</div>
          <div class="jackpot-meta">
            <div class="machine">${j.machine_name || j.machine_type || 'Slot Machine'}</div>
            <div class="casino">
              <a href="/casino/${j.casino_id}/${slugify(j.casino_name)}">${j.casino_name}</a>
              · ${j.city || ''}, ${(j.state || '').trim()}
              ${j.won_at ? `· ${new Date(j.won_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </div>
          </div>
        </li>`).join('');

      const html = `${htmlHead({
        title: 'Biggest Casino Jackpots Right Now | FindJackpots',
        description: 'Track the biggest casino jackpots in the USA. See the top 20 largest slot machine jackpot wins tracked by FindJackpots — updated daily.',
        canonical: 'https://findjackpots.com/biggest-jackpots',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>🏆 Biggest Casino Jackpots Right Now</h1>
    <p>The top 20 largest casino jackpot wins tracked by FindJackpots — updated daily</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">
      <p>Casino jackpots are the ultimate dream for any slots player — the moment a machine lights up and pays out life-changing money. But how do you know which casinos are actually paying out big wins? That's exactly what FindJackpots was built to solve.</p>
      <p>We aggregate jackpot data from casino websites, social media, and verified player reports across hundreds of casinos nationwide. The result is the most comprehensive jackpot tracking database available anywhere online — and it's completely free to use.</p>
      <p>Below you'll find the 20 biggest jackpots in our database, ranked by payout amount. These represent some of the largest slot machine and casino game wins we've tracked, from progressive jackpots on popular games like Wheel of Fortune and Megabucks to massive payouts on video poker and table games.</p>
      <p>Progressive jackpots grow every time someone plays a connected machine without hitting the top prize. When they finally hit, the results can be staggering — Nevada progressive jackpots regularly exceed $1 million, and some Megabucks jackpots have topped $20 million. While life-changing jackpots are statistically rare, they do happen every day across American casinos.</p>
      <p>The best strategy for jackpot hunting? Play at casinos that actively promote and track their winners — those casinos tend to have better player programs, more machines in play, and more transparent payout data. Use FindJackpots to compare casinos in your area and find where winners are hitting right now.</p>
    </div>
  </div>

  ${adSlot()}

  <div class="section">
    <h2>Top 20 Biggest Jackpots</h2>
    <ul class="jackpot-list">${jackpotItems}</ul>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🎰 Track Jackpots Near You</h3>
    <p>See recent jackpots at casinos near you, set up alerts, and compare loyalty programs — all in one free app.</p>
    <a class="cta-btn" href="https://findjackpots.com">Open FindJackpots →</a>
  </div>

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(null)}
    ${otherStatesHtml(null)}
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('/biggest-jackpots error:', err.message);
      res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
  });

  // /best-casinos-near-me
  app.get('/best-casinos-near-me', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c.name, c.slug, c.city, c.state,
               c.has_hotel, c.has_poker, c.has_slots, c.has_sportsbook, c.free_parking,
               c.loyalty_program_name, r.rating, r.review_count
        FROM casinos c
        LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
        WHERE r.rating >= 4.0 AND r.review_count >= 10
        ORDER BY r.rating DESC, r.review_count DESC
        LIMIT 30
      `);
      const casinos = result.rows;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Best Casinos Near Me | FindJackpots',
        url: 'https://findjackpots.com/best-casinos-near-me',
        description: 'Find the best casinos near you with FindJackpots. Compare ratings, jackpots, amenities, and loyalty programs to find the perfect casino for your visit.',
      };

      const casinoRows = casinos.map(c => `
        <tr>
          <td class="casino-name">
            <a href="/casino/${c.id}/${slugify(c.name)}">${c.name}</a>
            <div class="casino-city">${c.city || ''}, ${(c.state || '').trim()}</div>
          </td>
          <td>${scoreBadgeHtml(c.rating)}${c.review_count ? ` <span style="color:#888;font-size:0.8rem;">(${c.review_count} reviews)</span>` : ''}</td>
          <td>${amenityBadges(c)}</td>
        </tr>`).join('');

      const html = `${htmlHead({
        title: 'Best Casinos Near Me | FindJackpots',
        description: 'Find the best casinos near you. Compare ratings, jackpots, hotel amenities, loyalty programs, and recent winners. Use FindJackpots to locate the top-rated casinos in your area.',
        canonical: 'https://findjackpots.com/best-casinos-near-me',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>📍 Best Casinos Near Me</h1>
    <p>Find and compare the top-rated casinos in your area</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">
      <p>Finding the best casino near you shouldn't require hours of research. That's why FindJackpots exists — to be the Kayak of casinos, aggregating ratings, jackpot data, amenity information, and loyalty program details in one easy-to-use platform.</p>
      <p>The best casino near you depends on what you're looking for. Are you a slots player who cares most about jackpot frequency and machine variety? A poker enthusiast looking for active cash games and tournaments? A couples trip where you want hotel, spa, and fine dining alongside the casino floor? Or a locals player who wants generous free play, quick-hit promotions, and a comfortable atmosphere?</p>
      <p>FindJackpots helps you answer those questions by aggregating data across hundreds of casinos nationwide. Our ratings pull from Yelp reviews, our jackpot data comes from casino websites and verified reports, and our amenity information is sourced from casino websites and public records.</p>
      <p>To find the best casino specifically near your location, open the FindJackpots app at findjackpots.com and allow location access. We'll automatically show you the closest casinos ranked by quality, along with recent jackpots, current promotions, and loyalty program comparisons. You can also filter by amenities — show only casinos with hotels, poker rooms, or free parking.</p>
      <p>Below are some of the highest-rated casinos in our database, based on verified user reviews. These casinos have earned strong reputations for quality, customer service, and overall experience — a great starting point for finding your next favorite casino destination.</p>
    </div>
  </div>

  ${adSlot()}

  <div class="section">
    <h2>Top-Rated Casinos (${casinos.length} shown)</h2>
    <div style="overflow-x:auto;">
      <table class="casino-table">
        <thead>
          <tr>
            <th>Casino</th>
            <th>Rating</th>
            <th>Amenities</th>
          </tr>
        </thead>
        <tbody>${casinoRows}</tbody>
      </table>
    </div>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🗺️ Open the Interactive Casino Map</h3>
    <p>Use your location to find casinos near you instantly. Set jackpot alerts, compare loyalty programs, and track recent winners.</p>
    <a class="cta-btn gold" href="https://findjackpots.com">Find Casinos Near Me →</a>
  </div>

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(null)}
    ${otherStatesHtml(null)}
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('/best-casinos-near-me error:', err.message);
      res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
  });

  // /best-midwest-casinos
  app.get('/best-midwest-casinos', async (req, res) => {
    try {
      const midwestStates = ['MN', 'IA', 'IL', 'WI', 'MI', 'IN', 'OH', 'MO'];
      const result = await pool.query(`
        SELECT c.id, c.name, c.slug, c.city, c.state,
               c.has_hotel, c.has_poker, c.has_slots, c.has_sportsbook, c.free_parking,
               c.loyalty_program_name, r.rating, r.review_count
        FROM casinos c
        LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
        WHERE TRIM(c.state) = ANY($1)
        ORDER BY r.rating DESC NULLS LAST, r.review_count DESC NULLS LAST, c.name ASC
        LIMIT 60
      `, [midwestStates]);
      const casinos = result.rows;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Best Midwest Casinos',
        url: 'https://findjackpots.com/best-midwest-casinos',
        numberOfItems: casinos.length,
        itemListElement: casinos.slice(0, 10).map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          url: `https://findjackpots.com/casino/${c.id}/${slugify(c.name)}`,
        })),
      };

      const casinoRows = casinos.map(c => `
        <tr>
          <td class="casino-name">
            <a href="/casino/${c.id}/${slugify(c.name)}">${c.name}</a>
            <div class="casino-city">${c.city || ''}, ${(c.state || '').trim()}</div>
          </td>
          <td>${scoreBadgeHtml(c.rating)}</td>
          <td>${amenityBadges(c)}</td>
          <td><a href="/casinos/${(STATE_INFO[c.state.trim()] || {}).slug || c.state.trim().toLowerCase()}">${STATE_INFO[c.state.trim()]?.name || c.state.trim()}</a></td>
        </tr>`).join('');

      const html = `${htmlHead({
        title: 'Best Midwest Casinos | FindJackpots',
        description: `Compare the best casinos across the Midwest — Minnesota, Iowa, Illinois, Wisconsin, Michigan, Indiana, Ohio, and Missouri. Rated by jackpots, amenities, and player reviews.`,
        canonical: 'https://findjackpots.com/best-midwest-casinos',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>🌽 Best Midwest Casinos</h1>
    <p>The top-ranked casinos across Minnesota, Iowa, Illinois, Wisconsin, Michigan, Indiana, Ohio &amp; Missouri</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">
      <p>The Midwest is one of America's most underrated casino destinations. With more than 140 casinos spread across eight states — Minnesota, Iowa, Illinois, Wisconsin, Michigan, Indiana, Ohio, and Missouri — the region offers everything from world-class resort casinos to intimate tribal gaming halls, all within a few hours' drive of most Midwestern population centers.</p>
      <p>What makes Midwest casinos unique? Tribal gaming is the dominant force in Minnesota, Wisconsin, Iowa, and Michigan, where Native American tribes operate casinos under federal compacts. These tribal casinos are known for generous loyalty programs, frequent promotions, and a community-oriented atmosphere. In contrast, Illinois, Indiana, Ohio, and Missouri have robust commercial casino industries regulated by state gaming commissions, with large properties in or near major cities like Chicago, Indianapolis, Cincinnati, and Kansas City.</p>
      <p>Some of the Midwest's standout casinos include Mystic Lake Casino Hotel (Prior Lake, MN), the largest casino in the Upper Midwest; Potawatomi Hotel & Casino (Milwaukee, WI), an urban destination casino with 3,000 machines; Rivers Casino (Des Plaines, IL), one of the highest-grossing casinos in the country; and Soaring Eagle Casino & Resort (Mount Pleasant, MI), a full resort with a 500-room hotel.</p>
      <p>If you're planning a casino road trip through the Midwest, the routing opportunities are excellent. Minnesota-to-Wisconsin is a classic run, while Illinois-Indiana makes for an easy Chicago-area casino day. Ohio-Indiana offers multiple big commercial casinos within a short drive of each other. Use the state links below to explore each state's casino landscape in detail.</p>
    </div>
  </div>

  ${adSlot()}

  <div class="section">
    <h2>Top Midwest Casinos by Rating (${casinos.length} total)</h2>
    <div style="overflow-x:auto;">
      <table class="casino-table">
        <thead>
          <tr>
            <th>Casino</th>
            <th>Rating</th>
            <th>Amenities</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>${casinoRows}</tbody>
      </table>
    </div>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🎰 Explore the Full Casino Map</h3>
    <p>FindJackpots lets you filter Midwest casinos by state, amenities, jackpot activity, and loyalty program — all in one interactive map.</p>
    <a class="cta-btn" href="https://findjackpots.com">Open FindJackpots →</a>
  </div>

  <div class="section">
    <h2>Browse by Midwest State</h2>
    ${stateNavHtml(null)}
    ${otherStatesHtml(null)}
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('/best-midwest-casinos error:', err.message);
      res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
  });

  // /casino-jackpot-tracker
  app.get('/casino-jackpot-tracker', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT j.amount_cents, j.machine_name, j.machine_type, j.won_at, j.created_at, j.source,
               c.id AS casino_id, c.name AS casino_name, c.city, c.state, c.slug AS casino_slug
        FROM jackpots j
        JOIN casinos c ON c.id = j.casino_id
        ORDER BY j.created_at DESC
        LIMIT 30
      `);
      const jackpots = result.rows;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Casino Jackpot Tracker USA | FindJackpots',
        url: 'https://findjackpots.com/casino-jackpot-tracker',
        description: 'Track casino jackpots across the USA with FindJackpots. See the latest slot machine winners, compare jackpot frequency by casino, and find where winners are hitting now.',
      };

      const jackpotItems = jackpots.map(j => `
        <li>
          <div class="jackpot-amount">${fmt$(j.amount_cents)}</div>
          <div class="jackpot-meta">
            <div class="machine">${j.machine_name || j.machine_type || 'Slot Machine'}</div>
            <div class="casino">
              <a href="/casino/${j.casino_id}/${slugify(j.casino_name)}">${j.casino_name}</a>
              · ${j.city || ''}, ${(j.state || '').trim()}
              ${j.won_at ? `· ${new Date(j.won_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </div>
          </div>
        </li>`).join('');

      const html = `${htmlHead({
        title: 'Casino Jackpot Tracker USA | FindJackpots',
        description: 'Track casino jackpots across the USA. See recent slot machine winners, compare jackpot frequency by casino, and find where big wins are happening right now. Free jackpot tracker.',
        canonical: 'https://findjackpots.com/casino-jackpot-tracker',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>🎯 Casino Jackpot Tracker USA</h1>
    <p>Real-time tracking of casino jackpots across hundreds of US casinos</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">
      <p>FindJackpots is America's most comprehensive casino jackpot tracker — a free tool that aggregates slot machine wins, progressive jackpot hits, and big payouts from hundreds of casinos across the country. Think of it as a flight tracker, but for casino jackpots.</p>
      <p>Here's how it works: We pull jackpot data from casino winner pages, social media accounts, and verified player reports. Every win gets tagged with the casino, machine name (when available), payout amount, and date. The result is a searchable, sortable database of jackpots that lets you see exactly where big wins are happening — and at which casinos they hit most frequently.</p>
      <p>Why does jackpot frequency matter? While slot machines are ultimately random, casinos with higher foot traffic and more machines in play naturally generate more jackpots. A busy casino with 2,000 machines will hit jackpots far more often than a small local property with 300 machines. Tracking frequency helps you understand which casinos are most active — and which machine types tend to produce the biggest wins.</p>
      <p>Progressive jackpots are particularly exciting to track. When a Megabucks or Wheel of Fortune progressive hasn't hit in months, the jackpot grows to a life-changing amount. Our tracker shows you which progressives are running high so you can decide if it's worth making the trip to play while the prize is elevated.</p>
      <p>The tracker is updated continuously as new wins are reported. Below you'll find the most recently tracked jackpots, showing the latest wins across our network of casinos. For a personalized experience — including jackpot alerts for specific casinos — use the FindJackpots app at findjackpots.com.</p>
    </div>
  </div>

  ${adSlot()}

  <div class="section">
    <h2>Recently Tracked Jackpots</h2>
    <ul class="jackpot-list">${jackpotItems}</ul>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🔔 Set Jackpot Alerts</h3>
    <p>Get notified when a big jackpot hits at your favorite casino. Set up free push notifications on FindJackpots.</p>
    <a class="cta-btn" href="https://findjackpots.com">Set Up Jackpot Alerts →</a>
  </div>

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(null)}
    ${otherStatesHtml(null)}
    <p style="margin-top:16px;"><a href="/biggest-jackpots">→ View the Biggest Jackpots of All Time</a></p>
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('/casino-jackpot-tracker error:', err.message);
      res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
  });

  // /highest-payout-casinos
  app.get('/highest-payout-casinos', async (req, res) => {
    try {
      // Get casinos with revenue data as a proxy for "high activity" (NV has payback data)
      const result = await pool.query(`
        SELECT c.id, c.name, c.slug, c.city, c.state,
               c.monthly_revenue_cents, c.revenue_report_month,
               c.has_hotel, c.has_poker, c.has_slots, c.free_parking,
               c.loyalty_program_name, r.rating, r.review_count
        FROM casinos c
        LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
        WHERE c.monthly_revenue_cents IS NOT NULL AND c.monthly_revenue_cents > 0
        ORDER BY c.monthly_revenue_cents DESC
        LIMIT 40
      `);
      const casinosWithRevenue = result.rows;

      // Also get highly rated casinos if payback data is sparse
      const topRated = await pool.query(`
        SELECT c.id, c.name, c.slug, c.city, c.state,
               c.has_hotel, c.has_poker, c.has_slots, c.free_parking,
               c.loyalty_program_name, r.rating, r.review_count
        FROM casinos c
        LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
        WHERE r.rating >= 4.2 AND r.review_count >= 50
        ORDER BY r.rating DESC, r.review_count DESC
        LIMIT 25
      `);

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Highest Payout Casinos in the USA | FindJackpots',
        url: 'https://findjackpots.com/highest-payout-casinos',
        description: 'Find the highest payout casinos in the USA. Compare slot payback percentages, jackpot frequency, and revenue data to find the casinos that pay out the most.',
      };

      const revenueRows = casinosWithRevenue.slice(0, 30).map(c => `
        <tr>
          <td class="casino-name">
            <a href="/casino/${c.id}/${slugify(c.name)}">${c.name}</a>
            <div class="casino-city">${c.city || ''}, ${(c.state || '').trim()}</div>
          </td>
          <td style="font-weight:600;color:#5c7aaa;">${fmt$(c.monthly_revenue_cents)}/mo</td>
          <td>${scoreBadgeHtml(c.rating)}</td>
          <td>${amenityBadges(c)}</td>
        </tr>`).join('');

      const topRatedRows = topRated.rows.map(c => `
        <tr>
          <td class="casino-name">
            <a href="/casino/${c.id}/${slugify(c.name)}">${c.name}</a>
            <div class="casino-city">${c.city || ''}, ${(c.state || '').trim()}</div>
          </td>
          <td>${scoreBadgeHtml(c.rating)}${c.review_count ? ` <span style="color:#888;font-size:0.8rem;">(${c.review_count})</span>` : ''}</td>
          <td>${amenityBadges(c)}</td>
        </tr>`).join('');

      const html = `${htmlHead({
        title: 'Highest Payout Casinos in the USA | FindJackpots',
        description: 'Find the highest payout casinos in the USA. Compare slot payback percentages, gaming revenue data, and jackpot frequency to find casinos that pay out the most.',
        canonical: 'https://findjackpots.com/highest-payout-casinos',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>💰 Highest Payout Casinos in the USA</h1>
    <p>Compare gaming revenue, payback data, and jackpot frequency to find the best-paying casinos</p>
  </div>
</div>

<div class="container">

  <div class="section">
    <div class="intro-text">
      <p>Every slots player wants to know: which casino pays out the most? The answer is more complex than a single number, but there are several meaningful ways to evaluate a casino's payout performance — and FindJackpots aggregates the data to help you make an informed choice.</p>
      <p><strong>Slot payback percentage</strong> is the most direct measure. Nevada requires all casinos to report slot payback by denomination — penny slots typically return 88–92%, quarter slots 91–94%, dollar slots 95–97%, and $5+ denominations can approach 99%. These percentages represent the long-run theoretical return, not what you'll win on any given visit, but they're the clearest benchmark available.</p>
      <p><strong>Gaming revenue</strong> is a proxy for casino activity and scale. A casino generating $50 million monthly in adjusted gross revenue has far more machine activity than one generating $5 million — which means more jackpots hit per day. More action means more opportunities to win, especially on progressive jackpots that grow with play volume.</p>
      <p><strong>Jackpot frequency</strong> — tracked by FindJackpots — shows you which casinos are actively reporting wins. Casinos that publish win reports on their websites, social media, and press releases tend to be the busiest and most player-friendly. We track all of this data to give you a complete picture.</p>
      <p>The casinos below are ranked by gaming revenue (where available) and player ratings — a combination that reflects both scale and quality. Higher-revenue casinos tend to have the most activity, the biggest progressive jackpots, and the most competitive player programs. Use FindJackpots to dig deeper into any individual casino's jackpot history and loyalty program.</p>
    </div>
  </div>

  ${adSlot()}

  ${casinosWithRevenue.length > 0 ? `
  <div class="section">
    <h2>Highest Revenue Casinos (by Monthly Gaming Revenue)</h2>
    <p style="color:#666;font-size:0.9rem;margin-bottom:16px;">Monthly adjusted gross revenue from state gaming commission reports. Higher revenue = more machines in play = more jackpots.</p>
    <div style="overflow-x:auto;">
      <table class="casino-table">
        <thead>
          <tr>
            <th>Casino</th>
            <th>Monthly Revenue</th>
            <th>Rating</th>
            <th>Amenities</th>
          </tr>
        </thead>
        <tbody>${revenueRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <div class="section">
    <h2>Top-Rated Casinos by Player Reviews</h2>
    <div style="overflow-x:auto;">
      <table class="casino-table">
        <thead>
          <tr>
            <th>Casino</th>
            <th>Player Rating</th>
            <th>Amenities</th>
          </tr>
        </thead>
        <tbody>${topRatedRows}</tbody>
      </table>
    </div>
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>📊 Compare Casinos Side by Side</h3>
    <p>Use FindJackpots to compare any two casinos on jackpots, payouts, loyalty programs, and amenities — all in one free tool.</p>
    <a class="cta-btn" href="https://findjackpots.com">Compare Casinos →</a>
  </div>

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(null)}
    ${otherStatesHtml(null)}
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('/highest-payout-casinos error:', err.message);
      res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
    }
  });

  // ══════════════════════════════════════════════════════════════
  // TASK 3: Individual Casino Pages
  // ══════════════════════════════════════════════════════════════

  app.get('/casino/:id/:slug', async (req, res) => {
    try {
      const { id } = req.params;
      const casinoId = parseInt(id);
      if (isNaN(casinoId)) return res.status(404).send('<h1>Casino not found</h1>');

      // Main casino data
      const casinoResult = await pool.query(`
        SELECT c.id, c.name, c.slug, c.chain, c.city, c.state, c.address, c.phone, c.website,
               c.lat, c.lng,
               c.has_hotel, c.has_poker, c.has_sportsbook, c.has_bingo, c.has_slots, c.free_parking,
               c.loyalty_program_name, c.loyalty_tiers, c.loyalty_benefits,
               c.loyalty_website, c.loyalty_points_per_dollar,
               c.monthly_revenue_cents, c.revenue_report_month,
               r.rating, r.review_count
        FROM casinos c
        LEFT JOIN reviews r ON r.casino_id = c.id AND r.source = 'yelp'
        WHERE c.id = $1
      `, [casinoId]);

      if (casinoResult.rows.length === 0) {
        return res.status(404).send('<h1>Casino not found</h1>');
      }
      const c = casinoResult.rows[0];
      const casinoSlug = slugify(c.name);
      const stateName = STATE_INFO[c.state?.trim()]?.name || c.state?.trim() || '';
      const stateSlug = STATE_INFO[c.state?.trim()]?.slug || (c.state?.trim() || '').toLowerCase();

      // Jackpots
      const jackpotsResult = await pool.query(`
        SELECT amount_cents, machine_name, machine_type, won_at, created_at
        FROM jackpots WHERE casino_id = $1
        ORDER BY amount_cents DESC LIMIT 10
      `, [casinoId]);
      const jackpots = jackpotsResult.rows;

      // Restaurants
      let restaurants = [];
      try {
        const restResult = await pool.query(`
          SELECT name, cuisine, category, rating, review_count, price_range, yelp_url
          FROM restaurants
          WHERE casino_id = $1 AND name != '__no_restaurants__'
          ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST
          LIMIT 8
        `, [casinoId]);
        restaurants = restResult.rows;
      } catch (e) { /* restaurants table may not exist */ }

      // Nearby casinos (closest by lat/lng)
      let nearby = [];
      if (c.lat && c.lng) {
        try {
          const nearbyResult = await pool.query(`
            SELECT id, name, city, state, lat, lng,
                   (3959 * acos(GREATEST(-1.0, LEAST(1.0,
                     cos(radians($1)) * cos(radians(lat)) *
                     cos(radians(lng) - radians($2)) +
                     sin(radians($1)) * sin(radians(lat))
                   )))) AS dist_miles
            FROM casinos
            WHERE id != $3 AND lat IS NOT NULL AND lng IS NOT NULL
            ORDER BY dist_miles ASC
            LIMIT 3
          `, [c.lat, c.lng, casinoId]);
          nearby = nearbyResult.rows;
        } catch (e) { /* geo query failed */ }
      }

      // JSON-LD LocalBusiness
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Casino',
        name: c.name,
        url: `https://findjackpots.com/casino/${c.id}/${casinoSlug}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: c.address || '',
          addressLocality: c.city || '',
          addressRegion: (c.state || '').trim(),
          addressCountry: 'US',
        },
        ...(c.phone ? { telephone: c.phone } : {}),
        ...(c.website ? { sameAs: c.website } : {}),
        ...(c.lat && c.lng ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } } : {}),
        ...(c.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: c.rating, reviewCount: c.review_count || 1 } } : {}),
      };

      // Build FAQ
      const faqs = [];
      faqs.push({ q: `Where is ${c.name} located?`, a: `${c.name} is located at ${c.address || c.city + ', ' + (c.state || '').trim()}.` });
      if (c.has_hotel !== null) faqs.push({ q: `Does ${c.name} have a hotel?`, a: c.has_hotel ? `Yes, ${c.name} offers on-site hotel accommodations.` : `${c.name} does not have an on-site hotel, but there are accommodations nearby.` });
      if (c.loyalty_program_name) faqs.push({ q: `What is ${c.name}'s loyalty program?`, a: `${c.name} offers the ${c.loyalty_program_name} loyalty program${c.loyalty_points_per_dollar ? `, earning ${c.loyalty_points_per_dollar} points per dollar played` : ''}.` });
      if (c.has_poker !== null) faqs.push({ q: `Does ${c.name} have a poker room?`, a: c.has_poker ? `Yes, ${c.name} has a dedicated poker room.` : `${c.name} does not currently have a dedicated poker room.` });
      faqs.push({ q: `What are the biggest jackpots at ${c.name}?`, a: jackpots.length > 0 ? `The largest tracked jackpot at ${c.name} was ${fmt$(jackpots[0].amount_cents)} on ${jackpots[0].machine_name || 'a slot machine'}. FindJackpots tracks all reported jackpots in real time.` : `FindJackpots is actively tracking jackpots at ${c.name}. Check back for updates.` });

      const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      };

      // Render
      const html = `${htmlHead({
        title: `${c.name} — Jackpots, Payouts & Reviews | FindJackpots`,
        description: `${c.name} in ${c.city || ''}, ${(c.state || '').trim()}. See recent jackpots, slot payouts, amenities, dining options, and loyalty program details at ${c.name}.`,
        canonical: `https://findjackpots.com/casino/${c.id}/${casinoSlug}`,
        ogType: 'place',
      })}
<body>
${siteHeader()}

<div class="page-hero">
  <div class="container">
    <h1>${c.name}</h1>
    <p>${c.city || ''}${c.city && c.state ? ', ' : ''}${STATE_LINKS.find(s => s.slug === stateSlug) ? `<a href="/casinos/${stateSlug}" style="color:rgba(255,255,255,0.9);text-decoration:underline;">${stateName}</a>` : (c.state || '').trim()}${c.chain ? ` · ${c.chain}` : ''}</p>
  </div>
</div>

<div class="container">

  <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:24px 0 0;">
    ${c.rating ? `<div>${scoreBadgeHtml(c.rating)} <span style="color:#666;font-size:0.9rem;">${c.review_count || 0} reviews</span></div>` : ''}
    ${c.state?.trim() && STATE_LINKS.find(s => s.slug === stateSlug) ? `<a href="/casinos/${stateSlug}" style="font-size:0.9rem;">← All ${stateName} Casinos</a>` : ''}
    <a href="https://findjackpots.com" class="cta-btn" style="padding:8px 18px;font-size:0.9rem;">Open in App →</a>
  </div>

  <div class="section">
    <h2>Overview</h2>
    <div class="casino-overview">
      ${c.address ? `<div class="overview-card"><div class="label">Address</div><div class="value">${c.address}</div></div>` : ''}
      ${c.phone ? `<div class="overview-card"><div class="label">Phone</div><div class="value"><a href="tel:${c.phone}">${c.phone}</a></div></div>` : ''}
      ${c.website ? `<div class="overview-card"><div class="label">Website</div><div class="value"><a href="${c.website}" target="_blank" rel="noopener">Visit Website ↗</a></div></div>` : ''}
      ${c.loyalty_program_name ? `<div class="overview-card"><div class="label">Loyalty Program</div><div class="value">${c.loyalty_program_name}${c.loyalty_points_per_dollar ? `<br><span style="font-size:0.85rem;color:#666;">${c.loyalty_points_per_dollar} pts/$</span>` : ''}</div></div>` : ''}
      ${c.monthly_revenue_cents ? `<div class="overview-card"><div class="label">Monthly Gaming Revenue</div><div class="value">${fmt$(c.monthly_revenue_cents)}</div></div>` : ''}
    </div>
    <div style="margin-top:16px;">
      <strong>Amenities:</strong> ${amenityBadges(c) || '<span style="color:#888;">Not specified</span>'}
    </div>
    ${c.rating ? `
    <div style="margin-top:16px;padding:16px;background:#f9fbff;border-radius:8px;border-left:3px solid #5c7aaa;">
      <strong>FindJackpots Score:</strong> ${scoreBadgeHtml(c.rating)} — ${scoreLabel(c.rating, c.review_count) || 'Rated'}
      based on ${c.review_count || 0} verified player reviews. Ratings reflect overall casino experience including floor quality, service, and atmosphere.
    </div>` : ''}
  </div>

  ${adSlot()}

  <div class="section">
    <h2>🏆 Recent Jackpots at ${c.name}</h2>
    ${jackpots.length > 0 ? `<ul class="jackpot-list">
      ${jackpots.map(j => `
        <li>
          <div class="jackpot-amount">${fmt$(j.amount_cents)}</div>
          <div class="jackpot-meta">
            <div class="machine">${j.machine_name || j.machine_type || 'Slot Machine'}</div>
            <div class="casino">${j.won_at ? new Date(j.won_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date not recorded'}</div>
          </div>
        </li>`).join('')}
    </ul>` : `<p style="color:#888;">No jackpots recorded yet for ${c.name}. FindJackpots tracks wins as they're reported.</p>`}
  </div>

  ${restaurants.length > 0 ? `
  <div class="section">
    <h2>🍽️ Dining at ${c.name}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:12px;">
      ${restaurants.map(r => `
        <div style="border:1px solid #dde6f0;border-radius:8px;padding:14px;background:#fff;">
          <div style="font-weight:600;margin-bottom:4px;">${r.name}</div>
          <div style="color:#888;font-size:0.82rem;margin-bottom:6px;">${r.category || r.cuisine || ''} ${r.price_range ? `· ${r.price_range}` : ''}</div>
          ${r.rating ? `<div style="color:#f2c94c;font-size:0.9rem;">★ ${parseFloat(r.rating).toFixed(1)} <span style="color:#888;">(${r.review_count || 0})</span></div>` : ''}
          ${r.yelp_url ? `<a href="${r.yelp_url}" target="_blank" rel="noopener" style="font-size:0.82rem;display:inline-block;margin-top:6px;">View on Yelp ↗</a>` : ''}
        </div>`).join('')}
    </div>
  </div>` : ''}

  ${nearby.length > 0 ? `
  <div class="section">
    <h2>📍 Compare Nearby Casinos</h2>
    <div class="nearby-grid">
      ${nearby.map(n => `
        <div class="nearby-card">
          <h4><a href="/casino/${n.id}/${slugify(n.name)}">${n.name}</a></h4>
          <div class="location">${n.city || ''}, ${(n.state || '').trim()} · ${Math.round(parseFloat(n.dist_miles))} mi away</div>
          <a href="/casino/${n.id}/${slugify(n.name)}" style="font-size:0.85rem;">View details →</a>
        </div>`).join('')}
    </div>
  </div>` : ''}

  ${adSlot()}

  <div class="section">
    <h2>Frequently Asked Questions</h2>
    <dl>
      ${faqs.map(f => `
        <div class="faq-item">
          <dt>${f.q}</dt>
          <dd>${f.a}</dd>
        </div>`).join('')}
    </dl>
  </div>

  <div class="cta-box">
    <h3>🎰 Track ${c.name} Jackpots in Real Time</h3>
    <p>Open FindJackpots for live jackpot tracking, casino comparisons, and personalized alerts.</p>
    <a class="cta-btn gold" href="https://findjackpots.com">Open FindJackpots →</a>
  </div>

  ${STATE_LINKS.find(s => s.slug === stateSlug) ? `
  <div class="section">
    <p>← <a href="/casinos/${stateSlug}">All ${stateName} Casinos</a> &nbsp;|&nbsp; <a href="/best-midwest-casinos">Best Midwest Casinos</a> &nbsp;|&nbsp; <a href="/biggest-jackpots">Biggest Jackpots</a> &nbsp;|&nbsp; <a href="/casino-jackpot-tracker">Jackpot Tracker</a></p>
  </div>
  <div style="margin:0 0 40px;padding:20px 24px;background:#f4f7fb;border-radius:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
    <span style="color:#1e3a5f;font-weight:600;">More ${stateName} Casinos</span>
    <a href="/casinos/${stateSlug}" style="background:#5c7aaa;color:white;padding:8px 20px;border-radius:20px;text-decoration:none;font-size:14px;font-weight:600;">Browse ${stateName} Casinos →</a>
  </div>` : ''}

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
<script type="application/ld+json">${JSON.stringify(faqJsonLd, null, 2)}</script>
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error(`/casino/:id/:slug error:`, err.message);
      res.status(500).send('<h1>Server Error</h1><p>' + err.message + '</p>');
    }
  });

};
