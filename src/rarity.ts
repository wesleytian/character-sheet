/**
 * How rare an accomplishment is, used to rank what belongs on the card.
 *
 * Every rule carries a head-count — roughly how many living US adults have
 * done the thing — divided by ADULTS. That is deliberate: a bare "1 in 2,000"
 * hides its own arithmetic, and the first version of this file claimed exactly
 * that for Y Combinator, which would have meant millions of YC founders
 * walking around against the few thousand who exist. A head-count you can
 * sanity check beats a percentage you cannot.
 *
 * The counts are order-of-magnitude estimates, not citations. They are here to
 * order a list, not to report a statistic.
 */
export interface Rarity {
  share: number;
  basis: string;
  /** Years of dedicated effort, the difficulty estimate. */
  years?: number;
  /** What stands in the way: being chosen, paying for access, or just paying. */
  gate?: 'luck' | 'access' | 'bought';
  /** 0 niche, 1 recognised, 2 a stranger is impressed. */
  fame?: 0 | 1 | 2;
  /** 1-3, how much it changes anything beyond your own life. */
  impact?: 1 | 2 | 3;
  /** Which rule matched, so two names for one achievement can be spotted. */
  rule?: string;
  /** Living US adults who have done it, when the rule counts heads. */
  people?: number;
}

/**
 * US adults, the denominator for every head-count below.
 *
 * Against all 5.5 billion adults alive these numbers were misleading in one
 * direction: most of them are compared against billions of people who will
 * never have a chance at a PADI certification or a marathon entry, which made
 * everything look rarer than it is. Americans is the honest comparison group
 * for this sheet - and it is the group most of these things are counted in.
 */
const ADULTS = 262e6;

interface Rule {
  re: RegExp;
  /** Years of dedicated effort for someone who commits to it. */
  years?: number;
  /** What stands in the way: being chosen, paying for access, or just paying. */
  gate?: 'luck' | 'access' | 'bought';
  /** 0 niche, 1 recognised, 2 a stranger is impressed. */
  fame?: 0 | 1 | 2;
  /** 1-3, how much it changes anything beyond your own life. */
  impact?: 1 | 2 | 3;
  /** Living adults who have done it. */
  people?: number;
  /** Or, for things measured as a proportion rather than counted. */
  share?: number;
  basis: string;
}

const RULES: Rule[] = [
  // ---- mountains -------------------------------------------------------
  { years: 10, gate: 'access', fame: 2, re: /seven summits/i, people: 150, basis: 'roughly 150 Americans have completed all seven' },
  { years: 5, gate: 'access', fame: 2, re: /everest(?! ?base ?camp)/i, people: 800, basis: 'about 800 Americans have summited Everest' },
  { years: 2, gate: 'access', fame: 1, re: /denali|vinson|aconcagua|elbrus|puncak|carstensz/i, people: 30_000,
    basis: 'the other six summits, taken together, run to tens of thousands of Americans' },
  { years: 0.3, gate: 'access', fame: 2, re: /kilimanjaro/i, people: 250_000, basis: 'Americans are a large share of the 35,000 who climb it a year' },
  { years: 6, gate: 'access', fame: 2, re: /8000m|eight.?thousander|k2\b|annapurna/i, people: 1_500,
    basis: 'very few Americans have stood on an 8,000m peak' },
  { years: 0.2, gate: 'access', fame: 2, re: /everest base camp|base camp trek/i, people: 150_000,
    basis: 'the trek is far more common than the summit' },

  // ---- endurance -------------------------------------------------------
  // Both halves of this needed running context: a bare "100k" scored "$100K
  // revenue run rate" as an ultra, and a bare "ultra" scored a ticket to the
  // Ultra music festival as one.
  { years: 3, fame: 2, re: /ultra ?marathon|ultra ?running|\bultra (race|run|distance)\b|\b100 ?miler\b|\b(50|100) ?(k|km) (race|run|ultra)\b/i,
    people: 600_000, basis: 'ultra finishers are a few percent of marathoners' },
  { years: 6, gate: 'access', fame: 1, re: /six (world )?marathon majors|six star/i, people: 8_000,
    basis: 'about 8,000 Americans hold the Six Star medal' },
  { years: 1.5, fame: 2, re: /ironman|140\.6/i, people: 300_000, basis: 'roughly 300,000 living Americans have finished a full Ironman' },
  { years: 0.8, fame: 1, re: /half ironman|70\.3/i, people: 800_000, basis: 'a few times the full-distance field' },
  { years: 5, fame: 1, re: /sub-?3|sub 3 ?hour/i, people: 200_000, basis: 'a sub-3 marathon is about 3% of finishers' },
  { years: 0.4, re: /half marathon|13\.1/i, people: 8_000_000, basis: 'several times the full-marathon field' },
  // The rarest matching rule wins, so the full-distance rule has to exclude
  // the half explicitly or every half marathon scores as a full one.
  { years: 0.8, fame: 2, re: /(?<!half )marathon/i, people: 3_000_000, basis: 'a bit over 1% of US adults have finished a marathon' },
  { years: 0.4, fame: 1, re: /triathlon/i, people: 4_000_000, basis: 'sprint and Olympic distances are broad' },

  // ---- water and air ---------------------------------------------------
  { years: 2, fame: 1, re: /free ?div/i, people: 120_000, basis: 'a niche inside a niche' },
  { years: 2, gate: 'access', fame: 1, re: /divemaster|dive master/i, people: 60_000, basis: 'a professional grade; most divers stop long before' },
  { years: 1, gate: 'access', re: /rescue diver/i, people: 400_000, basis: 'three certifications past entry level' },
  { years: 0.05, gate: 'access', re: /nitrox|enriched air/i, people: 1_200_000, basis: 'the most common specialty after open water' },
  { years: 0.1, gate: 'access', re: /advanced open water/i, people: 2_500_000, basis: 'most certified divers never go past it' },
  { years: 0.1, gate: 'access', re: /open water|scuba/i, people: 10_000_000, basis: 'about 10 million certified American divers' },
  { years: 1, gate: 'access', fame: 2, re: /pilot|fly(ing)? licen[cs]e|ppl\b/i, people: 700_000, basis: 'roughly 700,000 FAA certificate holders' },
  { years: 0.02, gate: 'access', fame: 1, re: /skydiv|parachute/i, people: 8_000_000, basis: 'a tandem jump counts, and many have done one' },

  // ---- combat sports ---------------------------------------------------
  { years: 10, fame: 2, re: /black belt/i, people: 20_000, basis: 'roughly 20,000 American BJJ black belts' },
  { years: 7, fame: 1, re: /brown belt/i, people: 40_000, basis: 'one rung below black' },
  { years: 4, fame: 1, re: /purple belt/i, people: 100_000, basis: 'most who start quit before purple' },
  { years: 2, fame: 1, re: /blue belt/i, people: 400_000, basis: 'roughly one in ten who start BJJ reach blue' },
  { years: 1.5, re: /amateur fight|smoker|fight camp|boxing match|compete[d]? in/i, people: 500_000,
    basis: 'very few people ever compete in a combat sport' },

  // ---- building --------------------------------------------------------
  { years: 12, gate: 'luck', impact: 3, fame: 2, re: /\$?1 ?b(n|illion)? (arr|revenue|run ?rate)/i, people: 2_000,
    basis: 'about a thousand US companies have ever reached $1B in revenue' },
  { years: 8, gate: 'luck', impact: 3, fame: 2, re: /unicorn|\$?1 ?b(n|illion)? valuation/i, people: 2_500,
    basis: 'roughly 1,200 US unicorns, so a couple of thousand founders' },
  { years: 10, gate: 'luck', impact: 3, fame: 2, re: /\bipo\b|take .*(company|it) public|took .* public|went public|go public/i, people: 8_000,
    basis: 'a few thousand living founders have taken a company public' },
  { years: 4, gate: 'luck', impact: 1, fame: 1, re: /sequoia|benchmark|founders fund|andreessen|a16z|greylock|accel|kleiner|top.?tier fund|top fund/i,
    people: 12_000, basis: 'the top handful of funds back a few dozen companies a year between them' },
  { years: 6, gate: 'luck', impact: 1, fame: 1, re: /raise .*\$?100 ?m|\$100 ?m round|series [d-f]\b/i, people: 6_000,
    basis: 'only a few hundred US companies raise nine figures a year' },
  { years: 3, gate: 'luck', fame: 1, re: /raise .*\$?(10|20|25|50) ?m|series b\b|series c\b/i, people: 60_000,
    basis: 'a Series B is roughly the top few percent of funded companies' },
  { years: 8, impact: 2, re: /team of (250|500|1000)|(250|500|1000)\+? (people|employees)|hire (250|500|1000)/i,
    people: 25_000, basis: 'very few founders ever run an organisation this size' },
  { years: 5, impact: 1, re: /team of (50|100)|(50|100)\+? (people|employees)|hire (50|100)\b/i,
    people: 200_000, basis: 'past fifty people you are running a company, not a project' },
  { years: 3, re: /team of 25|25\+? (people|employees)/i, people: 600_000,
    basis: 'most businesses never pass a couple of dozen staff' },
  { years: 3, gate: 'luck', re: /\bneo (scholar|fellow|accelerator|batch|cohort)\b|\bneo accelerator\b/i, people: 500,
    basis: 'Neo has taken only a few hundred founders and scholars in total' },
  { years: 3, gate: 'luck', fame: 1, re: /y ?combinator|\byc\b|yc ?[swf]\d{2}/i, people: 8_000,
    basis: 'YC has funded about 5,000 companies; most founders are US-based' },
  { years: 8, gate: 'luck', impact: 3, fame: 1, re: /\$?100 ?m(m|illion)? (arr|revenue|run ?rate)|100m arr/i, people: 15_000,
    basis: 'only around 15,000 US companies clear $100M in revenue' },
  { years: 5, impact: 2, re: /\$?(10|20|50) ?m(m|illion)? (arr|revenue|run ?rate)|10m arr/i, people: 150_000,
    basis: 'building a US company to eight-figure revenue' },
  { years: 5, gate: 'luck', impact: 2, fame: 1, re: /acqui(red|sition)|sold (the |my )?(company|startup|business)|exit(ed)?\b/i, people: 100_000,
    basis: 'most companies that get founded never get bought' },
  { years: 2, gate: 'luck', re: /raised|seed round|series [a-d]|venture.?backed|vc.?backed/i, people: 200_000,
    basis: 'a few thousand US companies raise venture money a year' },
  { years: 0.5, impact: 1, re: /founded|co-?founder|started a (company|startup)/i, people: 20_000_000,
    basis: 'many Americans own a business; almost none of it is funded' },

  // ---- wealth ----------------------------------------------------------
  // Net worth targets written as quests. The money rules elsewhere score a
  // figure you have; these score the work of getting there.
  { years: 25, gate: 'luck', impact: 3, fame: 2, re: /billionaire/i, people: 800,
    basis: 'about 800 American billionaires' },
  { years: 15, gate: 'luck', impact: 2, fame: 2, re: /\$?100 ?m(m|illion)? (liquid )?net worth/i, people: 12_000,
    basis: 'roughly 12,000 Americans are worth $100M+' },
  { years: 10, fame: 1, re: /\$?10 ?m(m|illion)? (liquid )?net worth/i, people: 1_500_000,
    basis: 'about 1.5 million US adults are worth $10M+' },
  { years: 8, re: /\$?5 ?m(m|illion)? (liquid )?net worth/i, people: 3_500_000,
    basis: 'about 3.5 million US adults are worth $5M+' },
  { years: 5, fame: 1, re: /\$?1 ?m(m|illion)? (liquid )?net worth/i, people: 22_000_000,
    basis: 'roughly 22 million American millionaires' },
  { years: 2, re: /\$?100 ?k (liquid )?net worth/i, people: 70_000_000,
    basis: 'a first serious savings milestone' },

  // ---- reach and users -------------------------------------------------
  { years: 6, gate: 'luck', impact: 3, re: /(10|25|50) ?m(m|illion)? users/i, people: 8_000,
    basis: 'very few products ever reach eight-figure user counts' },
  { years: 4, gate: 'luck', impact: 2, fame: 1, re: /(1|2|5) ?m(m|illion)? users/i, people: 40_000,
    basis: 'a million real users is a rare thing to build' },
  { years: 3, impact: 2, re: /\$?10 ?m(m|illion)? in gross revenue|gross revenue/i, people: 150_000,
    basis: 'cumulative eight-figure revenue' },
  { years: 2, impact: 1, re: /\$?1 ?m(m|illion)? (arr|revenue|run ?rate)/i, people: 800_000,
    basis: 'the first seven-figure year' },
  { years: 1, re: /\$?100 ?k (arr|revenue|run ?rate)|ramen profitable/i, people: 3_000_000,
    basis: 'the point a business feeds you' },

  // ---- investing -------------------------------------------------------
  { years: 8, gate: 'luck', impact: 2, fame: 1, re: /portfolio company valued at \$?1 ?b|portfolio.*\$1b/i,
    people: 15_000, basis: 'backing a company that reaches $1B is mostly luck and time' },
  { years: 5, gate: 'luck', impact: 1, re: /portfolio company valued at \$?100 ?m/i, people: 60_000,
    basis: 'a hundred-million outcome in a portfolio' },
  { years: 8, re: /invest in (50|100) startups/i, people: 20_000, basis: 'a career of angel investing' },
  { years: 4, re: /invest in (10|25) startups/i, people: 120_000, basis: 'a real angel portfolio' },
  { years: 3, gate: 'luck', fame: 1, re: /\blp\b in a (top|vc)|become an lp|limited partner/i, people: 300_000,
    basis: 'most funds are closed to new LPs' },
  { years: 2, gate: 'luck', fame: 1, re: /scout for a|become a scout/i, people: 20_000,
    basis: 'scout programmes are small and invitation-only' },
  { years: 2, fame: 1, re: /angel investor/i, people: 400_000, basis: 'roughly 400,000 active US angels' },

  // ---- writing and research -------------------------------------------
  { years: 2, impact: 2, fame: 2, re: /publish(ed)? (a )?book|author of|wrote a book|write a book/i, people: 1_000_000,
    basis: 'roughly a million living American published authors' },
  { years: 4, impact: 2, fame: 1, re: /published (research|paper)|peer.?review|first author/i, people: 3_000_000,
    basis: 'about the size of the US research workforce' },
  { years: 5, impact: 1, fame: 2, re: /phd|doctorate/i, people: 4_500_000, basis: 'about 1.7% of US adults hold a doctorate' },
  { years: 2, impact: 1, fame: 1, re: /patent/i, people: 3_000_000, basis: 'a small share of working engineers ever hold one' },
  { years: 0.1, gate: 'access', fame: 1, re: /wilderness first responder|\bwfr\b|first responder cert/i, people: 250_000,
    basis: 'a guide and instructor credential, rarely held otherwise' },

  // ---- extremes --------------------------------------------------------
  { years: 12, gate: 'access', fame: 2, re: /explorer.?s grand slam|grand slam/i, people: 30,
    basis: 'about seventy people have ever completed it' },
  { years: 10, fame: 2, re: /barkley/i, people: 15, basis: 'about twenty people have ever finished the Barkley' },
  { years: 12, fame: 2, re: /oceans seven/i, people: 8, basis: 'fewer than forty swimmers have completed all seven' },
  { years: 5, fame: 2, re: /english channel|channel swim/i, people: 600,
    basis: 'only about 2,200 people have ever swum the Channel solo' },
  { years: 15, gate: 'access', fame: 2, re: /(all|every) (195 )?countr(y|ies)/i, people: 400,
    basis: 'a few hundred people have documented visiting every country' },
  { years: 1, gate: 'access', fame: 2, re: /north pole|south pole/i, people: 4_000, basis: 'polar travel is a few thousand people a decade' },
  { years: 20, gate: 'luck', impact: 2, fame: 2, re: /astronaut|nasa|orbital flight/i, people: 400,
    basis: 'about 400 Americans have flown as astronauts' },
  // A suborbital seat is a cheque and a weekend of training. Whatever it
  // costs, it is not asking years of you.
  { years: 0.05, gate: 'bought', fame: 2, re: /go to space|suborbital|space ?flight|blue origin|virgin galactic/i,
    people: 60, basis: 'a few dozen Americans have bought a suborbital seat' },
  { years: 6, fame: 2, re: /badwater|ultraman/i, people: 2_000, basis: 'the hardest named ultras have tiny finisher lists' },
  { years: 6, gate: 'access', fame: 1, re: /(50|fifty) (state )?high ?points?|highpoint/i, people: 500,
    basis: 'roughly 500 people have stood on all fifty state high points' },
  { years: 0.6, fame: 1, re: /appalachian trail|\bat\b thru|pacific crest|\bpct\b|thru.?hike/i, people: 30_000,
    basis: 'about 30,000 people have thru-hiked a long trail' },
  { years: 6, re: /kona|world championship qualif/i, people: 40_000,
    basis: 'roughly 2,000 Kona slots a year, most to repeat qualifiers' },
  { years: 5, re: /sub-?10|under 10 hours/i, people: 30_000, basis: 'a sub-10 Ironman is about 5% of finishers' },
  { years: 3, fame: 1, re: /boston qualif|\bbq\b/i, people: 300_000, basis: 'a Boston qualifier is roughly the top 10% of marathoners' },
  { years: 1, fame: 1, re: /sub-?4|under 4 hours/i, people: 1_000_000, basis: 'about a third of marathon finishers break four hours' },
  { years: 4, gate: 'luck', impact: 2, fame: 2, re: /ted talk|tedx main|keynote at|main.?stage talk/i, people: 20_000, basis: 'main-stage speaking slots are very few' },
  { years: 6, gate: 'luck', impact: 3, fame: 2, re: /bestseller|new york times list/i, people: 10_000, basis: 'a few hundred titles a year reach the list' },
  { years: 12, gate: 'luck', impact: 2, fame: 2, re: /olympi(an|c team)|world championship team/i, people: 12_000,
    basis: 'roughly 12,000 living American Olympians' },
  { years: 12, gate: 'luck', impact: 2, fame: 2, re: /imo|international math olympiad|putnam fellow/i, people: 400,
    basis: 'six US places a year, for decades' },

  // ---- games and ranks -------------------------------------------------
  { years: 4, fame: 1, re: /challenger|grandmaster in|\bgm\b rank|top 500/i, people: 15_000,
    basis: 'the top of a competitive ladder' },
  { years: 3, fame: 1, re: /master(s)? (tier|rank)|reach master/i, people: 150_000,
    basis: 'roughly the top 1% of ranked players' },
  { years: 2, re: /diamond (rank|tier)|reach diamond/i, people: 900_000,
    basis: 'about the top 2-3% of ranked players' },
  { years: 1, re: /platinum (rank|tier)|reach platinum/i, people: 3_000_000,
    basis: 'the top ~10% of ranked players' },
  { years: 0.5, re: /gold (rank|tier)|reach gold/i, people: 8_000_000,
    basis: 'above the median ranked player' },
  { years: 3, fame: 1, re: /chess.*(1800|2000|2200)|\bmaster\b.*chess|uscf/i, people: 60_000,
    basis: 'a rated chess strength most players never reach' },

  // ---- physical feats --------------------------------------------------
  { years: 3, fame: 1, re: /one.?arm (pull.?up|chin.?up)/i, people: 50_000, basis: 'a genuinely rare strength feat' },
  { years: 3, fame: 1, re: /planche|front lever|iron cross/i, people: 80_000, basis: 'years of specific gymnastic work' },
  { years: 1, fame: 1, re: /handstand/i, people: 250_000, basis: 'a held freestanding handstand is uncommon past childhood' },
  { years: 0.8, fame: 1, re: /muscle.?up/i, people: 900_000, basis: 'perhaps one in three hundred adults can do one' },
  { years: 0.3, fame: 1, re: /backflip|back tuck/i, people: 2_000_000, basis: 'most who can learned it as a child' },
  { years: 1, re: /two plates?|225\b|bodyweight (press|overhead)/i, people: 4_000_000,
    basis: 'a two-plate bench is a common first strength goal' },
  { years: 2, re: /four plates?|405\b/i, people: 1_500_000, basis: 'a four-plate deadlift is a real lift' },
  { years: 1, re: /pistol squat/i, people: 1_500_000, basis: 'single-leg strength and balance' },
  { years: 3, re: /3\.5 rating|4\.0 rating|ntrp/i, people: 400_000, basis: 'a solid club tennis level' },
  { years: 1.5, re: /3\.0 rating|varsity team/i, people: 2_000_000, basis: 'competent competitive play' },
  { years: 4, fame: 1, re: /1000 ?lb|thousand pound|three plate|315/i, people: 400_000, basis: 'a serious lifting total' },
  { years: 3, gate: 'access', fame: 1, re: /cave div/i, people: 15_000, basis: 'the most technical and least forgiving diving certification' },
  { years: 4, gate: 'access', fame: 1, re: /wingsuit|base jump/i, people: 4_000, basis: 'a tiny and self-selecting group' },
  { years: 3, gate: 'access', fame: 1, re: /sail across|transatlantic|transpacific|ocean crossing/i, people: 15_000,
    basis: 'crossing an ocean under sail is a few hundred people a year' },
  { years: 0.3, gate: 'access', re: /bareboat|asa \d|sailing certif|competent sailor|day skipper/i, people: 400_000,
    basis: 'enough to charter a boat without a skipper' },
  { years: 1.5, gate: 'access', fame: 1, re: /instrument rating|commercial pilot|\bcfi\b|type rating/i, people: 300_000,
    basis: 'about half of licensed pilots go on to an instrument rating' },
  { years: 4, fame: 1, re: /hsk ?[56]|jlpt ?n[12]|c1|c2|professional fluency/i, people: 200_000,
    basis: 'adult learners rarely reach a professional working level' },

  // ---- travel ----------------------------------------------------------
  { years: 5, gate: 'access', fame: 2, re: /all (7|seven) continents|antarctic/i, people: 150_000, basis: 'Antarctica is the gate most never pass' },
  { years: 10, gate: 'access', fame: 2, re: /1[0-9]{2}\+? countries/i, people: 40_000, basis: 'passing a hundred countries is genuinely rare' },
  { years: 7, gate: 'access', fame: 1, re: /(7[5-9]|[89][0-9])\+? countries/i, people: 200_000, basis: 'the long tail of serious travellers' },
  { years: 5, gate: 'access', fame: 1, re: /([5-7][0-9])\+? countries/i, people: 800_000, basis: 'fifty-plus countries is a lifetime of travel' },
  { years: 4, gate: 'access', fame: 1, re: /all (50|fifty) states|50 states/i, people: 2_000_000, basis: 'about 2 million Americans have been to every state' },
  { years: 5, gate: 'access', fame: 1, re: /national parks/i, people: 500_000, basis: 'few people work through the park list' },
  { years: 0.1, gate: 'access', fame: 1, re: /inca trail|torres del paine|patagonia/i, people: 400_000,
    basis: 'the best-known long treks outside the US' },

  // ---- body and craft, measured as proportions -------------------------
  { years: 3, re: /vo2/i, share: 0.02, basis: 'an elite-for-age aerobic ceiling' },
  { years: 1, re: /body ?fat/i, share: 0.03, basis: 'a lean body composition few sustain' },
  { years: 5, re: /fluent|native|bilingual|hsk|mandarin/i, share: 0.2,
    basis: 'most of the world is bilingual; it is the pairing that is unusual, not the fact' },
  { years: 5, re: /instrument|piano|guitar|violin/i, share: 0.03, basis: 'many learn; few keep it' },
];

const shareOf = (r: Rule) => r.share ?? (r.people! / ADULTS);

export function rarityOf(...text: (string | null | undefined)[]): Rarity | null {
  const s = text.filter(Boolean).join(' ');
  if (!s.trim()) return null;
  // The rarest matching rule wins, so a note mentioning "marathon" cannot
  // drag an Everest summit down to marathon rarity.
  let best: Rarity | null = null;
  for (const r of RULES) {
    if (!r.re.test(s)) continue;
    const share = shareOf(r);
    if (!best || share < best.share) {
      best = {
        share, basis: r.basis, rule: r.re.source,
        people: r.people ?? Math.round(r.share! * ADULTS),
        years: r.years, gate: r.gate, impact: r.impact, fame: r.fame,
      };
    }
  }
  return best;
}

/**
 * Net worth is a band rather than a keyword, and age changes it completely:
 * most wealth sits with people over fifty, so the same figure at 29 is far
 * rarer than the headline millionaire count suggests.
 */
export function netWorthRarity(usd: number, age?: number | null): Rarity | null {
  // US adults at or above each threshold.
  const bands: [number, number][] = [
    [100_000_000, 12_000],
    [50_000_000, 35_000],
    [10_000_000, 1_500_000],
    [5_000_000, 3_500_000],
    [2_000_000, 10_000_000],
    [1_000_000, 22_000_000],
    [500_000, 45_000_000],
  ];
  const hit = bands.find(([floor]) => usd >= floor);
  if (!hit) return null;
  const [floor, people] = hit;

  // Share of wealth-holders at each age. Compounding is most of how people get
  // there, so the young are a sliver of every band.
  //
  // Wide bands on purpose. Cutting at 30 as well meant the figure lurched on a
  // birthday - the same balance sheet reading as rarer the day before you turn
  // thirty than the day after - which says more about the bucket than about you.
  const young = age == null ? 1
    : age < 35 ? 0.05
    : age < 50 ? 0.25
    : 1;

  const n = Math.round(people * young);
  return {
    share: n / ADULTS,
    people: n,
    basis: age == null
      ? `about ${fmt(people)} US adults are worth ${bandLabel(floor)}`
      : `about ${fmt(people)} US adults are worth ${bandLabel(floor)}, and roughly ${Math.round(young * 100)}% of them are under ${age < 35 ? 35 : 50} — call it ${fmt(n)} people`,
  };
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${Math.round(n / 1_000)}k`
  : String(n);

const bandLabel = (floor: number) =>
  floor >= 1_000_000 ? `$${floor / 1_000_000}M+` : `$${floor / 1_000}k+`;

/**
 * Difficulty, in years of dedicated effort.
 *
 * Rarity turned out to answer the wrong question. Everest is rare because it
 * costs $60,000; Y Combinator is rare because they pick you; a jiu-jitsu black
 * belt is rare because it takes ten years. Only the last one is hard. So the
 * badge is difficulty, and what actually gates a thing - money or selection -
 * is shown next to it rather than being silently counted as difficulty.
 */
export type DiffKey = 'casual' | 'committed' | 'serious' | 'hard' | 'brutal' | 'lifes-work';

export const LEVELS: { key: DiffKey; name: string; floor: number; says: string }[] = [
  { key: 'lifes-work', name: 'Legendary', floor: 90, says: 'the ceiling of what a person does in a life' },
  { key: 'brutal', name: 'Rarefied', floor: 70, says: 'years of work, and almost nobody gets there' },
  { key: 'hard', name: 'Elite', floor: 50, says: 'a long commitment that few finish' },
  { key: 'serious', name: 'Impressive', floor: 30, says: 'a stranger would be impressed' },
  { key: 'committed', name: 'Respected', floor: 15, says: 'real effort, and people understand it' },
  { key: 'casual', name: 'Everyday', floor: 0, says: 'a free weekend, or nobody would notice' },
];

/**
 * One number to sort by, because "YC is hard, Everest is hard, which is
 * harder?" needs an answer and three separate marks do not give one.
 *
 * Effort is the base. Being chosen multiplies it: you can train for a marathon
 * but you cannot train for an acceptance rate, and the years you put in still
 * might not land it. Money divides it: a thing you can buy your way through is
 * not asking as much of you, whatever it costs.
 */
/**
 * How impressive a thing is, which is not the same as how long it takes.
 *
 * Three parts, added rather than multiplied so each one is legible:
 *   effort    - years of work, the floor of the whole thing
 *   scarcity  - how few people have done it, on a log scale
 *   standing  - whether a stranger recognises it, which is what status is
 *
 * Money no longer divides anything. Paying for a permit does not climb the
 * mountain, and treating Everest as easier than an Ironman because it costs
 * $60,000 was wrong. Only a thing where the purchase IS the achievement - a
 * bought seat on a rocket - takes a penalty.
 */
export function score(r: Rarity): number {
  const fame = r.fame ?? 0;
  const effort = Math.min(50, (r.years ?? 0) * 4);
  // Scarcity is discounted hard when nobody recognises the thing. Eating ten
  // slugs is vanishingly rare and worth almost nothing; being rare is not the
  // same as being admired, and only the second one is status.
  const scarcity = Math.min(40, Math.max(0, Math.log10(1 / r.share) * 6)) * (0.3 + 0.35 * fame);
  const standing = fame * 8;
  // Not converting reliably means more attempts in expectation, not less skill.
  const odds = r.gate === 'luck' ? 1.1 : 1;
  const bought = r.gate === 'bought' ? 0.5 : 1;
  return (effort + scarcity + standing) * odds * bought;
}

/** Kept for sorting compatibility; the score is what ranks things now. */
export const hardness = score;

export const levelOf = (r: Rarity) =>
  r.years == null ? null : (LEVELS.find((l) => hardness(r) >= l.floor) ?? LEVELS[LEVELS.length - 1]);

export const yearsLabel = (y: number) =>
  y < 0.1 ? 'a few days' : y < 1 ? `about ${Math.round(y * 12)} months`
    : y === 1 ? 'about a year' : `about ${Math.round(y)} years`;

export const GATE_SAYS: Record<string, string> = {
  access: 'money buys the opportunity, but you still have to do it',
  bought: 'the purchase is the achievement',
  luck: 'you have to be chosen; effort alone will not do it',
};

/**
 * Six buckets by order of magnitude, borrowed from loot rarity because that is
 * exactly the job: percentiles all pile up between 99 and 99.999, where the
 * differences live in digits nobody can rank at a glance. A tier is instantly
 * comparable and it does not imply precision the estimates do not have.
 */
export type TierKey = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const TIERS: { key: TierKey; name: string; floor: number }[] = [
  { key: 'mythic', name: 'Mythic', floor: 0 },
  { key: 'legendary', name: 'Legendary', floor: 1e-5 },
  { key: 'epic', name: 'Epic', floor: 1e-4 },
  { key: 'rare', name: 'Rare', floor: 1e-3 },
  { key: 'uncommon', name: 'Uncommon', floor: 1e-2 },
  { key: 'common', name: 'Common', floor: 1e-1 },
];

export const tierOf = (r: Rarity) =>
  [...TIERS].reverse().find((t) => r.share >= t.floor) ?? TIERS[0];

/** "1 in 33,000" - the magnitude, rounded to something a person can hold. */
export function oneIn(share: number): string {
  const n = 1 / share;
  if (n < 10) return `1 in ${n.toFixed(1)}`;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return `1 in ${(Math.round(n / mag) * mag).toLocaleString()}`;
}

/** "about 8,000" - the head-count, same rounding. */
export function headCount(r: Rarity): string {
  const n = r.people ?? Math.round(r.share * ADULTS);
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString()}k`;
  return n.toLocaleString();
}

export const band = (usd: number) =>
  usd >= 100_000_000 ? '$100M+'
  : usd >= 50_000_000 ? '$50M+'
  : usd >= 10_000_000 ? '$10M+'
  : usd >= 5_000_000 ? '$5M+'
  : usd >= 2_000_000 ? '$2M+'
  : usd >= 1_000_000 ? '$1M+'
  : '$500k+';

/**
 * Two rows for the same achievement — a quest "Climb Kilimanjaro" and the
 * skill rung "Kilimanjaro" — should appear once. Compare the significant
 * words only, and treat one row as a duplicate when its words are contained
 * in the other's.
 */
const STOP = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'my', 'and', 'for', 'with',
  'climb', 'climbed', 'summit', 'summited', 'get', 'got', 'become', 'became',
  'do', 'did', 'first', 'finish', 'finished', 'complete', 'completed', 'run',
  'ran', 'reach', 'reached', 'earn', 'earned', 'mt', 'mount',
]);

export const keyOf = (label: string): Set<string> =>
  new Set(
    label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w && !STOP.has(w)),
  );

const contains = (a: Set<string>, b: Set<string>) =>
  b.size > 0 && [...b].every((w) => a.has(w));

/**
 * Two labels for one achievement. Word containment catches "Kilimanjaro" in
 * "Climb Mt. Kilimanjaro"; matching the same rarity rule catches "Ironman
 * 140.6" and "Do a full Ironman", which share only one word and would
 * otherwise sit on the card twice.
 */
export function sameThing(a: string, b: string, ra?: Rarity | null, rb?: Rarity | null): boolean {
  const ka = keyOf(a);
  const kb = keyOf(b);
  if (contains(ka, kb) || contains(kb, ka)) return true;
  return !!ra?.rule && ra.rule === rb?.rule;
}

/** Keeps the first of each group, so sort by whatever should win first. */
export function dedupe<T>(
  rows: T[], label: (row: T) => string, rarity: (row: T) => Rarity | null = () => null,
): T[] {
  const kept: { row: T; key: Set<string>; r: Rarity | null }[] = [];
  for (const row of rows) {
    const key = keyOf(label(row));
    const r = rarity(row);
    const dup = kept.some((k) => contains(k.key, key) || contains(key, k.key)
      || (!!r?.rule && r.rule === k.r?.rule));
    if (dup) continue;
    kept.push({ row, key, r });
  }
  return kept.map((k) => k.row);
}
