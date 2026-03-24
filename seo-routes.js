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
    intro: `<p>Minnesota is home to a thriving tribal casino scene, with more than 20 casinos spread across the state — from the Twin Cities metro area to the Northwoods and Iron Range. Unlike many states, Minnesota's casinos are exclusively operated by Native American tribes under compacts with the state government, which means gambling revenue stays largely within tribal communities and funds education, healthcare, and infrastructure.</p>
<p>The most popular casinos in Minnesota include Mystic Lake Casino Hotel near Prior Lake, which is the largest casino in the Upper Midwest, and Grand Casino Mille Lacs and Grand Casino Hinckley — both beloved destinations for day trips and weekend getaways. Treasure Island Resort & Casino, nestled along the Mississippi River south of the Twin Cities, offers one of the most scenic settings in the Midwest.</p>
<p>Minnesota casinos typically feature thousands of slot machines, video poker, bingo, and pull-tabs. Poker rooms are popular, with Mystic Lake in particular hosting major tournaments. Most large Minnesota casinos have on-site hotels, spas, entertainment venues, and multiple dining options ranging from casual buffets to upscale steakhouses.</p>
<p>Whether you're a Minnesota local looking for a weekend escape or a visitor from out of state, the state's casinos offer plenty of variety. Jackpots in Minnesota are reported frequently — with slot wins ranging from a few thousand dollars to over $1 million on progressive machines. Use FindJackpots to track recent wins, compare loyalty programs, and find the casino that best fits your style.</p>`,
  },
  NV: {
    name: 'Nevada',
    slug: 'nevada',
    intro: `<p>Nevada is the undisputed capital of American casino gambling — home to Las Vegas, Reno, Laughlin, and dozens of smaller casino towns scattered across the desert. With a legacy stretching back to 1931 when Nevada became the first state to legalize commercial gambling, the Silver State has had nearly a century to perfect the art of the casino experience.</p>
<p>Las Vegas alone hosts hundreds of casinos, ranging from the mega-resorts on the Strip — Bellagio, Caesars Palace, MGM Grand, The Venetian — to locals-focused properties in Henderson, Summerlin, and North Las Vegas. Reno, known as "The Biggest Little City in the World," offers its own vibrant casino scene with properties like the Peppermill and Grand Sierra Resort.</p>
<p>Nevada casinos are renowned for some of the best slot payback percentages in the country — the Nevada Gaming Control Board requires casinos to publicly report payout data by denomination. This transparency makes Nevada one of the best states for serious slot players. Penny slots typically return 88–92%, while dollar slots often pay back 95% or more.</p>
<p>From the glittering Strip to the laid-back locals casinos, Nevada offers every kind of gambling experience imaginable. Massive progressive jackpots — including Megabucks, which has produced some of the largest slot wins in history — are a regular feature across Las Vegas properties. FindJackpots tracks the biggest recent wins so you can find where the hot machines are right now.</p>`,
  },
  IA: {
    name: 'Iowa',
    slug: 'iowa',
    intro: `<p>Iowa was a pioneer in Midwest casino gambling, launching riverboat casinos along the Mississippi and Missouri rivers in the early 1990s. Today the state boasts more than 20 licensed casinos — a mix of tribal operations, commercial riverboats, and land-based facilities — making it one of the most casino-dense Midwestern states per capita.</p>
<p>Iowa's casino landscape spans the state from the Quad Cities on the east to Council Bluffs on the west, just across the Missouri River from Omaha. Highlights include Rhythm City Casino Resort in Davenport, Harrah's Council Bluffs (one of the largest in the state), and Meskwaki Bingo Casino Hotel, an Iowa tribal casino near Tama that consistently ranks among the state's best.</p>
<p>Iowa casinos feature slots, video poker, table games including blackjack, craps, roulette, and poker rooms. The Iowa Racing and Gaming Commission regulates all casinos and publishes monthly revenue data — useful for gauging which properties are paying out the most. Most major Iowa casinos have hotels, multiple restaurants, and event centers.</p>
<p>Iowa's central location makes it an easy drive from Minnesota, Illinois, Wisconsin, and Nebraska, drawing regional visitors year-round. Jackpot activity is steady, particularly at tribal casinos like Meskwaki. FindJackpots aggregates Iowa jackpot reports so you can track recent wins and plan your next visit accordingly.</p>`,
  },
  WI: {
    name: 'Wisconsin',
    slug: 'wisconsin',
    intro: `<p>Wisconsin's casino industry is built entirely on tribal gaming, with 11 federally recognized tribes operating more than 25 casinos across the state. From the shores of Lake Superior in the north to the Chicago suburbs at the southern border, Wisconsin offers a diverse and well-distributed casino landscape that draws millions of visitors each year.</p>
<p>The largest and most well-known Wisconsin casino is Potawatomi Hotel & Casino in Milwaukee — a massive urban destination casino with 3,000 slot machines, a full complement of table games, a poker room, multiple restaurants, and a hotel. Ho-Chunk Gaming Wisconsin Dells is another standout, combining casino thrills with proximity to the state's top tourist destination. Up north, casinos like Lake of the Torches in Lac du Flambeau and St. Croix Casino in Turtle Lake draw visitors to the Wisconsin Northwoods.</p>
<p>Wisconsin tribes offer generous players club programs, with many casinos offering free play, drawings, and point multiplier days to reward regular visitors. Slot payouts at Wisconsin tribal casinos are not publicly disclosed (tribal casinos are exempt from state reporting requirements), but players consistently report solid return rates — particularly on dollar slots and video poker.</p>
<p>Whether you're in Milwaukee, Green Bay, Madison, or the Wisconsin Northwoods, there's likely a tribal casino within a short drive. Use FindJackpots to compare Wisconsin casinos by amenities, loyalty programs, and recent jackpot activity.</p>`,
  },
  IL: {
    name: 'Illinois',
    slug: 'illinois',
    intro: `<p>Illinois has a robust commercial casino industry regulated by the Illinois Gaming Board, with casinos operating in riverboat and land-based formats throughout the state. The Chicago area alone has several major casinos within easy driving distance, including Hollywood Casino Aurora, Rivers Casino in Des Plaines, and Grand Victoria Casino in Elgin — making Chicagoland one of the most casino-rich metropolitan areas in the country.</p>
<p>Illinois casinos are notable for their transparency: the Gaming Board publishes detailed monthly reports including adjusted gross revenue, game counts, and historical trends by property. This data makes Illinois one of the best-documented casino markets in the Midwest. Rivers Casino in Des Plaines is consistently one of the highest-grossing casinos in the United States, regularly generating over $50 million in monthly gaming revenue.</p>
<p>The state expanded gaming significantly with legislation in recent years, authorizing new casino licenses including a Chicago city casino, sports betting, and additional positions at existing properties. This expansion means Illinois' casino landscape is actively growing and improving for players.</p>
<p>Illinois casinos feature the full range of games: slots, video poker, blackjack, craps, roulette, and poker. The proximity to Chicago's population of nearly 3 million means weekends can be busy, so it's worth checking current jackpot activity and plan accordingly. FindJackpots tracks recent Illinois casino wins so you can time your visit when the machines are hot.</p>`,
  },
  MI: {
    name: 'Michigan',
    slug: 'michigan',
    intro: `<p>Michigan offers a uniquely dual casino landscape: three world-class commercial casinos in downtown Detroit (MGM Grand Detroit, MotorCity Casino Hotel, and Greektown Casino-Hotel), plus more than 20 tribal casinos operated by 12 Native American tribes spread across the Upper Peninsula and Lower Michigan. Together they form one of the most diverse casino markets in the Midwest.</p>
<p>The Detroit commercial casinos are major destination resorts, featuring thousands of slot machines, extensive table game floors, high-limit rooms, multiple restaurants, hotel accommodations, and entertainment venues. The Michigan Gaming Control Board regulates commercial casinos and requires monthly revenue reporting, giving players useful transparency into each property's performance.</p>
<p>Michigan's tribal casinos range from the resort-scale Soaring Eagle Casino & Resort near Mount Pleasant (one of the largest in the Midwest) to smaller neighborhood casinos in the Upper Peninsula. Kewadin Casinos operates five locations in the UP, while Gun Lake Casino near Wayland and FireKeepers Casino Hotel near Battle Creek are popular destination casinos in Lower Michigan.</p>
<p>Michigan also launched online casino gaming and sports betting in 2021, making it one of the most progressive gambling states in the country. BetMGM, DraftKings, FanDuel, and a dozen other operators are licensed, meaning Michigan players have plenty of options both in-person and online. FindJackpots covers Michigan's brick-and-mortar casino scene so you can compare jackpots, amenities, and loyalty programs before you visit.</p>`,
  },
  IN: {
    name: 'Indiana',
    slug: 'indiana',
    intro: `<p>Indiana's casino industry is one of the most significant in the Midwest, with more than a dozen licensed commercial casinos generating billions in annual gaming revenue. The state was an early adopter of riverboat gambling in the 1990s, and today its casinos have largely transitioned to land-based or dockside facilities, offering a full resort experience rather than the original cruise-style gambling.</p>
<p>Indiana's casino geography is strategic: properties in Hammond, East Chicago, and Michigan City serve the massive Chicago-area market, while casinos in Rising Sun, Elizabeth, Evansville, and Gary serve local markets and cross-border visitors from Ohio and Kentucky. Horseshoe Hammond is one of the largest riverboat casinos in the country by revenue, regularly posting over $50 million in monthly adjusted gross revenue.</p>
<p>The Indiana Gaming Commission requires detailed monthly reporting from all licensed casinos, making Indiana one of the most transparent casino markets in the country. This data shows which properties are performing well and can give players insight into which casinos are attracting the most action. Hard Rock Casino Northern Indiana in Gary opened in 2021 and has quickly become one of the state's top performers.</p>
<p>Indiana casinos feature slots, table games, poker rooms, sports betting, and — at the larger properties — hotels, multiple restaurants, and entertainment venues. Jackpot wins are frequently reported from Indiana's busy casino floors. FindJackpots tracks recent wins across all Indiana casinos so you can find where winners are hitting right now.</p>`,
  },
  OH: {
    name: 'Ohio',
    slug: 'ohio',
    intro: `<p>Ohio transformed its gambling landscape in 2012 with the opening of four commercial casinos in Cleveland, Columbus, Cincinnati, and Toledo — followed by the launch of numerous racinos (race tracks with video lottery terminals) across the state. Today Ohio is a major casino market with more than a dozen gaming facilities, all regulated by the Ohio Casino Control Commission.</p>
<p>The four original Ohio casinos — JACK Cleveland Casino, Hollywood Casino Columbus, JACK Cincinnati Casino, and Hollywood Casino Toledo — are full-scale gaming resorts with thousands of slot machines, complete table game floors including poker rooms, and extensive dining and entertainment options. Each is located in a major urban center, making Ohio casino gaming highly accessible to the state's 11 million residents.</p>
<p>Ohio racinos — facilities at horse racing tracks that offer video lottery terminals — add another dimension to the state's gaming scene. MGM Northfield Park, Hard Rock Rocksino Northfield Park, and JACK Thistledown Racino are among the most popular. While technically VLTs rather than Class III slot machines, these machines offer comparable entertainment and jackpot opportunities.</p>
<p>Ohio legalized sports betting in 2023, adding another reason for sports fans to visit casinos that have integrated sportsbook operations. The state's gaming industry continues to grow and evolve, with regular updates to licensing and operations. FindJackpots tracks jackpot wins from Ohio's commercial casinos and racinos so you can see where the biggest payouts are happening.</p>`,
  },
  MO: {
    name: 'Missouri',
    slug: 'missouri',
    intro: `<p>Missouri is a well-established casino state with 13 licensed commercial casinos distributed across the state, regulated by the Missouri Gaming Commission. Missouri legalized riverboat gambling in 1993, and while the original requirement that casinos float on water was later relaxed, the term "riverboat casino" remains part of Missouri's gaming identity — most properties are located along the Missouri and Mississippi rivers.</p>
<p>Missouri's biggest casino markets are in the Kansas City metro area, where Ameristar Casino Resort Spa, Hollywood Casino Kansas City, and Argosy Casino Alton operate; and the St. Louis area, home to Lumière Place Casino, River City Casino, and Harrah's St. Louis. These properties range from modest gaming halls to full resort destinations with hotels, spas, multiple restaurants, and concert venues.</p>
<p>The Missouri Gaming Commission publishes detailed monthly financial reports for each licensed casino, giving players and analysts insight into revenue trends and performance by property. This transparency is valuable for understanding which casinos are the most popular and potentially where machines are paying out the most.</p>
<p>Missouri casinos offer the full complement of games including slots, video poker, blackjack, craps, roulette, and poker. Many properties run regular promotions including drawings, free play offers, and progressive jackpot tournaments. FindJackpots monitors jackpot activity across all Missouri casinos so you always know where the latest big wins are happening.</p>`,
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

        // JSON-LD
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
  </div>

  ${adSlot()}

  <div class="cta-box">
    <h3>🎰 See Live Jackpots &amp; Casino Map</h3>
    <p>Use FindJackpots to explore the full interactive map, set jackpot alerts, and compare casinos side-by-side.</p>
    <a class="cta-btn" href="https://findjackpots.com">Open FindJackpots App →</a>
  </div>

  <div class="section">
    <h2>Browse Casinos by State</h2>
    ${stateNavHtml(stateSlug)}
    <p style="margin-top:16px;color:#666;font-size:0.9rem;">
      Also explore: <a href="/biggest-jackpots">Biggest Jackpots Right Now</a> ·
      <a href="/best-midwest-casinos">Best Midwest Casinos</a> ·
      <a href="/casino-jackpot-tracker">Jackpot Tracker</a>
    </p>
  </div>

</div>

<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>

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
    <h2>Browse by State</h2>
    ${stateNavHtml(null)}
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
    <p>${c.city || ''}${c.city && c.state ? ', ' : ''}${(c.state || '').trim()}${c.chain ? ` · ${c.chain}` : ''}</p>
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
    <p>← <a href="/casinos/${stateSlug}">All ${stateName} Casinos</a> &nbsp;|&nbsp; <a href="/best-midwest-casinos">Best Midwest Casinos</a> &nbsp;|&nbsp; <a href="/biggest-jackpots">Biggest Jackpots</a></p>
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
