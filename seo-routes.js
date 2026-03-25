/**
 * seo-routes.js — Server-side rendered SEO landing pages for FindJackpots
 *
 * Registers all SEO routes on the given Express app.
 * Call: require('./seo-routes')(app, pool)
 */

'use strict';

// ─── Casino Content Overrides ──────────────────────────────────────────────
// Rich, hand-crafted content for select casino pages.
// Keys are casino IDs (integers). Each entry replaces the generic overview
// description section with a detailed, engaging writeup.

const CASINO_OVERRIDES = {

  // ── El Cortez Hotel & Casino (Las Vegas, NV) ──────────────────────────
  31: {
    tagline: 'The Soul of Downtown Las Vegas Since 1941',
    hero_blurb: `El Cortez Hotel & Casino isn't just old — it's <em>legendary</em>. Opened in 1941, it holds the distinction of being the oldest continuously operating hotel and casino in Las Vegas, a city that routinely demolishes its history. While the Strip reinvented itself a dozen times over, El Cortez held its ground on Fremont Street, staying true to what made Vegas great before neon went corporate.`,
    sections: [
      {
        heading: 'History & Heritage',
        body: `<p>El Cortez opened its doors on November 7, 1941 — just one month before the attack on Pearl Harbor thrust America into World War II. It has never closed since. That's over 80 years of uninterrupted operation, a record no other hotel-casino in Las Vegas can claim.</p>
<p>The property has deep ties to Las Vegas lore. In 1945, Bugsy Siegel and a group of partners briefly owned El Cortez before flipping it to finance what would become the Flamingo. The original neon sign, installed in 1952, still glows above Fremont Street — one of the last surviving examples of vintage Vegas signage in active use. On February 22, 2013, El Cortez became the <strong>only casino in Nevada listed on the National Register of Historic Places</strong>, cementing its status as a genuine American landmark.</p>
<p>Remarkably, El Cortez is also the <strong>last major family-run casino in Las Vegas</strong>. While every other major property has been absorbed by MGM, Caesars, or some Wall Street-backed REIT, El Cortez remains independently owned and operated. That independence shows in everything from the player-friendly rules at the tables to the staff who've worked there for decades.</p>`
      },
      {
        heading: 'What Makes It Special',
        body: `<p>In a city engineered to extract maximum money from visitors, El Cortez is almost subversive. Table minimums start at $5 for most hours — a near-impossibility on the Strip. The blackjack games here are among the best in Las Vegas: <strong>single-deck games are available</strong>, 3:2 payouts are standard, and dealer rules favor the player more than anywhere on Fremont Street.</p>
<p>Because there's no corporate mandate pushing for higher margins, El Cortez can actually afford to treat players well. Regulars will tell you the staff knows their names, the drinks keep flowing, and the games are honest. It's the kind of casino where a $100 bankroll can stretch into an entire evening of genuine entertainment.</p>
<p>One detail that surprises first-timers: El Cortez is one of the <strong>last casinos in Vegas offering actual coin-operated slot machines</strong>. The satisfying clatter of coins hitting a metal tray is a sensory experience that's vanished almost everywhere else. If you've never heard it, you're missing a piece of Vegas history.</p>`
      },
      {
        heading: 'The Vibe',
        body: `<p>El Cortez sits at 600 E. Fremont Street, just a short walk from the Fremont Street Experience canopy. Its location puts you within easy reach of the best of downtown Las Vegas without the shoulder-to-shoulder tourist crush of the main canopy area.</p>
<p>Inside, the carpet is vintage, the lighting is warm, and the energy is relaxed and authentic. You'll find a mix of local grinders, savvy budget travelers, and casino history enthusiasts who came specifically <em>because</em> of the history. It's the anti-tourist-trap: unpretentious, honest, and genuinely fun.</p>
<p>Free parking is available, which — in downtown Las Vegas — is no small thing. Walk in, park for free, play at low-minimum tables, eat a good meal, and leave feeling like Vegas actually gave something back for once.</p>`
      },
      {
        heading: 'Club Cortez Loyalty Program',
        body: `<p>The <strong>Club Cortez</strong> loyalty program rewards every dollar you play. The program runs three tiers, with benefits that scale up as you earn more points. Points are redeemable for free play, dining credits, and discounted hotel stays. Birthday rewards add a bonus free-play offer during your birth month, and monthly promotions give regulars another reason to keep coming back.</p>
<p>Sign up at the players club desk — it's free, immediate, and worth doing before your first bet. Even casual visitors will rack up redeemable points during a single session at the tables or slots.</p>`
      },
      {
        heading: 'Dining',
        body: `<p><strong>Siegel's 1941</strong> is the main restaurant, a classic American diner named for the casino's brief Bugsy Siegel connection. It serves all-day breakfast, burgers, and comfort food staples at prices that feel like a time machine to a saner era. <strong>Hot Noods</strong> is a casual noodle bar with Asian-inspired dishes — a surprisingly good option for a quick, satisfying meal on the gaming floor. The <strong>Cortez Room</strong> bar anchors the casino with cold drinks and cocktails, while <strong>El Cortez Hot Dogs & Beer</strong> is exactly what it sounds like: a no-frills counter for a quick bite between sessions.</p>`
      },
      {
        heading: 'Poker Room',
        body: `<p>El Cortez runs a poker room with 8+ tables focused on low-to-mid stakes play. The staple game is $1/$2 No-Limit Hold'em, making it accessible for recreational players while still drawing experienced locals who appreciate the value. Regular tournaments give grinders something to chase. The room has a neighborhood poker club feel — competitive but not cutthroat, and far less intimidating than the big rooms on the Strip.</p>`
      },
    ],
    faqs: [
      {
        q: 'Is El Cortez casino worth visiting?',
        a: 'Absolutely — especially for visitors who want authentic Las Vegas rather than a theme park version of it. El Cortez is the oldest continuously operating hotel-casino in Vegas, the only one on the National Register of Historic Places, and one of the last family-run properties in the city. The table games offer some of the best player-friendly rules in town, minimums start at $5, and free parking means your money goes further. It\'s a genuine Vegas institution.'
      },
      {
        q: 'What is the Club Cortez loyalty program?',
        a: 'Club Cortez is El Cortez\'s three-tier rewards program. Members earn points on all slot and table play, which can be redeemed for free play, dining, and hotel discounts. The program includes birthday free-play rewards and monthly promotional offers. Sign-up is free at the players club desk and takes just a few minutes — worth doing before your first bet.'
      },
      {
        q: 'Does El Cortez have good blackjack?',
        a: 'El Cortez is widely considered one of the best blackjack destinations in Las Vegas for value players. Single-deck games are available, most games pay 3:2 on blackjack (not the 6:5 you\'ll find at Strip casinos), and table minimums are often as low as $5 during regular hours. Seasoned players seek it out specifically for these player-friendly conditions.'
      },
      {
        q: 'Is El Cortez on Fremont Street?',
        a: 'Yes — El Cortez is located at 600 E. Fremont Street in downtown Las Vegas, a short walk from the Fremont Street Experience canopy. Its location is walkable to all of downtown\'s major attractions while being slightly removed from the main tourist crush, which many visitors appreciate.'
      },
      {
        q: 'What restaurants are at El Cortez?',
        a: 'El Cortez has several dining options: Siegel\'s 1941 (a classic American diner with all-day breakfast and comfort food), Hot Noods (an Asian-inspired noodle bar), the Cortez Room bar for cocktails, and El Cortez Hot Dogs & Beer for quick, casual bites. Prices are refreshingly reasonable by Las Vegas standards.'
      },
    ],
  },

  // ── Mystic Lake Casino Hotel (Prior Lake, MN) ─────────────────────────
  448: {
    tagline: 'The Midwest\'s Premier Casino Destination',
    hero_blurb: `Mystic Lake Casino Hotel is the undisputed heavyweight of Upper Midwest gaming. With over 4,000 slot machines, a world-class poker room, major-name entertainment, and 600+ hotel rooms — all within 25 miles of downtown Minneapolis — it's not just the biggest casino in Minnesota. It's one of the most complete casino resorts in the entire country.`,
    sections: [
      {
        heading: 'Size & Scale',
        body: `<p>Numbers tell part of the story: <strong>4,000+ slot machines</strong>, hundreds of table games, a 22-table poker room, a full sportsbook, bingo hall, and a hotel tower with over 600 rooms. Mystic Lake is the largest casino in the Upper Midwest by virtually any measure, and the scale shows from the moment you walk in.</p>
<p>The casino floor is massive but well-organized, with clear sight lines, consistent signage, and enough variety that you can spend an entire day without repeating yourself. High-limit rooms offer stakes for serious players; low-denomination areas keep things accessible for casual visitors. The slot selection runs from classic three-reel games to the latest video slots and linked progressive machines with jackpots that regularly climb into six figures.</p>`
      },
      {
        heading: 'Location & Access',
        body: `<p>Mystic Lake sits in Prior Lake, Minnesota — <strong>about 25 miles southwest of Minneapolis</strong>, roughly a 35-minute drive from downtown depending on traffic. Free parking is plentiful, and the resort operates a <strong>free shuttle service from the Twin Cities</strong>, making it accessible without a car.</p>
<p>The drive itself is easy and pleasant, following Highway 169 southwest through the western suburbs and into the bluffs and lakes of Scott County. For Twin Cities residents, Mystic Lake is the obvious choice for a gaming night out — close enough to be spontaneous, large enough to always have something new happening.</p>`
      },
      {
        heading: 'Club M Loyalty Program',
        body: `<p>The <strong>Club M</strong> loyalty program is one of the most generous casino rewards programs in the Midwest, and regulars will tell you it's the main reason they keep coming back. The program operates on three tiers — Club M, Mysticash, and Diamond — with benefits that escalate significantly as you move up.</p>
<p>Members earn <strong>Mysticash</strong> on every dollar played on slots and table games. Points convert to free play, dining credits, hotel discounts, and merchandise. Higher tiers unlock priority access to concert tickets (a big deal given the caliber of acts that perform at Mystic Lake Center), exclusive promotions, and dedicated host services. Birthday free play is a standard perk across all tiers, and the calendar is packed with bonus-point events and promotional drawings throughout the year.</p>
<p>Pro tip: sign up for Club M before your first visit — you'll earn points from your very first dollar played and may qualify for a new member welcome offer.</p>`
      },
      {
        heading: 'Entertainment',
        body: `<p>Mystic Lake Center is one of the premier entertainment venues in Minnesota, hosting major national touring acts across genres — country, rock, R&B, comedy, and more. The venue's intimate size relative to other concert halls means you're never far from the stage, and the sound quality is excellent.</p>
<p>On any given weekend, Mystic Lake might have a sold-out country headliner in the main theater, a comedy night in a smaller room, and a DJ set in the bar — while the poker room is running a tournament and promotions drawings are happening on the floor. It's a full entertainment ecosystem, not just a place to pull slot handles.</p>`
      },
      {
        heading: 'Dining',
        body: `<p>The resort's dining lineup covers every mood and budget. <strong>Mystic Steakhouse</strong> anchors the fine-dining end with aged beef, seafood, and an extensive wine list — a genuine restaurant destination in its own right. <strong>Hop House</strong> doubles as a sports bar and entertainment venue with craft beer, pub fare, and live music. <strong>The Meadows</strong> handles casual everyday dining, <strong>Mystic Deli</strong> covers quick counter-service options, and the <strong>Center Bar</strong> and <strong>Stage Door Bar</strong> keep the drinks flowing near the entertainment venues.</p>`
      },
      {
        heading: 'Poker Room',
        body: `<p>Mystic Lake's poker room runs <strong>22 tables</strong> and is consistently ranked among the best poker rooms in Minnesota. Daily tournaments attract serious players from across the metro; cash games run from $2/$4 Limit up to $5/$10 No-Limit Hold'em. The room is professionally staffed and well-managed, with a competitive but welcoming atmosphere for players of all levels.</p>`
      },
      {
        heading: 'Jackpots & Slots',
        body: `<p>With the sheer volume of machines and linked progressive networks, Mystic Lake reports some of the biggest jackpots in Minnesota on a regular basis. <strong>Six-figure slot wins are not uncommon</strong>, and the progressive banks across the floor are always building. FindJackpots tracks reported jackpots in real time — check the jackpot feed above for the latest big wins.</p>`
      },
      {
        heading: 'Community Ownership',
        body: `<p>Mystic Lake is owned and operated by the <strong>Shakopee Mdewakanton Sioux Community (SMSC)</strong>. Casino revenues fund tribal member benefits including healthcare, education, and housing, and the SMSC is known for its extensive charitable giving to nonprofits across Minnesota. When you play at Mystic Lake, you're supporting a community institution with deep roots in the region.</p>`
      },
    ],
    faqs: [
      {
        q: 'Is Mystic Lake the biggest casino in Minnesota?',
        a: 'Yes — Mystic Lake Casino Hotel is the largest casino in Minnesota and the entire Upper Midwest. It features over 4,000 slot machines, hundreds of table games, a 22-table poker room, a full entertainment venue, and 600+ hotel rooms, making it one of the most complete casino resorts in the country.'
      },
      {
        q: 'How far is Mystic Lake from Minneapolis?',
        a: 'Mystic Lake Casino Hotel is located in Prior Lake, Minnesota, approximately 25 miles southwest of downtown Minneapolis — about a 35-minute drive. Free shuttle service is available from the Twin Cities for guests who prefer not to drive.'
      },
      {
        q: 'What is the Club M loyalty program at Mystic Lake?',
        a: 'Club M is Mystic Lake\'s loyalty program, offering three tiers: Club M, Mysticash, and Diamond. Members earn Mysticash points on every dollar played, redeemable for free play, dining, hotel stays, and merchandise. Benefits include birthday free play, concert ticket priority, hotel discounts, and bonus-point promotions. Sign-up is free and immediate benefits begin on your first visit.'
      },
      {
        q: 'Does Mystic Lake have a hotel?',
        a: 'Yes — Mystic Lake Casino Hotel has over 600 hotel rooms in its on-site tower. The hotel is connected directly to the casino and entertainment complex, making it easy to move between rooms, gaming, dining, and shows without going outside. Hotel packages are frequently available through Club M promotions.'
      },
      {
        q: 'What are the best slots at Mystic Lake?',
        a: 'Mystic Lake has over 4,000 slot machines ranging from classic three-reel games to modern video slots and progressive jackpot banks. The linked progressive machines on the main floor regularly build to six-figure jackpots. For the latest big wins and active jackpot feeds, check the FindJackpots tracker for Mystic Lake — updated in real time as jackpots are reported.'
      },
    ],
  },

  // ── Treasure Island Resort & Casino (Welch, MN) ───────────────────────
  461: {
    tagline: 'Minnesota\'s River Casino Escape',
    hero_blurb: `Treasure Island Resort & Casino offers something no other casino in Minnesota can: a genuine resort setting on the banks of the Mississippi River, tucked into the scenic bluffs of Goodhue County. It's a full weekend destination — river views, a spa, a golf course next door, live entertainment, and a casino floor that punches well above its weight. About an hour southeast of Minneapolis, it's close enough for a spontaneous getaway, scenic enough to feel like a real escape.`,
    sections: [
      {
        heading: 'Location & Setting',
        body: `<p>Treasure Island is located in Welch, Minnesota, <strong>approximately 60 miles southeast of Minneapolis and St. Paul</strong> — about an hour's drive following the Mississippi River corridor through some of the most beautiful scenery in the state. The bluffs of Goodhue County frame the property, and the river itself is visible from much of the resort.</p>
<p>That setting is Treasure Island's signature advantage over every other casino in Minnesota. While most MN casinos are planted in flat suburban or rural landscapes, TI has genuine natural beauty working in its favor. The drive down Highway 61 along the Mississippi is part of the experience — a scenic warmup to a weekend that never feels like just a "casino trip."</p>`
      },
      {
        heading: 'Owned by the Prairie Island Indian Community',
        body: `<p>Treasure Island is owned and operated by the <strong>Prairie Island Indian Community</strong>, part of the Dakota Nation. The community has stewarded this land along the Mississippi for generations. Casino revenues support tribal healthcare, education, housing, and cultural preservation programs. The connection to place — the river, the bluffs, the land — is embedded in the resort's identity in a way that feels genuine rather than decorative.</p>`
      },
      {
        heading: 'The Casino Floor',
        body: `<p>The gaming floor spans <strong>over 100,000 square feet</strong>, making it one of the larger casino floors in Minnesota. Slot machines dominate the main floor, with a wide variety of denominations, themes, and formats — from penny video slots to high-limit machines. Progressive jackpot banks are spread throughout the floor, and Treasure Island is known among Minnesota players for <strong>frequent slot wins</strong>.</p>
<p>Table games include blackjack, roulette, craps, and specialty games. The floor is well-maintained and the staff is generally praised for being friendly and attentive — qualities that matter when you're spending a weekend rather than just a few hours.</p>`
      },
      {
        heading: 'The Full Resort Experience',
        body: `<p>Treasure Island is a true resort, not just a casino with rooms attached. The property includes a full hotel with river and bluff views, an indoor pool, and a <strong>full-service spa</strong> — the kind of amenities that make a weekend trip feel like an actual vacation. The <strong>Cannon Golf Club</strong>, adjacent to the resort, is one of the better public golf courses in southeastern Minnesota, adding another reason to extend your stay.</p>
<p>Weekend packages typically bundle hotel stays with dining credits, free play, and sometimes spa services — making it surprisingly affordable to do it right. Check the promotions page before booking; seasonal packages often offer significant value over à la carte rates.</p>`
      },
      {
        heading: 'TI Rewards Loyalty Program',
        body: `<p>The <strong>TI Rewards</strong> program is Treasure Island's loyalty club, earning members points on slot play and table games redeemable for free play, dining, hotel discounts, and priority access to concerts and events. Tier advancement unlocks additional benefits including enhanced free-play rates and exclusive promotions.</p>
<p>Sign up before your first visit — new member offers are often available, and you'll start accumulating points from your first dollar played. The promotions calendar at TI tends to be active, with bonus-point events, drawings, and seasonal offers running throughout the year.</p>`
      },
      {
        heading: 'Entertainment',
        body: `<p>The <strong>Treasure Island Center</strong> hosts concerts, comedy shows, and special events throughout the year. The venue draws regional and national acts, and the smaller, more intimate setting compared to large arenas means you're close to the action regardless of where you sit. Entertainment is a core part of the TI experience — check the events calendar when planning your visit, as shows often sell out on weekends.</p>`
      },
      {
        heading: 'Dining',
        body: `<p>Treasure Island's dining lineup covers the full spectrum from casual to upscale. Fine dining options showcase local and regional ingredients with menus that change seasonally. Casual restaurants and buffet-style dining serve as convenient options when you want something quick between sessions on the floor. The bar and lounge areas keep the social scene going well past when the tables are still running.</p>`
      },
      {
        heading: 'Jackpots',
        body: `<p>Treasure Island has a reputation among Minnesota players as a property where <strong>jackpots hit with regularity</strong>. The progressive banks across the main floor build consistently and pay out frequently. FindJackpots tracks reported jackpots at TI in real time — see the feed above for the latest big wins and trending machines.</p>`
      },
    ],
    faqs: [
      {
        q: 'Where is Treasure Island Casino in Minnesota?',
        a: 'Treasure Island Resort & Casino is located in Welch, Minnesota, on the banks of the Mississippi River in Goodhue County. It\'s approximately 60 miles southeast of Minneapolis/St. Paul — about an hour\'s drive along the scenic Highway 61 corridor through the Mississippi River bluffs.'
      },
      {
        q: 'What is the TI Rewards program?',
        a: 'TI Rewards is Treasure Island\'s loyalty program. Members earn points on slot play and table games, redeemable for free play, dining credits, hotel discounts, and priority access to concerts and events at the Treasure Island Center. Sign-up is free, and new member promotions are often available. The program has multiple tiers with escalating benefits.'
      },
      {
        q: 'Does Treasure Island Casino have a hotel?',
        a: 'Yes — Treasure Island Resort & Casino includes a full-service hotel with river and bluff views, an indoor pool, and a spa. Weekend resort packages often bundle hotel stays with free play and dining credits. The adjacent Cannon Golf Club is another reason many guests extend their stays to a full weekend.'
      },
      {
        q: 'How far is Treasure Island Casino from Minneapolis?',
        a: 'Treasure Island Resort & Casino is approximately 60 miles southeast of Minneapolis and St. Paul — about a 60-minute drive via Highway 52 and Highway 61. The scenic route along the Mississippi River bluffs makes the drive itself an enjoyable part of the trip. Unlike most Minnesota casinos, there is no free shuttle service, so a car is recommended.'
      },
      {
        q: 'What restaurants are at Treasure Island Casino?',
        a: 'Treasure Island has multiple dining options ranging from fine dining with seasonal menus to casual restaurants and quick-service counters on the casino floor. The property is a full resort, so dining quality tends to be higher than at standalone casino properties. Specific restaurant offerings and hours vary seasonally — check the Treasure Island website for current options before your visit.'
      },
    ],
  },

};

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
    .site-header { background: #1e3a5f; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
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

// Legendz.com affiliate banner — CJ network, $30/signup, social casino.
// excludedStates: NV, NJ, MI, NY (do not render on those state pages)
function legendzBanner(stateCode) {
  const excluded = ['NV', 'NJ', 'MI', 'NY', 'WV', 'MS', 'IN', 'DE', 'MT', 'KS', 'IA'];
  if (stateCode && excluded.includes(stateCode.toUpperCase())) return '';
  return `<div style="margin:32px 0;padding:20px 24px;background:#f4f7fb;border-radius:12px;text-align:center;border:1px solid #dde6f0;">
  <div style="font-size:11px;color:#999;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Featured Partner</div>
  <a href="https://www.dpbolvw.net/click-101711107-17133749" target="_top" rel="noopener sponsored">
    <img src="https://www.ftjcfx.com/image-101711107-17133749" width="359" height="240" alt="Play Legendz Casino Free" style="max-width:100%;border-radius:8px;" border="0"/>
  </a>
  <img src="https://www.awltovhc.com/image-101711107-17107127" width="1" height="1" border="0"/>
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
${legendzBanner(null)}
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
${legendzBanner(null)}
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

      // Casino content override
      const override = CASINO_OVERRIDES[casinoId] || null;

      // Build override FAQ JSON-LD (merged into page if override exists)
      let overrideFaqJsonLd = null;
      if (override && override.faqs && override.faqs.length > 0) {
        overrideFaqJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: override.faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        };
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
    <a href="https://findjackpots.com" class="cta-btn" style="padding:8px 18px;font-size:0.9rem;">Find Casinos Near You →</a>
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
    ${c.has_hotel ? `
    <div style="margin:20px 0;padding:18px 24px;background:#fff5f5;border-radius:10px;border:1px solid #f5c6c6;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <div>
        <div style="font-weight:700;color:#1e3a5f;font-size:1rem;">🏨 Hotel On-Site</div>
        <div style="color:#666;font-size:0.9rem;margin-top:2px;">Stay right at the casino — book through Hotels.com for best rates</div>
      </div>
      <a href="${c.state === 'NV' ? 'https://www.tkqlhce.com/click-101711107-12873028' : 'https://www.kqzyfj.com/click-101711107-10433860'}" target="_blank" rel="noopener sponsored"
         style="background:#c8102e;color:#fff;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;white-space:nowrap;flex-shrink:0;">
        ${c.state === 'NV' ? 'Find Las Vegas Hotel Deals →' : 'Book a Room →'}
      </a>
    </div>
    <img src="${c.state === 'NV' ? 'https://www.ftjcfx.com/image-101711107-12873028' : 'https://www.ftjcfx.com/image-101711107-10433860'}" width="1" height="1" border="0"/>
    ` : ''}
    <div style="margin-top:16px;">
      <strong>Amenities:</strong> ${amenityBadges(c) || '<span style="color:#888;">Not specified</span>'}
    </div>
    ${c.rating ? `
    <div style="margin-top:16px;padding:16px;background:#f9fbff;border-radius:8px;border-left:3px solid #5c7aaa;">
      <strong>FindJackpots Score:</strong> ${scoreBadgeHtml(c.rating)} — ${scoreLabel(c.rating, c.review_count) || 'Rated'}
      based on ${c.review_count || 0} verified player reviews. Ratings reflect overall casino experience including floor quality, service, and atmosphere.
    </div>` : ''}
  </div>

  ${override ? `
  <div class="section" style="background:#f4f7fb;border-radius:14px;padding:28px 32px;margin-top:24px;border-left:4px solid #1e3a5f;">
    <p style="font-size:1.25rem;font-weight:700;color:#1e3a5f;margin:0 0 12px;">${override.tagline}</p>
    <p style="font-size:1.05rem;color:#333;line-height:1.7;margin:0 0 20px;">${override.hero_blurb}</p>
    ${override.sections.map(s => `
    <div style="margin-bottom:24px;">
      <h3 style="color:#1e3a5f;font-size:1.05rem;margin:0 0 10px;border-bottom:1px solid #cdd8e8;padding-bottom:6px;">${s.heading}</h3>
      <div style="color:#333;line-height:1.75;font-size:0.97rem;">${s.body}</div>
    </div>`).join('')}
    ${override.faqs && override.faqs.length > 0 ? `
    <div style="margin-top:28px;">
      <h3 style="color:#1e3a5f;font-size:1.05rem;margin:0 0 16px;border-bottom:1px solid #cdd8e8;padding-bottom:6px;">Frequently Asked Questions</h3>
      <dl>
        ${override.faqs.map(f => `
        <div class="faq-item" style="margin-bottom:16px;">
          <dt style="font-weight:700;color:#1e3a5f;margin-bottom:4px;">${f.q}</dt>
          <dd style="margin:0;color:#333;line-height:1.7;">${f.a}</dd>
        </div>`).join('')}
      </dl>
    </div>` : ''}
  </div>` : ''}

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
${overrideFaqJsonLd ? `<script type="application/ld+json">${JSON.stringify(overrideFaqJsonLd, null, 2)}</script>` : ''}
${legendzBanner(c.state)}
${siteFooter()}
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error(`/casino/:id/:slug error:`, err.message);
      res.status(500).send('<h1>Server Error</h1><p>' + err.message + '</p>');
    }
  });

  // ─── BLOG ROUTES ──────────────────────────────────────────────────────────

  // Blog post metadata (used for index page listing)
  const BLOG_POSTS = [
    {
      slug: 'top-casinos-minnesota',
      title: 'Top 5 Casinos in Minnesota — Jackpots, Payouts & Loyalty Programs (2026)',
      date: '2026-03-01',
      excerpt: 'Minnesota is home to 21 tribal casinos, some of the best in the Midwest. Here\'s what makes the top 5 stand out — from Mystic Lake\'s massive jackpots to Fortune Bay\'s lakeside charm.',
    },
    {
      slug: 'how-to-find-loosest-slots',
      title: 'How to Find the Loosest Slot Machines at Any Casino (2026 Guide)',
      date: '2026-03-08',
      excerpt: 'Not all slot machines pay out the same. Learn what slot payback percentage means, which states publish payout data, and proven tips for finding the best-paying slots on the floor.',
    },
    {
      slug: 'biggest-casino-jackpots-2026',
      title: 'Biggest Casino Jackpots of 2026 — Tracking the Largest US Slot Wins',
      date: '2026-03-15',
      excerpt: 'From six-figure local jackpots to life-changing progressive wins, 2026 has already seen some massive payouts. We break down the biggest jackpots and how to track them in real time.',
    },
    {
      slug: 'casino-loyalty-programs-compared',
      title: 'Casino Loyalty Programs Compared — Which Rewards Program Is Worth It?',
      date: '2026-03-18',
      excerpt: 'Caesars Rewards, MGM Rewards, Club M, mychoice, B Connected — there are dozens of casino loyalty cards out there. We compare the biggest programs so you can maximize your play.',
    },
    {
      slug: 'midwest-casino-road-trip',
      title: 'The Ultimate Midwest Casino Road Trip Guide — Minnesota to Iowa to Wisconsin',
      date: '2026-03-22',
      excerpt: 'Planning a casino road trip through the Midwest? We mapped out the best route from Minnesota through Iowa and into Wisconsin, with top casino stops, loyalty tips, and what to expect.',
    },
    {
      slug: 'best-casinos-near-chicago',
      title: 'Best Casinos Near Chicago — Top 10 Within 2 Hours',
      date: '2026-03-24',
      excerpt: 'Chicago doesn\'t have a casino yet, but it\'s surrounded by world-class options. From Horseshoe Hammond (15 min) to Rivers Des Plaines (20 min) and beyond — here\'s everything you need to know.',
    },
    {
      slug: 'best-casinos-near-minneapolis',
      title: 'Best Casinos Near Minneapolis — Complete Guide (2026)',
      date: '2026-03-24',
      excerpt: 'Minneapolis is one of the best casino cities in the US — Mystic Lake is 25 minutes away, and six more excellent options are within 90 minutes. Here\'s the complete guide for Twin Cities gamblers.',
    },
    {
      slug: 'vegas-locals-casinos-guide',
      title: 'Las Vegas Locals Casinos — Where Vegas Residents Actually Gamble',
      date: '2026-03-24',
      excerpt: 'Strip casinos are built for tourists. Las Vegas locals know the better options: better odds, lower minimums, free parking, and loyalty programs that actually reward consistent play.',
    },
    {
      slug: 'casino-loyalty-programs-midwest',
      title: 'Best Casino Loyalty Programs in the Midwest — Ranked (2026)',
      date: '2026-03-24',
      excerpt: 'Club M, mychoice, Rush Rewards, Caesars Rewards, Grand Rewards — which Midwest casino loyalty program gives you the most value? We rank them all and tell you how to maximize every point.',
    },
    {
      slug: 'slot-machine-tips-beginners',
      title: 'Slot Machine Tips for Beginners — What the Casinos Won\'t Tell You',
      date: '2026-03-24',
      excerpt: 'RNG myths, denomination strategy, volatility, progressive jackpots, and why your loyalty card matters even on slots. An honest, no-hype guide to smarter slot play.',
    },
  ];

  // Shared blog article <head> + styles
  function blogHead({ title, description, canonical, datePublished, slug }) {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: description,
      datePublished: datePublished,
      dateModified: datePublished,
      url: canonical,
      image: 'https://findjackpots.com/icons/icon-512.png',
      author: { '@type': 'Person', name: 'Jason Morrow', url: 'https://findjackpots.com' },
      publisher: {
        '@type': 'Organization',
        name: 'FindJackpots',
        url: 'https://findjackpots.com',
        logo: { '@type': 'ImageObject', url: 'https://findjackpots.com/icons/icon-512.png' },
      },
    };
    return `${htmlHead({ title, description, canonical, ogType: 'article' })}
<style>
  .blog-hero { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 48px 24px 40px; text-align: center; }
  .blog-hero .breadcrumb { font-size: 0.85rem; opacity: 0.7; margin-bottom: 12px; }
  .blog-hero .breadcrumb a { color: #fff; }
  .blog-hero h1 { margin: 0 0 16px; font-size: 2rem; font-weight: 800; line-height: 1.25; max-width: 800px; margin-left: auto; margin-right: auto; }
  .blog-hero .meta { font-size: 0.85rem; opacity: 0.75; }
  .article-body { max-width: 760px; margin: 0 auto; padding: 40px 24px 60px; }
  .article-body h2 { color: #1a1a2e; font-size: 1.4rem; margin: 40px 0 16px; border-left: 4px solid #5c7aaa; padding-left: 12px; }
  .article-body h3 { color: #1a1a2e; font-size: 1.1rem; margin: 28px 0 10px; }
  .article-body p { color: #333; line-height: 1.8; margin: 0 0 18px; }
  .article-body ul, .article-body ol { color: #333; line-height: 1.8; margin: 0 0 18px; padding-left: 24px; }
  .article-body li { margin-bottom: 8px; }
  .article-body a { color: #5c7aaa; }
  .article-body a:hover { text-decoration: underline; }
  .tip-box { background: #f0f4f9; border-left: 4px solid #5c7aaa; border-radius: 0 8px 8px 0; padding: 18px 20px; margin: 24px 0; }
  .tip-box p { margin: 0; color: #1a1a2e; }
  .back-link { display: block; margin: 0 0 28px; color: #5c7aaa; font-size: 0.9rem; }
</style>
<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>`;
  }

  // ── /blog — Blog index ────────────────────────────────────────────────────
  app.get('/blog', (req, res) => {
    const title = 'FindJackpots Blog — Casino Tips, Jackpot News & Gambling Guides';
    const description = 'Expert casino tips, jackpot tracking guides, loyalty program comparisons, and gambling news from the FindJackpots team. Your source for smarter casino play.';
    const canonical = 'https://findjackpots.com/blog';

    const postsHtml = BLOG_POSTS.map(post => `
      <article style="border-bottom:1px solid #eee;padding:28px 0;">
        <div style="font-size:0.82rem;color:#888;margin-bottom:6px;">${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
        <h2 style="margin:0 0 10px;font-size:1.25rem;"><a href="/blog/${post.slug}" style="color:#1a1a2e;">${post.title}</a></h2>
        <p style="margin:0 0 14px;color:#555;line-height:1.7;">${post.excerpt}</p>
        <a href="/blog/${post.slug}" style="color:#5c7aaa;font-weight:600;">Read article →</a>
      </article>`).join('');

    const html = `${htmlHead({ title, description, canonical })}
<style>
  .blog-index-hero { background: linear-gradient(135deg, #5c7aaa 0%, #3a5a8a 100%); color: #fff; padding: 48px 24px 40px; text-align: center; }
  .blog-index-hero h1 { margin: 0 0 12px; font-size: 2.2rem; font-weight: 800; }
  .blog-index-hero p { margin: 0 auto; font-size: 1.05rem; opacity: 0.9; max-width: 600px; }
  .blog-content { max-width: 760px; margin: 0 auto; padding: 40px 24px 60px; }
  .blog-content h2 { font-size: 1rem; color: #5c7aaa; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
</style>
<body>
${siteHeader()}
<div class="blog-index-hero">
  <h1>🎰 FindJackpots Blog</h1>
  <p>Casino tips, jackpot news, loyalty program guides, and more — from the team behind FindJackpots.</p>
</div>
<div class="blog-content">
  <h2>Latest Articles</h2>
  ${postsHtml}
  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Track live jackpots at casinos near you</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/top-casinos-minnesota ───────────────────────────────────────────
  app.get('/blog/top-casinos-minnesota', (req, res) => {
    const slug = 'top-casinos-minnesota';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Minnesota Casinos</p>
    <h1>${post.title}</h1>
    <p class="meta">By Jason Morrow · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · 7 min read</p>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Minnesota is one of the best states in the country for tribal casino gaming. With 21 tribal casinos spread across the state — many of them operated by the Ojibwe and Dakota nations — Minnesotans have world-class gambling close to home. Whether you're hunting for a life-changing jackpot, solid loyalty rewards, or a full resort weekend, Minnesota has a casino that fits the bill.</p>

  <p>But not all casinos are created equal. Below, we break down the <strong>top 5 casinos in Minnesota</strong> based on jackpot size, loyalty programs, amenities, and overall player experience. If you want to track live jackpots at any of these properties, <a href="/casinos/minnesota">view all Minnesota casinos on FindJackpots</a>.</p>

  ${legendzBanner(null)}

  <h2>1. Mystic Lake Casino Hotel — Prior Lake</h2>
  <p>Mystic Lake is the crown jewel of Minnesota tribal gaming. Operated by the Shakopee Mdewakanton Sioux Community just 25 miles southwest of Minneapolis, Mystic Lake is the largest casino in the upper Midwest. With over 4,000 slot machines and a dedicated poker room, it's the go-to destination for serious players.</p>
  <p><strong>Jackpots:</strong> Mystic Lake reports some of the highest jackpot payouts in the state, with six-figure wins occurring regularly. The casino's progressive slots and linked machines drive massive jackpot pools. Check <a href="/casinos/minnesota">FindJackpots Minnesota</a> for live jackpot data.</p>
  <p><strong>Loyalty Program:</strong> Club M is Mystic Lake's rewards program. Points earn comps, free play, hotel stays, and entertainment. The program tiers up to Diamond Elite for high rollers. Comp dollars flow freely, and the hotel offers discounted rates to players.</p>
  <p><strong>Why visit:</strong> Hotel, spa, multiple restaurants, comedy club, and a massive gaming floor. If you're doing one Minnesota casino, this is it.</p>

  <h2>2. Grand Casino Hinckley — Hinckley</h2>
  <p>Grand Casino Hinckley sits conveniently along I-35, making it a natural pit stop between Minneapolis and Duluth. Operated by the Mille Lacs Band of Ojibwe, it's one of the largest casinos in Minnesota with 2,000+ machines and a full resort.</p>
  <p><strong>Jackpots:</strong> Grand Hinckley consistently produces strong jackpot activity. Its slot floor includes a mix of penny, nickel, and dollar machines, plus high-limit rooms for bigger bets and bigger potential wins.</p>
  <p><strong>Loyalty Program:</strong> The Grand Rewards program links Grand Casino Hinckley and Grand Casino Mille Lacs. Points earned at either casino transfer seamlessly. Rewards include free play, hotel perks, entertainment tickets, and dining credits.</p>
  <p><strong>Why visit:</strong> Great location for a road trip stop, full hotel and RV park, indoor pool, and consistent jackpot activity.</p>

  <h2>3. Black Bear Casino Resort — Carlton</h2>
  <p>Tucked in Carlton near Jay Cooke State Park, Black Bear Casino Resort is operated by the Fond du Lac Band of Lake Superior Chippewa. It's a favorite for northern Minnesota and Wisconsin players looking for a full resort experience.</p>
  <p><strong>Jackpots:</strong> Black Bear has around 2,000 slot machines including a dedicated high-limit area. The casino connects to <a href="/casinos/minnesota">FindJackpots tracking</a>, where you can see recent jackpot wins.</p>
  <p><strong>Loyalty Program:</strong> The Fond-du-Luth Casino card also works at Black Bear, giving players a two-property network for earning rewards. Free play, dining, and hotel discounts are among the top perks.</p>
  <p><strong>Why visit:</strong> Beautiful northern Minnesota setting, great hotel, close to Duluth and the North Shore. Strong value for resort-style casino stays.</p>

  <h2>4. Treasure Island Resort & Casino — Red Wing</h2>
  <p>Treasure Island sits on the banks of the Mississippi River south of the Twin Cities, operated by the Prairie Island Indian Community. The waterfront setting makes it one of the most scenic casino resorts in the Midwest.</p>
  <p><strong>Jackpots:</strong> With 2,500+ machines and a marina location, Treasure Island pulls players from the Twin Cities and Wisconsin. The casino runs frequent jackpot promotions and progressive slot events.</p>
  <p><strong>Loyalty Program:</strong> The Island Rewards program offers tiered benefits including free play, spa credits, hotel discounts, and priority marina access — a unique perk for boaters.</p>
  <p><strong>Why visit:</strong> Stunning river setting, marina, multiple restaurants, full hotel, and easy access from the Twin Cities. A great date-night or weekend trip casino.</p>

  <h2>5. Fortune Bay Resort Casino — Tower</h2>
  <p>Fortune Bay sits on the shores of Lake Vermilion in the heart of Minnesota's Iron Range. Operated by the Bois Forte Band of Chippewa, it's the most remote casino on this list — and worth every mile of the drive.</p>
  <p><strong>Jackpots:</strong> Fortune Bay has around 800 machines, a smaller floor than the others, but with a tight player base, jackpots hit more frequently on a per-machine basis. Check <a href="/casinos/minnesota">FindJackpots</a> for the latest wins.</p>
  <p><strong>Loyalty Program:</strong> The Fortune Bay rewards card ties into the full resort, including golf, marina, snowmobile trails, and an excellent hotel. Points earn free play, resort credits, and dining discounts.</p>
  <p><strong>Why visit:</strong> Unbeatable setting on Lake Vermilion. Perfect for combining casino play with a northern Minnesota outdoor adventure — fishing, golf, snowmobiling, or just enjoying the scenery.</p>

  <h2>How to Track Minnesota Casino Jackpots</h2>
  <p>FindJackpots aggregates live jackpot data from casinos across Minnesota. You can browse recent big wins, set jackpot alerts, and compare payout data across all 21 tribal casinos in the state.</p>

  <div class="tip-box">
    <p>💡 <strong>Pro tip:</strong> The best time to play progressive slots is when the jackpot amount is significantly above the published "seed" value — that's when the pot has been building without a winner and the odds of a payout are statistically more likely.</p>
  </div>

  <p>Ready to explore? <a href="/casinos/minnesota">View all Minnesota casinos on FindJackpots →</a></p>

  <p>Also see: <a href="/biggest-jackpots">Biggest recent jackpots nationwide</a> · <a href="/best-midwest-casinos">Best Midwest casinos</a> · <a href="/blog/midwest-casino-road-trip">Midwest casino road trip guide</a></p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Track live Minnesota casino jackpots</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/how-to-find-loosest-slots ──────────────────────────────────────
  app.get('/blog/how-to-find-loosest-slots', (req, res) => {
    const slug = 'how-to-find-loosest-slots';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Slot Strategy</p>
    <h1>${post.title}</h1>
    <p class="meta">By Jason Morrow · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · 8 min read</p>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Every slot player wants to find the loosest machines on the floor — those high-payout slots that give back more over time. But here's the honest truth: casinos don't put a flashing sign above their best-paying machines. You have to do your research.</p>

  <p>In this guide, we break down exactly what slot payback percentage means, which states actually publish payout data, and practical tips for finding machines that give you the best shot at walking away ahead.</p>

  ${legendzBanner(null)}

  <h2>What Is Slot Payback Percentage?</h2>
  <p>Every slot machine is programmed with a <strong>Return to Player (RTP)</strong> percentage — the theoretical share of all wagered money the machine pays back over millions of spins. A machine with a 94% RTP returns $94 for every $100 wagered on average, over a very long time horizon.</p>
  <p>Key things to understand:</p>
  <ul>
    <li><strong>RTP is calculated over millions of spins</strong> — in any short session, variance can swing wildly in either direction.</li>
    <li><strong>Higher RTP = better odds for players.</strong> Nevada's tight regulatory environment means Vegas casinos average 92–95%+ on dollar machines. Some tribal casinos with less regulation run lower.</li>
    <li><strong>Dollar slots generally pay more than penny slots.</strong> Penny machines often run 85–88% RTP; dollar machines may hit 95%+.</li>
    <li><strong>Progressive jackpot slots have lower base RTP</strong> because a slice of every bet feeds the jackpot pool.</li>
  </ul>

  <h2>Which States Publish Slot Payout Data?</h2>
  <p>This is where players gain a real edge. Several states require commercial casinos to report slot payout percentages publicly:</p>
  <ul>
    <li><strong>Nevada:</strong> The Nevada Gaming Control Board publishes monthly slot reports broken down by denomination and county. You can literally look up the average payback for $1 slots on the Las Vegas Strip vs. downtown.</li>
    <li><strong>Iowa:</strong> The Iowa Racing and Gaming Commission publishes detailed payout reports by casino and denomination. Iowa's commercial casinos are required to hit minimum payback thresholds. <a href="/casinos/iowa">View Iowa casinos on FindJackpots</a>.</li>
    <li><strong>Illinois:</strong> The Illinois Gaming Board publishes monthly reports with payback percentages by casino. Illinois is consistently transparent, making it one of the better states for data-driven players.</li>
    <li><strong>New Jersey, Missouri, Indiana, and others</strong> also publish varying levels of payout data.</li>
  </ul>
  <p>Tribal casinos operating under IGRA compacts are generally not required to publish payout data, which is why finding reliable numbers for Minnesota or Wisconsin tribal casinos is harder.</p>

  <div class="tip-box">
    <p>💡 <strong>Quick tip:</strong> When traveling to Nevada, look up the NGCB monthly report for your specific casino's area. Downtown Las Vegas slot payback consistently beats the Strip — sometimes by 3-5 percentage points.</p>
  </div>

  <h2>Tips for Finding the Best-Paying Machines</h2>

  <h3>1. Play Higher Denominations</h3>
  <p>Dollar and quarter machines almost always have better RTP than penny machines. If your budget allows, step up to higher denominations for better long-term odds. A $1/spin dollar slot at 95% RTP beats a 250-line penny machine at 86%.</p>

  <h3>2. Look for High-Volatility Machines in High-Traffic Areas</h3>
  <p>This is an old casino myth with some truth: casinos historically placed looser machines in high-visibility spots (near entrances, aisles) so players see winners. Modern casinos have moved away from this practice, but it still influences floor layout at many properties.</p>

  <h3>3. Ask Casino Hosts</h3>
  <p>Casino hosts exist to keep players happy. If you're a known player with a rewards card, don't be shy about asking which games are performing well. Hosts won't reveal exact RTPs, but they can steer you toward popular games with good recent hit frequency.</p>

  <h3>4. Check the Jackpot Amount</h3>
  <p>For progressive jackpots, higher jackpot amounts (well above the seed value) indicate the jackpot has been growing for a while — more value is sitting in the pot waiting to be won. <a href="/biggest-jackpots">FindJackpots tracks current jackpot sizes</a> so you can see where the biggest opportunities are right now.</p>

  <h3>5. Research Before You Go</h3>
  <p>Use state gaming reports, player forums like VegasMessage Board or TripAdvisor casino threads, and tools like <a href="/highest-payout-casinos">FindJackpots' highest payout casinos page</a> to compare properties before choosing where to play.</p>

  <h3>6. Location Within the Casino Matters Less Now</h3>
  <p>Modern casinos use server-based gaming that can adjust machine settings remotely. Physical placement matters less than it used to. Focus your research on casino-level payout data rather than trying to guess machine placement strategy.</p>

  <h2>The Bottom Line</h2>
  <p>You can't guarantee a win on any slot machine — that's the nature of RNG-based gaming. But you <em>can</em> improve your odds by choosing casinos and games with higher published RTPs, playing higher denominations, and using jackpot tracking tools to identify when progressive pools have grown to exceptional levels.</p>
  <p>FindJackpots is built to help you do exactly that. Browse <a href="/highest-payout-casinos">highest payout casinos by state</a>, track <a href="/biggest-jackpots">live jackpot data</a>, and find where the best odds are right now.</p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Find the highest payout casinos near you</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/biggest-casino-jackpots-2026 ────────────────────────────────────
  app.get('/blog/biggest-casino-jackpots-2026', async (req, res) => {
    const slug = 'biggest-casino-jackpots-2026';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    // Pull top 5 jackpots from DB
    let topJackpots = [];
    try {
      const result = await pool.query(`
        SELECT j.amount_cents, j.machine_name, j.won_at, c.name as casino_name, c.city, c.state
        FROM jackpots j
        JOIN casinos c ON j.casino_id = c.id
        WHERE j.amount_cents IS NOT NULL AND j.amount_cents > 0
        ORDER BY j.amount_cents DESC
        LIMIT 5
      `);
      topJackpots = result.rows;
    } catch (e) {
      // Silently degrade — jackpot table may not exist yet
    }

    const jackpotsHtml = topJackpots.length > 0 ? `
  <h2>Top 5 Biggest Recent Jackpots on FindJackpots</h2>
  <p>Here are the biggest jackpots currently tracked in our database:</p>
  <ol>
    ${topJackpots.map((j) => `<li><strong>${fmt$(j.amount_cents)}</strong> — ${j.machine_name || 'Slot Machine'} at ${j.casino_name || 'Unknown Casino'}, ${j.city || ''} ${j.state || ''}${j.won_at ? ` (${new Date(j.won_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})})` : ''}</li>`).join('\n    ')}
  </ol>
  <p>See more at <a href="/biggest-jackpots">FindJackpots: Biggest Jackpots →</a></p>` : `
  <h2>Tracking 2026's Biggest Jackpots</h2>
  <p>FindJackpots continuously ingests jackpot data from casinos across the US. <a href="/biggest-jackpots">View the current leaderboard →</a> to see the largest wins tracked in real time.</p>`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Jackpot News</p>
    <h1>${post.title}</h1>
    <p class="meta">By Jason Morrow · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · 7 min read</p>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>2026 has already delivered some stunning casino jackpots across the United States. From life-changing progressive wins to impressive local jackpots at regional tribal casinos, slot players are hitting big this year. Here's how jackpot tracking works, what progressive jackpots actually are, and how you can use FindJackpots to stay on top of the biggest wins in real time.</p>

  ${legendzBanner(null)}

  <h2>How Casino Jackpots Are Tracked</h2>
  <p>Casino jackpot tracking has evolved dramatically in the last decade. Historically, jackpot data was siloed inside each casino — players had no easy way to see recent wins at a property before visiting. Today, tools like <a href="/casino-jackpot-tracker">FindJackpots' Casino Jackpot Tracker</a> aggregate data from multiple sources to give players real-time visibility into jackpot activity.</p>
  <p>Data sources include:</p>
  <ul>
    <li><strong>Casino-reported wins:</strong> Many casinos post recent jackpot winners on social media and their own websites. FindJackpots ingests this data automatically.</li>
    <li><strong>Linked progressive systems:</strong> Casino software vendors like IGT, Aristocrat, and Konami run centralized progressive jackpot networks that track pot sizes and payouts across multiple properties.</li>
    <li><strong>State gaming reports:</strong> States like Nevada, Iowa, and Illinois require casino operators to report jackpot payouts, creating a public record.</li>
  </ul>

  <h2>What Are Progressive Jackpots?</h2>
  <p>Progressive jackpots grow over time as players wager on linked machines. A small percentage of every bet — typically 1–3% — feeds the jackpot meter. These can be:</p>
  <ul>
    <li><strong>Local progressives:</strong> Linked only within one casino. Jackpots grow faster because the player pool is smaller, but so do the potential amounts — typically topping out at $10,000–$100,000.</li>
    <li><strong>Wide-area progressives:</strong> Linked across multiple casinos statewide or nationally. These produce the legendary multi-million dollar jackpots you see on the news. Megabucks, Wheel of Fortune, and Powerball Slots are examples.</li>
    <li><strong>Stand-alone progressives:</strong> A jackpot pool fed only by one specific machine. These are smaller but hit more frequently.</li>
  </ul>

  <div class="tip-box">
    <p>🎰 <strong>Key insight:</strong> Wide-area progressives have worse RTP for base play because so much of every bet goes into the jackpot pool. The tradeoff is a shot at a life-changing payout. Play them when the jackpot is well above seed value.</p>
  </div>

  ${jackpotsHtml}

  <h2>Biggest Jackpot Categories of 2026</h2>
  <p>While final annual tallies won't be available until year-end gaming reports are published, 2026 has seen significant activity in several jackpot categories:</p>
  <ul>
    <li><strong>Wide-area progressives:</strong> Nevada's Megabucks network continues to produce occasional multi-million dollar payouts, with at least one $3M+ win reported in early 2026.</li>
    <li><strong>Midwest tribal casinos:</strong> Mystic Lake and Grand Casino Hinckley in Minnesota have both reported six-figure jackpot wins in Q1 2026, consistent with prior year trends.</li>
    <li><strong>Iowa commercial casinos:</strong> Iowa's commercial casinos, which publish payout data publicly, showed strong jackpot activity in the first quarter.</li>
    <li><strong>Online-linked machines:</strong> Several states now allow server-linked machines that share jackpot pools with online casino platforms, creating new payout records.</li>
  </ul>

  <h2>How to Use FindJackpots to Track Wins</h2>
  <p>FindJackpots makes it easy to stay on top of jackpot activity at casinos near you:</p>
  <ol>
    <li>Visit <a href="/casino-jackpot-tracker">the Casino Jackpot Tracker</a> for a live feed of recent wins.</li>
    <li>Browse <a href="/biggest-jackpots">the biggest jackpots list</a> to see all-time and recent high-value wins.</li>
    <li>Set location-based alerts in the FindJackpots app to get notified when a big jackpot hits near you.</li>
    <li>Filter by casino, state, or machine type to find relevant jackpot data for your preferred properties.</li>
  </ol>

  <p>The goal is simple: give players better information so they can choose the right time and place to play.</p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Track the biggest jackpots in real time</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/casino-loyalty-programs-compared ────────────────────────────────
  app.get('/blog/casino-loyalty-programs-compared', (req, res) => {
    const slug = 'casino-loyalty-programs-compared';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Casino Loyalty Programs</p>
    <h1>${post.title}</h1>
    <p class="meta">By Jason Morrow · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · 8 min read</p>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Casino loyalty programs are one of the best tools a regular player has. Sign up for the right card, and the casino essentially pays you back a portion of what you wager — in free play, hotel stays, dining credits, and entertainment tickets. But with dozens of programs competing for your wallet, which one is actually worth it?</p>

  <p>We compared the five most prominent casino loyalty programs in the US: <strong>Caesars Rewards, MGM Rewards, Club M (Mystic Lake), mychoice (Penn), and B Connected (Boyd Gaming)</strong>. Here's the breakdown.</p>

  ${legendzBanner(null)}

  <h2>Caesars Rewards — The Network King</h2>
  <p>Caesars Rewards is arguably the most valuable casino loyalty program in the United States, primarily because of its massive footprint. With over 55 Caesars-branded casinos across the country, your points travel with you from Las Vegas to Atlantic City to regional markets.</p>
  <p><strong>How it works:</strong> You earn Tier Credits and Reward Credits simultaneously. Reward Credits convert to Reward Dollars at roughly 1 Reward Credit = $0.01. Tier Credits determine your status (Gold, Platinum, Diamond, Diamond Plus, Diamond Elite, Seven Stars).</p>
  <p><strong>Best perks:</strong></p>
  <ul>
    <li>Diamond status ($25,000 tier credits/year) includes priority hotel check-in, dedicated phone line, and meaningful free play offers</li>
    <li>Status match opportunities with other programs</li>
    <li>Reward Dollars valid at retail, dining, spa, and hotel — not just the casino</li>
    <li>Birthday bonuses and milestone rewards</li>
  </ul>
  <p><strong>Best for:</strong> Frequent travelers to Las Vegas and Atlantic City. The program rewards volume play across a large network. Midwest players can use it at Horseshoe and Harrah's properties. See <a href="/casinos/nevada">Nevada Caesars casinos on FindJackpots</a>.</p>

  <h2>MGM Rewards — Vegas Power Play</h2>
  <p>MGM Rewards covers the MGM Grand, Bellagio, ARIA, Vdara, Mandalay Bay, and many more top-tier Las Vegas properties. If the Strip is your playground, this is likely your most important card.</p>
  <p><strong>How it works:</strong> You earn MGM Rewards Points on gaming, hotel, dining, and entertainment spend. Points convert to Slot Play at 5,000 points = $5. Tier levels: Sapphire, Pearl, Gold, Platinum, Noir.</p>
  <p><strong>Best perks:</strong></p>
  <ul>
    <li>Gold status (25,000 tier points) includes priority check-in and dedicated host access</li>
    <li>Platinum unlocks serious resort fee waivers and complimentary room upgrades</li>
    <li>Points earn on hotel, dining, spa, and entertainment — not just slots</li>
    <li>BetMGM Sports and iGaming play counts toward tier in select states</li>
  </ul>
  <p><strong>Best for:</strong> Las Vegas Strip regulars who stay at MGM properties. The resort-side earning is a major advantage if you're spending on hotel and dining anyway.</p>

  <h2>Club M — Minnesota's Best Loyalty Card</h2>
  <p>Club M is Mystic Lake's loyalty program, operated by the Shakopee Mdewakanton Sioux Community. For Minnesota players, this is one of the most rewarding programs available — especially if Mystic Lake is your home casino.</p>
  <p><strong>How it works:</strong> Earn points on slots, table games, hotel, and dining. Points convert to free play and comp dollars. Tier levels progress from basic to Black Card for the highest rollers.</p>
  <p><strong>Best perks:</strong></p>
  <ul>
    <li>Generous free play offers and mailer promotions for regular players</li>
    <li>Hotel discounts and complimentary stays at Mystic Lake Hotel</li>
    <li>Birthday bonuses and special event invitations</li>
    <li>Consistent "earn multiplier" promotions that dramatically accelerate point accumulation</li>
  </ul>
  <p><strong>Best for:</strong> Twin Cities area players who visit Mystic Lake regularly. The program punches above its weight compared to national chains. <a href="/casinos/minnesota">Browse Minnesota casinos on FindJackpots</a>.</p>

  <h2>mychoice — Penn National's Midwest Network</h2>
  <p>mychoice is the loyalty program for Penn Entertainment (formerly Penn National), covering Hollywood Casinos, Ameristar, and other regional properties. It's the dominant loyalty card in Ohio, Indiana, Iowa, and Missouri.</p>
  <p><strong>How it works:</strong> mychoice points earn at all Penn properties. Points convert to slot play. Tier levels: mychoice, silver, gold, platinum, and the invitation-only HOF (Hall of Fame).</p>
  <p><strong>Best perks:</strong></p>
  <ul>
    <li>Strong Midwest network — Ohio, Indiana, Iowa, Missouri, Pennsylvania, and more</li>
    <li>theScore Bet and ESPN Bet play can link to tier in some states</li>
    <li>Generous promotional calendar for regional markets</li>
    <li>Hotel and dining comps at full resort properties</li>
  </ul>
  <p><strong>Best for:</strong> Midwest players who rotate between states and want a unified card across Penn properties.</p>

  <h2>B Connected — Boyd Gaming's Value Play</h2>
  <p>B Connected covers Boyd Gaming's 28 properties, including Sam's Town (Las Vegas and regional), Borgata in Atlantic City, and several Midwest and Southern properties. It's an underrated card for players who want solid mid-tier Las Vegas value.</p>
  <p><strong>Best perks:</strong></p>
  <ul>
    <li>Borgata's status in Atlantic City is one of the best regional card programs</li>
    <li>Solid free play offers and dining comps at Las Vegas properties</li>
    <li>Linked across all Boyd properties including The Orleans, Gold Coast, and Suncoast</li>
  </ul>
  <p><strong>Best for:</strong> Players who prefer off-Strip Las Vegas or visit Atlantic City regularly.</p>

  <h2>Which Loyalty Program Is Worth It?</h2>
  <p>The honest answer: it depends on where you play. Here's a quick decision guide:</p>
  <ul>
    <li><strong>Las Vegas Strip focus → MGM Rewards</strong> (plus Caesars as a secondary)</li>
    <li><strong>Broad national travel → Caesars Rewards</strong> (best multi-state network)</li>
    <li><strong>Minnesota home casino → Club M</strong> (Mystic Lake delivers outsized value for locals)</li>
    <li><strong>Midwest regional player → mychoice</strong> (Penn's Midwest footprint is unmatched)</li>
    <li><strong>Atlantic City / off-Strip Vegas → B Connected</strong></li>
  </ul>
  <p>One more tip: carry multiple cards. There's no penalty for having a Caesars card, MGM card, and Club M card simultaneously. Swipe the card that earns the most at each property.</p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Find the best casinos near you</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/nevada">Nevada casinos</a> · <a href="/casinos/minnesota">Minnesota casinos</a> · <a href="/best-casinos-near-me">Best casinos near me</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/midwest-casino-road-trip ────────────────────────────────────────
  app.get('/blog/midwest-casino-road-trip', (req, res) => {
    const slug = 'midwest-casino-road-trip';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Casino Road Trips</p>
    <h1>${post.title}</h1>
    <p class="meta">By Jason Morrow · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · 9 min read</p>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>The Midwest is quietly one of the best regions in the country for casino road trips. You've got 21 tribal casinos in Minnesota, 23 in Iowa, 26 in Wisconsin — plus commercial riverboat and racetrack casinos scattered across all three states. A long weekend driving loop can hit a half-dozen excellent properties with minimal backtracking.</p>

  <p>Here's the ultimate Midwest casino road trip guide: the best route, the top stops, and tips for making the most of every mile.</p>

  ${legendzBanner(null)}

  <h2>The Route: Minneapolis → Des Moines → Milwaukee Loop</h2>
  <p>The sweet spot for a Midwest casino road trip is a 3–4 day loop starting and ending in the Twin Cities. Here's a suggested itinerary:</p>
  <ul>
    <li><strong>Day 1:</strong> Twin Cities → Mystic Lake or Treasure Island → Prairie du Chien, WI</li>
    <li><strong>Day 2:</strong> Prairie du Chien → Dubuque, IA → Meskwaki Bingo Casino, IA</li>
    <li><strong>Day 3:</strong> Des Moines area casinos → Prairie Meadows → Return north</li>
    <li><strong>Day 4:</strong> Wisconsin stops (Potawatomi, Ho-Chunk) → back to Twin Cities</li>
  </ul>

  <h2>Minnesota: The Starting Point</h2>
  <p>Start your road trip in Minnesota, home to some of the best tribal casinos in the Midwest. The Twin Cities are flanked by Mystic Lake to the southwest and Treasure Island to the southeast — both excellent first stops.</p>
  <p>Key Minnesota stops:</p>
  <ul>
    <li><strong>Mystic Lake Casino Hotel</strong> (Prior Lake) — Largest casino in the upper Midwest. 4,000+ machines, full hotel, excellent loyalty rewards through Club M. <a href="/casinos/minnesota">See on FindJackpots</a>.</li>
    <li><strong>Treasure Island Resort & Casino</strong> (Red Wing) — Beautiful Mississippi River setting. Great for an overnight stay before heading into Wisconsin or Iowa.</li>
    <li><strong>Grand Casino Hinckley</strong> — Perfect if you're heading north or coming from Duluth. On I-35, easy access.</li>
  </ul>
  <p>Browse all <a href="/casinos/minnesota">Minnesota casinos on FindJackpots</a> to plan your first stops.</p>

  <h2>Iowa: Commercial Casino Country</h2>
  <p>Iowa is the wild card of Midwest casino road trips. The state has both tribal casinos and commercial "racino" operations, and because Iowa publishes payout data publicly, you can actually compare which casinos pay better before you visit.</p>
  <p>Top Iowa stops:</p>
  <ul>
    <li><strong>Meskwaki Bingo Casino Hotel</strong> (Tama) — The largest tribal casino in Iowa, centrally located. Good hotel, strong slot floor.</li>
    <li><strong>Prairie Meadows Casino</strong> (Altoona/Des Moines) — One of Iowa's top commercial racinos. Excellent payout data published by Iowa Racing and Gaming Commission.</li>
    <li><strong>Isle Casino Hotel</strong> (multiple locations) — Waterloo, Marquette, and Bettendorf locations make them easy to hit on a loop through eastern Iowa.</li>
    <li><strong>Rhythm City Casino Resort</strong> (Davenport) — New, modern resort near the Quad Cities. Easy access from Wisconsin.</li>
  </ul>
  <p><a href="/casinos/iowa">View all Iowa casinos on FindJackpots</a>.</p>

  <div class="tip-box">
    <p>🗺️ <strong>Road trip tip:</strong> Download the FindJackpots app before you leave. It shows casinos near your current location and recent jackpot activity — perfect for deciding where to stop when you're on the road.</p>
  </div>

  <h2>Wisconsin: Hidden Gems</h2>
  <p>Wisconsin has 26 tribal casinos and some genuine surprises. The Ho-Chunk properties are large and well-run; Potawatomi in Milwaukee is a city-based casino that punches well above its size.</p>
  <p>Top Wisconsin stops:</p>
  <ul>
    <li><strong>Potawatomi Hotel & Casino</strong> (Milwaukee) — One of the best urban casinos in the Midwest. 100,000 sq ft of gaming, multiple restaurants, full hotel. A must-stop if you're doing the southern Wisconsin loop.</li>
    <li><strong>Ho-Chunk Gaming Wisconsin Dells</strong> — In the middle of the Dells resort area, making it a natural stop for families who want a non-gambling reason to visit Wisconsin Dells.</li>
    <li><strong>Oneida Casino</strong> (Green Bay) — A large, well-established property near Green Bay. Great for a Packers game weekend combo.</li>
    <li><strong>St. Croix Casino Turtle Lake</strong> — Northwest Wisconsin, easy drive from the Twin Cities. A solid overnight stop on the return trip.</li>
  </ul>
  <p><a href="/casinos/wisconsin">View all Wisconsin casinos on FindJackpots</a>.</p>

  <h2>Tips for Maximizing Loyalty Points on a Road Trip</h2>
  <p>Road tripping through multiple casinos is a great opportunity to rack up points — if you play it smart:</p>
  <ol>
    <li><strong>Carry every card.</strong> Get Club M at Mystic Lake, mychoice at Iowa Penn properties, and the B Connected or local cards at Wisconsin casinos. There's no downside to collecting multiple cards.</li>
    <li><strong>Look for promotional multiplier days.</strong> Many casinos run 2x or 3x points promotions mid-week. Call ahead or check casino apps before arriving.</li>
    <li><strong>Book hotel through the casino.</strong> Even if you're not a high-roller, booking through the resort usually gets you a discounted rate and additional points.</li>
    <li><strong>Ask about new player bonuses.</strong> First-time visitors at many casinos get a free play bonus just for signing up for the loyalty card. Budget $20-50 in free play per new property.</li>
    <li><strong>Check jackpot activity before choosing where to play.</strong> Use <a href="/biggest-jackpots">FindJackpots' biggest jackpots tracker</a> to see which properties have had recent jackpot activity — a sign of active play and live machines.</li>
  </ol>

  <h2>What to Expect at Tribal Casinos</h2>
  <p>Most of the Midwest's best casinos are tribal properties. A few things to know:</p>
  <ul>
    <li><strong>No smoking rules vary by property.</strong> Some tribal casinos still allow smoking on parts of the floor. Check ahead if that's important to you.</li>
    <li><strong>Payout data is less transparent.</strong> Tribal casinos aren't required to publish RTP data like Iowa's commercial casinos. Use FindJackpots to compare jackpot activity as a proxy for which machines are paying.</li>
    <li><strong>Amenities have improved dramatically.</strong> The old days of basic tribal gaming halls are gone. Mystic Lake, Potawatomi, and Ho-Chunk Wisconsin Dells are full resort destinations.</li>
    <li><strong>Alcohol rules differ.</strong> Some tribal casinos serve alcohol freely; others have restrictions based on tribal ordinance. Check before you go.</li>
  </ul>

  <h2>Plan Your Trip with FindJackpots</h2>
  <p>Before hitting the road, use FindJackpots to map out your route, compare jackpot activity at your target properties, and find the <a href="/best-midwest-casinos">best Midwest casinos</a> for your budget and play style.</p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Plan your Midwest casino road trip</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/minnesota">Minnesota casinos</a> · <a href="/casinos/iowa">Iowa casinos</a> · <a href="/casinos/wisconsin">Wisconsin casinos</a> · <a href="/best-midwest-casinos">Best Midwest casinos</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/best-casinos-near-chicago ──────────────────────────────────────
  app.get('/blog/best-casinos-near-chicago', (req, res) => {
    const slug = 'best-casinos-near-chicago';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Chicago Casinos</p>
    <h1>${post.title}</h1>
    <div class="meta">Updated March 2026 · 10 min read</div>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Chicago is one of the biggest gambling markets in the country — and one of the only major American cities without a casino of its own inside city limits. That's changing (a downtown Chicago casino is in development), but right now the best options are a short drive away in Indiana and throughout Illinois. Good news: some of them are genuinely world-class, and the closest ones are closer than most people realize.</p>

  <p>Here's the definitive guide to the best <strong>casinos near Chicago</strong>, ranked by proximity from downtown, with everything you need to know about each property.</p>

  <h2>1. Horseshoe Hammond — 15 Minutes from Downtown Chicago</h2>
  <p><strong>Distance:</strong> ~15 miles from the Loop (15–25 min via I-90/94 E)<br>
  <strong>Location:</strong> Hammond, Indiana</p>
  <p>Horseshoe Hammond is the closest major casino to downtown Chicago, and by most measures, the best. It's a massive property — one of the largest in the Midwest — with over 2,700 slot machines and 100+ table games spread across a sprawling riverboat-style complex on the southern shore of Lake Michigan. The poker room is nationally respected, regularly hosting major tournament events. Dining options include Jack Binion's Steak, a high-end steakhouse that regularly ranks among the better casino restaurants in the region.</p>
  <p>Horseshoe Hammond is part of the <strong>Caesars Rewards</strong> network — one of the most powerful loyalty programs in the casino industry. Points earned here transfer to Caesars properties nationwide, including Caesars Palace Las Vegas. If you hold any Caesars tier status, your benefits apply the moment you walk in. New players should sign up for Caesars Rewards before their first visit.</p>
  <p>The casino does not have an attached hotel (the nearest accommodations are in the Hammond/Calumet City area), but the proximity to Chicago means most visitors are day-trippers. Parking is free and plentiful.</p>

  <h2>2. Rivers Casino Des Plaines — 20 Minutes from Downtown Chicago</h2>
  <p><strong>Distance:</strong> ~17 miles from the Loop (20–30 min via I-90 W)<br>
  <strong>Location:</strong> Des Plaines, Illinois</p>
  <p>Rivers Casino Des Plaines is Illinois' highest-grossing casino, consistently ranking among the top revenue-generating casinos in the entire country outside of Nevada and New Jersey. Its location off I-90 makes it extremely accessible from both downtown Chicago and O'Hare Airport (it's literally minutes from the terminals, making it a popular stop for delayed travelers).</p>
  <p>The casino features 1,000+ slot machines, 50+ table games, a well-regarded poker room, and several dining options including the upscale Aria restaurant. Rivers is part of Rush Street Gaming and operates the <strong>Rush Rewards</strong> loyalty program — a streamlined, point-based system that rewards both slot and table play. New member bonuses are typically available at the players club desk.</p>
  <p>Rivers Des Plaines has a hotel attached (the Rivers Casino Hotel), making it the best overnight option for Chicago-area casino visitors who want to stay close to the action.</p>

  <div style="margin:24px 0;padding:16px 20px;background:#fff5e6;border-left:4px solid #e8a020;border-radius:0 8px 8px 0;">
    <strong>🏨 Staying Overnight Near Chicago Casinos?</strong><br>
    <a href="https://www.kqzyfj.com/click-101711107-10433860" target="_blank" rel="noopener sponsored" style="color:#5c7aaa;">Find the best hotel deals near Chicago-area casinos on Hotels.com →</a>
    <img src="https://www.ftjcfx.com/image-101711107-10433860" width="1" height="1" border="0"/>
  </div>

  ${legendzBanner(null)}

  <h2>3. Hollywood Casino Joliet — 35 Minutes from Downtown Chicago</h2>
  <p><strong>Distance:</strong> ~35 miles from the Loop (35–45 min via I-55 S)<br>
  <strong>Location:</strong> Joliet, Illinois</p>
  <p>Hollywood Casino Joliet is a Penn Entertainment property with a long history in the Chicago-area market. It features 1,000+ slot machines, table games, live poker, and an attached hotel — making it a popular overnight destination. The casino operates on the Des Plaines River and has an entertainment venue that brings in live acts regularly. Hollywood Joliet is part of the <strong>mychoice</strong> loyalty program (Penn Entertainment's network), which spans dozens of properties across the country including Hollywood Casinos in Aurora, IL and elsewhere in Illinois.</p>

  <h2>4. Grand Victoria Casino — 35 Minutes from Chicago (Elgin)</h2>
  <p><strong>Distance:</strong> ~38 miles from the Loop (35–50 min via I-90 W to Elgin)<br>
  <strong>Location:</strong> Elgin, Illinois</p>
  <p>Grand Victoria in Elgin is one of the most consistently popular casinos in the Chicago suburbs, drawing heavily from the northwest suburbs and the Fox Valley area. The casino features 1,000+ slot machines, classic and electronic table games, and a solid dining lineup. It's an Elgin Riverboat Casino property, and its location in the Fox River corridor gives it a pleasant riverside setting. The players club program offers standard point accrual with promotional offers running throughout the year.</p>

  <h2>5. Hollywood Casino Aurora — 40 Minutes from Chicago</h2>
  <p><strong>Distance:</strong> ~35 miles from the Loop (40–55 min via I-88 W)<br>
  <strong>Location:</strong> Aurora, Illinois</p>
  <p>Hollywood Casino Aurora is another Penn Entertainment / mychoice property, located on the Fox River in downtown Aurora. It's a smaller property than some of the others on this list but draws a loyal crowd from the western suburbs. Slots, table games, and a good dining setup make it a solid option. mychoice members can earn and redeem points at both Hollywood Aurora and Hollywood Joliet, effectively treating the two as one network.</p>

  <h2>6. Par-A-Dice Hotel Casino — 2.5 Hours (Peoria, IL)</h2>
  <p><strong>Distance:</strong> ~165 miles from the Loop (2.5 hrs via I-55 S to I-74 W)<br>
  <strong>Location:</strong> East Peoria, Illinois</p>
  <p>Par-A-Dice is a Boyd Gaming property on the Illinois River in East Peoria, about a 2.5-hour drive from downtown Chicago. It's not a day-trip destination from the city, but worth knowing about if you're traveling downstate or making a weekend trip to the Peoria area. The casino features 900+ slot machines, table games, and a hotel with 208 rooms. Boyd Gaming's <strong>B Connected</strong> loyalty program covers the property.</p>

  <h2>7. Jumer's Casino & Hotel — 2.5 Hours (Rock Island, IL)</h2>
  <p><strong>Distance:</strong> ~180 miles from the Loop (2.5–3 hrs via I-88 W to I-280 W)<br>
  <strong>Location:</strong> Rock Island, Illinois</p>
  <p>Jumer's Casino & Hotel is the anchor of the Quad Cities gaming market, sitting on the Mississippi River in Rock Island. It's a full-service resort with 900+ slots, table games, and a comfortable hotel. The Quad Cities area also includes Isle Casino Hotel Bettendorf just across the river in Iowa, giving visitors two casino options within minutes of each other. Jumer's operates an independent loyalty program.</p>

  <h2>Planning Your Visit</h2>
  <p>For most Chicago-area gamblers, <strong>Horseshoe Hammond</strong> and <strong>Rivers Des Plaines</strong> are the clear first choices — both are world-class facilities within 20 minutes of downtown. If you're on the south or west side, Horseshoe Hammond is probably closer. If you're on the north side or near O'Hare, Rivers Des Plaines wins on distance.</p>

  <p>For overnight trips, Hollywood Joliet and Rivers Des Plaines both have attached hotels. Rivers has the slight edge on quality; Hollywood wins on price during midweek stays.</p>

  <p>Don't forget to join the loyalty program at every new casino you visit — even on a single trip, you'll earn redeemable points, and most programs offer a new-member welcome bonus worth $10–$25 in free play.</p>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Track jackpots at Chicago-area casinos in real time</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/illinois">All Illinois casinos</a> · <a href="/casinos/indiana">Indiana casinos</a> · <a href="/best-midwest-casinos">Best Midwest casinos</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/best-casinos-near-minneapolis ──────────────────────────────────
  app.get('/blog/best-casinos-near-minneapolis', (req, res) => {
    const slug = 'best-casinos-near-minneapolis';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Minnesota Casinos</p>
    <h1>${post.title}</h1>
    <div class="meta">Updated March 2026 · 10 min read</div>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>If you're a <strong>casino fan living in the Twin Cities</strong>, you're in one of the best situations in the country. Minnesota has 21 tribal casinos, and the closest — Mystic Lake — is just 25 minutes from downtown Minneapolis. Within 90 minutes you have six solid options. Within 2.5 hours, you're at one of the Upper Midwest's most underrated gaming destinations. This guide covers all of them.</p>

  <h2>1. Mystic Lake Casino Hotel — 25 Minutes from Minneapolis</h2>
  <p><strong>Distance:</strong> ~25 miles from downtown Minneapolis (30–40 min via Hwy 169 S)<br>
  <strong>Location:</strong> Prior Lake, MN</p>
  <p>Mystic Lake is the undisputed king of Minnesota casinos — and honestly, one of the best casino resorts in the entire country. The numbers are staggering: over <strong>4,000 slot machines</strong>, hundreds of table games, a 22-table poker room, a full sportsbook, bingo hall, bowling center, and a hotel complex with 600+ rooms and a luxury spa. The entertainment venue (Mystic Lake Center and the outdoor amphitheater) regularly books national acts, from country superstars to classic rock legends.</p>
  <p>The <strong>Club M</strong> loyalty program is one of the most rewarding in the Midwest. Members earn Mysticash on every slot and table game dollar, redeemable for free play, dining, hotel stays, and merchandise. The program runs three tiers — Club M, Mysticash, and Diamond — with escalating benefits including priority concert ticket access, dedicated host services, and monthly promotional events. Sign up before your first visit: new members typically receive a welcome free play offer.</p>
  <p>Mystic Lake is operated by the Shakopee Mdewakanton Sioux Community. It also offers a <strong>free shuttle from the Twin Cities metro</strong>, making it accessible without a car.</p>
  <p>👉 <a href="/casino/448/mystic-lake-casino-hotel">Full Mystic Lake review and live jackpot tracker →</a></p>

  <div style="margin:24px 0;padding:16px 20px;background:#fff5e6;border-left:4px solid #e8a020;border-radius:0 8px 8px 0;">
    <strong>🏨 Staying at Mystic Lake?</strong> Book through Hotels.com for the best rates on the attached hotel.<br>
    <a href="https://www.kqzyfj.com/click-101711107-10433860" target="_blank" rel="noopener sponsored" style="color:#5c7aaa;">Find Mystic Lake hotel deals →</a>
    <img src="https://www.ftjcfx.com/image-101711107-10433860" width="1" height="1" border="0"/>
  </div>

  ${legendzBanner('MN')}

  <h2>2. Canterbury Park — 25 Minutes from Minneapolis (Shakopee)</h2>
  <p><strong>Distance:</strong> ~24 miles from downtown Minneapolis (25–35 min)<br>
  <strong>Location:</strong> Shakopee, MN</p>
  <p>Canterbury Park is Minnesota's home of live horse racing — but it's also a year-round card room and gaming venue. The card room features poker, blackjack, and other table games in a licensed, pari-mutuel environment. During live racing season (roughly May through September), the track comes alive with simulcast wagering from across the country, plus live racing several days per week. Canterbury is located just a mile or two from Mystic Lake, making it easy to do both in a single day trip.</p>
  <p>Note: Canterbury Park is not a tribal casino — it operates under Minnesota's pari-mutuel and card room regulations. There are no slot machines, but the card room is robust and the atmosphere during live racing is genuinely fun.</p>

  <h2>3. Running Aces Casino, Hotel & Racetrack — 30 Minutes North of Minneapolis</h2>
  <p><strong>Distance:</strong> ~28 miles north of downtown Minneapolis (30–40 min via I-35W N)<br>
  <strong>Location:</strong> Columbus, MN</p>
  <p>Running Aces is Canterbury Park's northern counterpart — a card room and racetrack north of the metro near Forest Lake. Like Canterbury, it features table card games (no slots), live harness racing in season, and simulcast wagering. The atmosphere is more relaxed and local than the tribal casino circuit. It's a solid option for poker players in the northern metro who don't want to fight traffic heading southwest to Mystic Lake.</p>

  <h2>4. Treasure Island Resort & Casino — 60 Minutes from Minneapolis</h2>
  <p><strong>Distance:</strong> ~60 miles southeast of Minneapolis (60–70 min via Hwy 61 S)<br>
  <strong>Location:</strong> Welch, MN (Red Wing area)</p>
  <p>Treasure Island sits on the banks of the Mississippi River near Red Wing, and it's one of the most scenic casino settings in Minnesota. The resort features 2,100+ slot machines, 50+ table games, bingo, an attached hotel, a marina, an RV park, and an entertainment venue. The drive down Highway 61 through the Mississippi River valley bluffs is genuinely beautiful — one of the better Minnesota road trip routes regardless of the destination.</p>
  <p>The <strong>Treasure Island Players Club</strong> offers point accrual and tier benefits. The hotel and resort amenities (including the marina and outdoor spaces) make it a popular weekend destination rather than just a gaming stop.</p>

  <h2>5. Grand Casino Hinckley — 90 Minutes from Minneapolis</h2>
  <p><strong>Distance:</strong> ~90 miles north of Minneapolis (90 min via I-35 N)<br>
  <strong>Location:</strong> Hinckley, MN</p>
  <p>Grand Casino Hinckley is the anchor of a full resort complex operated by the Mille Lacs Band of Ojibwe. It features 2,000+ slot machines, table games, bingo, and one of Minnesota's better concert venues. The resort includes two hotels (Grand Casino Inn and Grand Hinckley Inn), an indoor waterpark, an RV park, a convention center, and multiple dining options. It's a complete destination resort — plenty of people make the 90-minute drive from the Cities specifically for a weekend stay.</p>
  <p>The <strong>Grand Rewards</strong> loyalty program covers both Grand Casino Hinckley and Grand Casino Mille Lacs, allowing members to earn and redeem points at either property. Benefits include free play, hotel discounts, dining credits, and priority event access. Higher tiers unlock dedicated host services and escalating promotional offers.</p>

  <h2>6. Black Bear Casino Resort — 2.5 Hours from Minneapolis</h2>
  <p><strong>Distance:</strong> ~150 miles north of Minneapolis (2.5 hrs via I-35 N to Carlton)<br>
  <strong>Location:</strong> Carlton, MN</p>
  <p>Black Bear Casino Resort is operated by the Fond du Lac Band of Lake Superior Chippewa and is one of the premier casino resorts in northern Minnesota. The facility features 2,000+ slot machines, dozens of table games, a full-service hotel, a convention center, an entertainment venue, and access to excellent nearby fishing and outdoor recreation. Its location near Duluth and the North Shore makes it a natural stop on any northern Minnesota road trip — and the casino quality easily justifies the drive on its own.</p>
  <p>The <strong>Black Bear Rewards</strong> program offers point-based benefits with tier escalation. Hotel rates are very reasonable, particularly midweek, making an overnight stay worth considering even for day-trippers who want to extend the experience.</p>

  <h2>Club M vs. Grand Rewards: Which Loyalty Program Wins?</h2>
  <p>For Twin Cities casino regulars, the two programs worth taking seriously are <strong>Club M</strong> (Mystic Lake) and <strong>Grand Rewards</strong> (Grand Casino Hinckley + Mille Lacs). Here's the practical comparison:</p>
  <ul>
    <li><strong>Club M</strong> wins on volume: Mystic Lake is so large, so active, and runs so many promotions that regular players accumulate points faster. The entertainment access perk (priority concert tickets) is genuinely valuable given the caliber of acts that play Mystic Lake Center.</li>
    <li><strong>Grand Rewards</strong> wins on resort value: The hotel and resort amenities at Hinckley (waterpark, multiple lodging options, outdoor activities) make points more redeemable in ways that feel like real vacation perks rather than just free play credits.</li>
    <li><strong>Bottom line:</strong> Get both cards. There's no reason to choose — they're not competing programs, and you'll spend time at both properties if you're a regular Minnesota casino player.</li>
  </ul>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Track live jackpots at Minnesota casinos</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/minnesota">All Minnesota casinos</a> · <a href="/casino/448/mystic-lake-casino-hotel">Mystic Lake jackpot tracker</a> · <a href="/best-midwest-casinos">Best Midwest casinos</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/vegas-locals-casinos-guide ─────────────────────────────────────
  app.get('/blog/vegas-locals-casinos-guide', (req, res) => {
    const slug = 'vegas-locals-casinos-guide';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Las Vegas Locals Casinos</p>
    <h1>${post.title}</h1>
    <div class="meta">Updated March 2026 · 10 min read</div>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Las Vegas residents have a secret: they almost never gamble on the Strip. The Strip is a theme park designed for people who visit once every few years and don't know any better. Vegas locals — the 2.2 million people who actually live in Clark County — have a completely different circuit of casinos they prefer. Better odds, lower minimums, free parking, friendlier staff, and loyalty programs that actually reward consistent play. Here's the insider guide to <strong>Las Vegas locals casinos</strong>.</p>

  <h2>Why Locals Avoid the Strip</h2>
  <p>Strip casinos are optimized for tourists: maximum revenue per visitor, short stays, and high house edges. The slot payback percentages on the Strip are measurably lower than at locals casinos. Blackjack minimums are higher (often $25–$50 at major Strip properties). Parking costs $15–$30. Drinks are slower and sometimes require actual purchase. The atmosphere is designed to disorient you — no clocks, no windows, deliberately complex layouts to keep you on the floor longer.</p>
  <p>Locals casinos operate on a different model. Their customers come back weekly, or daily. They have to earn repeat business, which means better game conditions, better odds, faster service, and perks that make regulars feel valued. The difference is noticeable from the moment you walk in.</p>

  <h2>Station Casinos — The Locals Casino Empire</h2>
  <p>Station Casinos is the dominant locals casino operator in Las Vegas, with 9+ properties scattered across the valley. Their casinos are consistently rated among the best locals options in the city. Each Station property has the same core features: good slot selection, multiple dining options (usually 4–6 restaurants per property), a movie theater or entertainment venue, bowling, and a robust bingo program. Here are the best:</p>

  <h3>Red Rock Casino Resort & Spa</h3>
  <p><strong>Location:</strong> Summerlin (west side), 1011 W. Charleston Blvd<br>
  Red Rock is the crown jewel of the Station Casinos portfolio — a genuine resort-quality property that would hold its own on the Strip in terms of amenities, but operates with a locals-first mentality. The casino floor is spacious and well-appointed, the dining lineup is excellent (including T-Bones Chophouse, Yard House, and multiple casual options), the spa is world-class, and the hotel has 796 rooms. The proximity to Red Rock Canyon National Conservation Area makes it a natural base for visitors who want outdoor recreation along with their gaming. Table minimums are typically $10–$15, far lower than comparable Strip properties.</p>

  <h3>Green Valley Ranch Resort, Spa & Casino</h3>
  <p><strong>Location:</strong> Henderson (southeast side), 2300 Paseo Verde Pkwy<br>
  Green Valley Ranch is the locals casino of choice for Henderson residents and a consistent favorite among Vegas insiders. The resort has a Mediterranean design aesthetic that's genuinely beautiful, an excellent pool complex (the best pool of any locals casino in the valley), 490 hotel rooms, and a superb dining lineup anchored by Hank's Fine Steaks. The casino floor is clean, well-maintained, and never feels overcrowded. Green Valley Ranch was consistently named the best locals casino in Las Vegas by Nevada gaming publications for years.</p>

  <div style="margin:24px 0;padding:16px 20px;background:#fff5e6;border-left:4px solid #e8a020;border-radius:0 8px 8px 0;">
    <strong>🏨 Staying in Las Vegas?</strong> Find the best rates at Strip and off-Strip hotels.<br>
    <a href="https://www.tkqlhce.com/click-101711107-12873028" target="_blank" rel="noopener sponsored" style="color:#5c7aaa;">Find Las Vegas hotel deals on Hotels.com →</a>
    <img src="https://www.ftjcfx.com/image-101711107-12873028" width="1" height="1" border="0"/>
  </div>

  <h3>Boulder Station Hotel & Casino</h3>
  <p><strong>Location:</strong> Boulder Strip (east side), 4111 Boulder Hwy<br>
  Boulder Station serves the east Las Vegas and Henderson market and is one of the more affordable Station properties. The casino features 1,000+ slots, table games, a poker room, and the standard Station Casinos dining package. It's a no-frills, value-driven property — not flashy, but reliable. The east side location makes it convenient for visitors staying in the Green Valley or Boulder City area.</p>

  <h3>Palace Station Hotel & Casino</h3>
  <p><strong>Location:</strong> Near the Strip (west side), 2411 W. Sahara Ave<br>
  Palace Station is one of the most strategically located locals casinos in Vegas — just a few minutes off the Strip, which makes it accessible to tourists who know about it while still serving the local west-side population. It underwent a major renovation in recent years and now features a modern casino floor, updated hotel rooms, and the excellent Charcoal Room steakhouse. Highly recommended for visitors who want Strip proximity with locals-casino economics.</p>

  <h3>Sunset Station Hotel & Casino</h3>
  <p><strong>Location:</strong> Henderson, 1301 W. Sunset Rd<br>
  Sunset Station is one of the most popular Station properties among Henderson residents. The Mediterranean-themed casino features 2,500+ slot machines, a full table games section, an 11-screen movie theater (a rare amenity at any casino), a Kids Quest childcare center (for parents who want to game while children are supervised), and a solid restaurant lineup. The outdoor entertainment area hosts live music events throughout the year.</p>

  ${legendzBanner('NV')}

  <h2>Boyd Gaming Locals Casinos</h2>
  <p>Boyd Gaming is Station's main competitor in the locals market, with several strong properties across the valley.</p>

  <h3>Gold Coast Hotel & Casino</h3>
  <p><strong>Location:</strong> West of the Strip, 4000 W. Flamingo Rd<br>
  Gold Coast is one of the oldest locals casinos in Las Vegas and a genuine institution. It's located just minutes from the Strip on Flamingo Road, making it accessible to informed tourists. The casino features 1,500+ slots, table games, a bingo hall, a bowling center, and a movie theater. Gold Coast has a loyal senior clientele and is known for its extremely low table minimums — $3 blackjack is sometimes available during off-peak hours. The video poker selection is outstanding, with some of the best pay tables in the valley.</p>

  <h3>The Orleans Hotel & Casino</h3>
  <p><strong>Location:</strong> West side, 4500 W. Tropicana Ave<br>
  The Orleans is a massive locals casino with 1,800 rooms, a 70-lane bowling center (one of the largest in Nevada), a movie theater, arena-size event space, and a solid gaming floor. The New Orleans theme is carried through the dining and design. It's one of the best-value hotel options in Las Vegas — room rates are frequently under $60/night, and the casino comps are generous for regular players.</p>

  <h3>South Point Hotel, Casino & Spa</h3>
  <p><strong>Location:</strong> South Las Vegas Blvd (far south), 9777 Las Vegas Blvd S<br>
  South Point is one of the most complete locals casino resorts in Las Vegas. It features 2,200 rooms, a 16-screen movie theater, a 64-lane bowling center, a 4,400-seat showroom, an equestrian arena, and a casino floor with excellent slot and table game selection. South Point is consistently cited for having some of the best video poker pay tables in the valley — a major draw for serious players. Its location far south on the Strip corridor means it sees less tourist traffic than properties like Palace Station.</p>

  <h2>The Boarding Pass — Station Casinos Loyalty Program</h2>
  <p>All Station Casinos properties (Red Rock, Green Valley Ranch, Boulder Station, Palace Station, Sunset Station, and others) participate in the <strong>Boarding Pass</strong> loyalty program — one of the best locals casino rewards programs in Las Vegas.</p>
  <p>Members earn tier credits and reward credits on all slot and table play. Tier credits determine your status (Club, Boarding Pass, Gold Key, Chairman) and unlock benefits like free hotel stays, concert tickets, dining discounts, and dedicated host services. Reward credits convert to free play at a standard rate, with bonus multiplier events running regularly throughout the year.</p>
  <p>The Boarding Pass also has a useful feature for visitors who split time between Vegas and elsewhere: points accumulate quickly at busy properties like Red Rock and Green Valley Ranch, and benefits transfer seamlessly across all Station properties. For someone visiting Vegas a few times a year, a single week of moderate play at Red Rock can push you into Gold Key tier — a meaningful status upgrade with real perks.</p>
  <p>Boyd Gaming properties (Gold Coast, The Orleans, South Point) use the <strong>B Connected</strong> program with similar tier-based structure and benefits.</p>

  <h2>Tips for Visiting Las Vegas Locals Casinos</h2>
  <ul>
    <li><strong>Ask about new player bonuses.</strong> Most locals casinos offer $20–$50 in free play for signing up for their loyalty card. Do this at every property you visit.</li>
    <li><strong>Seek out full-pay video poker.</strong> Locals casinos — especially Gold Coast, South Point, and Station properties — are known for offering 9/6 Jacks or Better and similar full-pay tables that are nearly extinct on the Strip.</li>
    <li><strong>Check for promotional days.</strong> Most Station and Boyd properties run 2x–4x points promotions on weekday mornings and midweek evenings. Call ahead or check the casino app.</li>
    <li><strong>Use free parking without guilt.</strong> All locals casinos offer free parking. On the Strip, you'll pay $15–$30. That difference funds several extra hands of blackjack.</li>
    <li><strong>Table minimums are lower.</strong> $10 blackjack is standard at most locals casinos, and $5 tables appear during off-peak hours. Plan accordingly.</li>
  </ul>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Find jackpots and casino data for Nevada properties</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/nevada">All Nevada casinos</a> · <a href="/highest-payout-casinos">Highest payout casinos</a> · <a href="/biggest-jackpots">Recent big jackpots</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/casino-loyalty-programs-midwest ────────────────────────────────
  app.get('/blog/casino-loyalty-programs-midwest', (req, res) => {
    const slug = 'casino-loyalty-programs-midwest';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Casino Loyalty Programs</p>
    <h1>${post.title}</h1>
    <div class="meta">Updated March 2026 · 10 min read</div>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>If you're a Midwest casino player, your loyalty card is worth real money — but only if you know which programs deliver the best value and how to maximize them. The Midwest has a mix of tribal casino programs, national commercial chains, and regional operators, each with different earning rates, redemption options, and tier benefits. Here's a comprehensive ranking of the <strong>best casino loyalty programs in the Midwest</strong> for 2026.</p>

  <h2>1. Club M — Mystic Lake Casino Hotel (Prior Lake, MN)</h2>
  <p><strong>Rating: ⭐⭐⭐⭐⭐</strong><br>
  <strong>Network:</strong> Standalone (Mystic Lake / Little Six Casino only)<br>
  <strong>Best for:</strong> Minnesota players, high-volume slot players, entertainment fans</p>
  <p>Club M is the gold standard of Midwest casino loyalty programs. Operated by the Shakopee Mdewakanton Sioux Community at Mystic Lake — the largest casino in the Upper Midwest — Club M benefits from the sheer volume of play the property generates. The program runs three tiers: Club M (base), Mysticash (mid), and Diamond (top). At every level, members earn Mysticash points redeemable for free play, dining, hotel stays, and merchandise at the resort.</p>
  <p>What sets Club M apart is its entertainment access perk. Mystic Lake Center and the outdoor amphitheater host major national acts year-round, and Diamond-tier members get priority access to tickets before they sell out to the public. For anyone who attends concerts regularly, this alone can justify the play needed to reach Diamond.</p>
  <p><strong>How to maximize Club M:</strong> Play during promotional multiplier events (typically Tuesday-Thursday mornings), book hotel through the resort to earn extra points, and take advantage of the birthday free-play offer. New members should sign up before their first dollar is played — the welcome offer is typically worth $20–$50 in free play.</p>
  <p>👉 <a href="/casinos/minnesota">View Minnesota casinos on FindJackpots</a></p>

  ${legendzBanner('MN')}

  <h2>2. mychoice — Penn Entertainment (Hollywood Casinos, Ameristar, others)</h2>
  <p><strong>Rating: ⭐⭐⭐⭐</strong><br>
  <strong>Network:</strong> National (Penn Entertainment, 40+ properties)<br>
  <strong>Best for:</strong> Illinois, Indiana, Iowa, and Missouri players; multi-state travelers</p>
  <p>mychoice is Penn Entertainment's loyalty program, covering all Hollywood Casino and Ameristar properties. In the Midwest, that includes Hollywood Casino Joliet (IL), Hollywood Casino Aurora (IL), Hollywood Casino Lawrenceburg (IN), Ameristar Casino Council Bluffs (IA), Ameristar Casino St. Charles (MO), and many more. The program's biggest strength is its <strong>national network breadth</strong> — earn points in Illinois and redeem them in Missouri, Indiana, or even at Penn properties in Pennsylvania, Ohio, or Mississippi.</p>
  <p>The program runs five tiers: Base, preferred, Preferred Plus, VIP, and the invite-only ICON. Tier benefits include free play credits, hotel discounts, dining credits, priority check-in, and escalating promotional multipliers. The earning rate is competitive with other commercial casino programs, and the cross-property flexibility is genuinely useful for players who travel for gambling.</p>
  <p><strong>How to maximize mychoice:</strong> Consolidate all Penn property play into one account to build tier status faster. Look for promotional bonus-points weekends, which are heavily advertised through the mychoice app and email list. If you have Preferred Plus or above, negotiating free or reduced hotel stays is easier than at most programs.</p>
  <p>👉 <a href="/casinos/illinois">View Illinois casinos on FindJackpots</a></p>

  <h2>3. Rush Rewards — Rush Street Gaming (Rivers Casino Des Plaines, Rivers Casino Pittsburgh, etc.)</h2>
  <p><strong>Rating: ⭐⭐⭐⭐</strong><br>
  <strong>Network:</strong> Regional (Rush Street Gaming, 8 properties)<br>
  <strong>Best for:</strong> Chicago-area players, Rivers Des Plaines regulars</p>
  <p>Rush Rewards is the loyalty program for Rush Street Gaming properties, most notably <strong>Rivers Casino Des Plaines</strong> (the highest-grossing casino in Illinois) and Rivers Casino Pittsburgh. The program is well-regarded among Chicago-area regulars: it's straightforward, the points accumulate at a competitive rate, and Rivers Des Plaines runs enough promotional events throughout the year that active players can rack up significant free play credits.</p>
  <p>The program runs four tiers — Rush Rewards, Gold, Platinum, and Elite — with escalating benefits including concert and event priority, hotel discounts, and dedicated host access at the Platinum/Elite levels. Rush Rewards is a smaller network than mychoice or Caesars Rewards, but the depth of benefits at Rivers Des Plaines specifically is strong for the Chicago market.</p>
  <p><strong>How to maximize Rush Rewards:</strong> Focus play at Rivers Des Plaines (the highest-volume property in the network, which means the most promotional activity). Birthday free play, seasonal promotions, and midweek multiplier days are the primary ways to accelerate point accrual.</p>

  <h2>4. Caesars Rewards — Caesars Entertainment (Horseshoe Hammond, Horseshoe Council Bluffs, others)</h2>
  <p><strong>Rating: ⭐⭐⭐⭐</strong><br>
  <strong>Network:</strong> National (Caesars Entertainment, 50+ properties including Caesars Palace Las Vegas)<br>
  <strong>Best for:</strong> Indiana players, multi-state travelers, Las Vegas visitors</p>
  <p>Caesars Rewards is the most nationally powerful loyalty program in the casino industry. In the Midwest, the flagship property is <strong>Horseshoe Hammond</strong> — the closest major casino to downtown Chicago — along with Horseshoe Council Bluffs (IA), Harrah's properties in Iowa, Indiana, and Missouri, and Caesars Southern Indiana. Play at any of these earns tier credits and reward credits usable at Caesars Palace, Paris Las Vegas, Bally's, or any of the 50+ Caesars properties nationwide.</p>
  <p>Caesars Rewards runs four tiers: Gold, Platinum, Diamond, and Diamond Plus/Elite. Diamond is the aspirational tier for regular players: it unlocks airport lounge access, resort fee waivers at Las Vegas properties, priority check-in, and the ability to earn status matches to Wyndham and other hotel programs. For Midwest players who also visit Las Vegas, Caesars Rewards is the most strategically valuable program — it bridges your local and Vegas play into a single status account.</p>
  <p><strong>How to maximize Caesars Rewards:</strong> Focus play at Horseshoe Hammond or the Iowa Harrah's/Horseshoe properties to build Midwest volume. Any Platinum or Diamond status you earn applies in Las Vegas, where the perks (free parking, resort fee waivers, show access) deliver outsized value relative to what you spent to earn them.</p>

  <h2>5. Grand Rewards — Grand Casino (Hinckley and Mille Lacs, MN)</h2>
  <p><strong>Rating: ⭐⭐⭐</strong><br>
  <strong>Network:</strong> Standalone (Grand Casino Hinckley + Grand Casino Mille Lacs)<br>
  <strong>Best for:</strong> Northern Minnesota players, resort visitors, Twin Cities day-trippers</p>
  <p>Grand Rewards is the loyalty program for both Grand Casino Hinckley and Grand Casino Mille Lacs, operated by the Mille Lacs Band of Ojibwe. It's a solid standalone program — not as large as Club M, but meaningful for players who visit the Hinckley corridor regularly. Points accrue on all slot and table play and redeem for free play, dining, hotel stays, and resort amenities (including the indoor waterpark at Hinckley). The hotel and resort offerings at Grand Casino Hinckley are among the best in the Midwest tribal casino circuit, making points feel more like real vacation currency than just free spins.</p>
  <p><strong>How to maximize Grand Rewards:</strong> Earn points at Hinckley (the larger property) and redeem for overnight stays, which represent excellent value per point. Look for seasonal promotional events, particularly around summer travel season and major holidays.</p>
  <p>👉 <a href="/casinos/minnesota">View Minnesota casinos on FindJackpots</a></p>

  <h2>Bonus: Boarding Pass — Station Casinos (Las Vegas locals)</h2>
  <p><strong>Rating: ⭐⭐⭐⭐⭐</strong> (for Las Vegas visitors)<br>
  <strong>Network:</strong> Station Casinos (9 Las Vegas locals properties)<br>
  <strong>Best for:</strong> Midwest players who also visit Las Vegas</p>
  <p>If you're a Midwest casino regular who also makes trips to Las Vegas, the Boarding Pass program from Station Casinos is worth knowing about. It covers Red Rock Casino, Green Valley Ranch, Boulder Station, Palace Station, Sunset Station, and other properties — the best locals casino network in the valley. Points accumulate quickly because locals casino volume is high and promotions are frequent. Status earned at Station properties unlocks some of the best perks available at Las Vegas locals casinos: free hotel rooms, dining credits, concert access, and more.</p>
  <p>The Boarding Pass isn't a Midwest program, but any Midwest player doing a Las Vegas trip should sign up and focus their Vegas play at a Station property rather than a Strip casino. The value difference is substantial.</p>

  <h2>The Bottom Line: Which Midwest Casino Loyalty Card Should You Get?</h2>
  <ul>
    <li><strong>Minnesota player:</strong> Club M is essential. Add Grand Rewards if you visit Hinckley.</li>
    <li><strong>Illinois/Chicago player:</strong> Rush Rewards for Rivers Des Plaines regulars. mychoice if you play multiple Penn properties. Caesars Rewards if you also visit Horseshoe Hammond.</li>
    <li><strong>Multi-state Midwest traveler:</strong> mychoice (Penn) for network breadth. Caesars Rewards for Las Vegas crossover value.</li>
    <li><strong>Serious player who visits Las Vegas:</strong> Caesars Rewards. Nothing else comes close for overall national value.</li>
  </ul>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Compare jackpot activity at Midwest casinos</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/casinos/minnesota">Minnesota casinos</a> · <a href="/casinos/illinois">Illinois casinos</a> · <a href="/best-midwest-casinos">Best Midwest casinos</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

  // ── /blog/slot-machine-tips-beginners ────────────────────────────────────
  app.get('/blog/slot-machine-tips-beginners', (req, res) => {
    const slug = 'slot-machine-tips-beginners';
    const post = BLOG_POSTS.find(p => p.slug === slug);
    const canonical = `https://findjackpots.com/blog/${slug}`;

    const html = `${blogHead({ title: post.title, description: post.excerpt, canonical, datePublished: post.date, slug })}
<body>
${siteHeader()}
<div class="blog-hero">
  <div class="container">
    <p class="breadcrumb"><a href="/blog">Blog</a> › Slot Strategy</p>
    <h1>${post.title}</h1>
    <div class="meta">Updated March 2026 · 10 min read</div>
  </div>
</div>
<div class="article-body">
  <a class="back-link" href="/blog">← Back to Blog</a>

  <p>Slots are the most popular casino game in the world — and also the most misunderstood. There's a mountain of bad advice out there, from "lucky machines" to "hot and cold streaks" to elaborate betting systems that don't work. This guide cuts through the noise. Here's what's actually true about how slot machines work, and the practical steps you can take to get the most out of your casino time.</p>

  <h2>How Slot Machines Actually Work (RNG Explained)</h2>
  <p>Every modern slot machine runs on a <strong>Random Number Generator</strong> (RNG) — a computer chip that generates thousands of random numbers per second, even when no one is playing. When you press the spin button, the machine uses the number generated at that exact millisecond to determine the outcome. The reels spinning on screen are theater. The result was determined the instant you hit spin.</p>
  <p>This has two important implications:</p>
  <ul>
    <li><strong>There is no such thing as a "hot" or "cold" machine.</strong> A slot that just paid a jackpot has exactly the same odds on the next spin as before the jackpot. A machine that hasn't paid in hours isn't "due" for a win. Each spin is independent. The RNG has no memory.</li>
    <li><strong>Timing doesn't matter.</strong> Playing faster, slower, at certain times of day, or after someone else just left — none of it changes your odds. The RNG runs continuously regardless.</li>
  </ul>
  <p>What does matter is the machine's programmed <strong>payback percentage</strong> (also called RTP — Return to Player). This is the percentage of all money wagered that the machine returns to players over time, typically over millions of spins. A machine with 94% RTP returns $94 for every $100 wagered — the house keeps $6. This is a statistical average, not a guarantee per session. In any short session, you can win big or lose everything. Over enough spins, the house edge always manifests.</p>

  <h2>Denomination Matters: Dollar Slots Pay Better</h2>
  <p>One of the most actionable, data-backed tips in slot play: <strong>higher denomination machines have higher payback percentages</strong>. This is consistently documented in states (like Iowa, Nevada, and New Jersey) that require casinos to publish payout data by denomination.</p>
  <p>Typical payback ranges by denomination:</p>
  <ul>
    <li><strong>Penny slots:</strong> 88–92% RTP</li>
    <li><strong>Quarter slots:</strong> 92–95% RTP</li>
    <li><strong>Dollar slots:</strong> 94–97% RTP</li>
    <li><strong>$5 slots:</strong> 96–98% RTP</li>
  </ul>
  <p>The math is important here. A 92% machine costs you $8 per $100 wagered. A 96% machine costs you $4 per $100 wagered — half the theoretical loss rate. On a session where you cycle through $500 in bets, that's a $20 difference in expected loss just from denomination choice.</p>
  <p>The practical advice: <strong>play fewer lines at higher denominations rather than many lines at penny denomination.</strong> Betting max lines on a penny machine can cost more per hour than a single-line dollar machine, at worse odds.</p>

  ${legendzBanner(null)}

  <h2>Volatility: High vs. Low Variance Slots</h2>
  <p>Volatility (also called variance) describes the risk profile of a slot machine — how often it pays and how big those pays are.</p>
  <ul>
    <li><strong>Low volatility slots</strong> pay frequently but in small amounts. Your bankroll stays relatively stable with lots of small wins. Good for players with smaller budgets who want extended play time.</li>
    <li><strong>High volatility slots</strong> pay infrequently but with potentially large wins. Long dry spells are normal and expected — but the wins when they hit can be significant. Requires a larger bankroll to weather the variance.</li>
    <li><strong>Medium volatility</strong> falls in between — a balance of frequency and size.</li>
  </ul>
  <p>Machines don't always advertise their volatility, but you can infer it from the paytable: a machine with a massive jackpot relative to its minimum bet is high volatility. A machine with many small-to-medium pays scattered throughout the table is lower volatility. Progressive jackpot machines are the ultimate high-variance bet.</p>

  <h2>Your Loyalty Card Works on Slots — Always Use It</h2>
  <p>This is the single most underutilized piece of advice in all of slot play: <strong>insert your players club card before every spin</strong>. The card does not affect your odds. The machine's RNG doesn't care whether a card is inserted. You are literally leaving free money on the table by not using it.</p>
  <p>For every dollar you run through a slot machine with your loyalty card inserted, you earn points. Those points become free play, dining credits, hotel discounts, and promotional offers. On a session where you cycle through $300 in bets, a typical program might return $3–$10 in comps — which meaningfully reduces your effective hourly cost to play.</p>
  <p>Additionally, most casinos track your play for promotional drawings, mail offers, and discretionary comps (free rooms, food). None of this happens if you don't have a card in the machine. Sign up at every casino's players club desk. It's free, it takes 5 minutes, and there's often a welcome bonus ($10–$25 free play) just for signing up.</p>
  <p>👉 See our <a href="/blog/casino-loyalty-programs-midwest">guide to the best Midwest casino loyalty programs</a> for a full breakdown.</p>

  <h2>Progressive Jackpots: The Pros and Cons</h2>
  <p>Progressive jackpot slots pool a percentage of every bet from every machine in the network (local or wide-area) into a growing jackpot. This is how life-changing, seven-figure wins happen. Here's the honest breakdown:</p>
  <p><strong>Pros:</strong></p>
  <ul>
    <li>The jackpot can be genuinely huge — regional progressives reach $50K–$200K; wide-area progressives (like Megabucks) regularly exceed $10 million.</li>
    <li>Someone has to win. Every progressive jackpot eventually pays out.</li>
    <li>The excitement and potential for a life-changing hit is real.</li>
  </ul>
  <p><strong>Cons:</strong></p>
  <ul>
    <li>Progressive machines have <strong>lower base game RTP</strong> than comparable non-progressive machines. The money to build the jackpot comes from somewhere — it comes from lower payback on all the non-jackpot spins.</li>
    <li>Odds of hitting a major progressive are tiny. Megabucks odds have been estimated at roughly 1 in 50 million per spin. You can play for years and never come close.</li>
    <li>You must usually bet maximum coins/credits to qualify for the jackpot. Playing below max bet on a progressive machine means you're taking the worst of both worlds: low RTP without jackpot eligibility.</li>
  </ul>
  <p><strong>Bottom line on progressives:</strong> Play them if the jackpot thrill is what you're buying. Play max bet or don't play at all. Budget separately from your regular session play — think of a progressive spin as buying a lottery ticket, not playing a regular slot.</p>
  <p>👉 <a href="/casino-jackpot-tracker">Track live progressive jackpot sizes on FindJackpots →</a></p>

  <h2>Finding Looser Machines: What Published Data Can Tell You</h2>
  <p>In several states, commercial (non-tribal) casinos are required to publish slot machine payout data. Here's what's available:</p>
  <ul>
    <li><strong>Iowa:</strong> The Iowa Racing and Gaming Commission publishes monthly payout reports by casino and denomination. This is the most detailed public slot data in the Midwest.</li>
    <li><strong>Nevada:</strong> The Nevada Gaming Control Board publishes quarterly reports by geographic area (Strip, Downtown, Boulder Strip, etc.), broken down by denomination.</li>
    <li><strong>New Jersey:</strong> Atlantic City casinos report detailed monthly payout data.</li>
    <li><strong>Indiana, Illinois, Missouri:</strong> Commercial casinos report payout data; check the state gaming board website.</li>
  </ul>
  <p>Tribal casinos are not subject to state gaming regulations and typically don't publish payback data. For tribal properties, your best proxy is jackpot activity — casinos with more frequent, larger jackpots are generally seeing more active, higher-volume play. Use <a href="/highest-payout-casinos">FindJackpots' highest payout casino tracker</a> and <a href="/biggest-jackpots">biggest jackpots page</a> to compare activity across properties.</p>

  <h2>When to Walk Away</h2>
  <p>This is the most psychologically challenging part of slot play. Slots are designed to be compelling — variable reward schedules, near-miss experiences, and the relentless hope of a big win are all engineered into the product. A few practical frameworks:</p>
  <ul>
    <li><strong>Set a loss limit before you start.</strong> Decide your maximum loss for the session before you sit down. When you hit it, leave. This is non-negotiable.</li>
    <li><strong>Set a win goal.</strong> If you double your buy-in, consider cashing out half and playing with the other half. Lock in the win. Don't give it all back.</li>
    <li><strong>Time limits work.</strong> Set a timer. When it goes off, evaluate. You'll make clearer decisions about whether to continue when you're operating on a schedule rather than in the flow state of continuous play.</li>
    <li><strong>Don't chase losses.</strong> The worst session decisions happen when you've lost your planned budget and decide to reload. If the session didn't go your way, accept it. Come back another day.</li>
  </ul>

  <div style="margin-top:40px;padding:28px;background:#f0f4f9;border-radius:12px;text-align:center;">
    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#1a1a2e;">Find the highest-paying casinos near you</p>
    <a href="https://findjackpots.com" style="display:inline-block;background:#5c7aaa;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;">Open FindJackpots →</a>
  </div>

  <p style="margin-top:16px;">Also see: <a href="/highest-payout-casinos">Highest payout casinos</a> · <a href="/casino-jackpot-tracker">Live jackpot tracker</a> · <a href="/biggest-jackpots">Biggest recent jackpots</a></p>

  <p style="margin-top:32px;"><a class="back-link" href="/blog">← Back to Blog</a></p>
</div>
${siteFooter()}
</body>
</html>`;
    res.send(html);
  });

};
