import { Sheet } from './types';
import {
  CONTINENTS, US_STATES, CHINA_PROVINCES, WILD_ANIMALS, EATEN_ANIMALS, NATIONAL_PARKS,
} from './catalog';

/**
 * A sheet you can hand to someone across a table. Same structure, same
 * layout, invented numbers: the name changes, every reading is jittered, the
 * money is replaced outright, and anything that is really a diary entry -
 * inbox notes, medical history, source documents, people - is dropped rather
 * than disguised, because a plausible-looking fake medical record is worse
 * than none.
 *
 * Nothing here writes; demo mode also flips the database layer to a no-op, so
 * a click while showing off cannot reach your real sheet.
 */

// An ordinary person, not a fantasy one: the demo is meant to look like a
// sheet somebody actually keeps, and "Aldric Vane of Greyharbour" reads as a
// joke rather than an example.
const NAMES = [
  'Alex Chen', 'Sam Rivera', 'Jordan Park', 'Riley Okafor', 'Casey Lindqvist',
  'Devin Moreau', 'Noor Haddad', 'Emil Brandt',
];
const PLACES = [
  'Portland, Oregon', 'Austin, Texas', 'Columbus, Ohio', 'Sacramento, California',
  'Raleigh, North Carolina', 'Providence, Rhode Island',
];

const CITIES = [
  'Lisbon, Portugal', 'Porto, Portugal', 'Valencia, Spain', 'Lyon, France',
  'Turin, Italy', 'Ghent, Belgium', 'Utrecht, Netherlands', 'Aarhus, Denmark',
  'Gothenburg, Sweden', 'Tampere, Finland', 'Krakow, Poland', 'Brno, Czechia',
  'Ljubljana, Slovenia', 'Thessaloniki, Greece', 'Galway, Ireland',
  'Dundee, Scotland', 'Hobart, Australia', 'Dunedin, New Zealand',
  'Halifax, Canada', 'Victoria, Canada', 'Boise, Idaho', 'Burlington, Vermont',
  'Asheville, North Carolina', 'Santa Fe, New Mexico', 'Missoula, Montana',
];

/** Surnames, so a disguised name is a whole name rather than a first name. */
const SURNAMES = [
  'Arden', 'Blackwell', 'Caldwell', 'Danforth', 'Ellery', 'Fairbourne',
  'Grimsby', 'Harrow', 'Ingram', 'Larkspur', 'Merrow', 'Northcote',
  'Oakhurst', 'Pemberly', 'Rookwood', 'Stanhope', 'Thorne', 'Winterly',
];
const COMPANIONS = [
  'Bryn', 'Calla', 'Doran', 'Edda', 'Faelan', 'Gwyn', 'Hale', 'Iver',
  'Jessa', 'Kell', 'Lyra', 'Moss', 'Nyla', 'Orin', 'Pell', 'Quill',
];

/**
 * Rung labels are achievements, not skill names: "Sub-4 marathon" and "Rescue
 * Diver" name exactly what you did, so they go even though the skills they hang
 * under stay real.
 */
const RUNGS = [
  'First attempt', 'Entry certification', 'Comfortable unsupervised', 'Club level',
  'First competition', 'Placed in a local event', 'Regional level', 'Coaching others',
  'National level', 'Top of the amateur field',
];

const TITLES = [
  'Founder · Runner · Diver', 'Engineer · Climber · Cook',
  'Builder · Swimmer · Reader', 'Designer · Cyclist · Gardener',
];

/**
 * A demo sheet is not a disguised sheet. Scrambling a few hundred quests produced
 * something private but useless - nobody can see how the app works through a
 * wall of noise. So the demo character gets a small hand-built set instead,
 * chosen to show the features: a nested chain, a few things in progress, some
 * done, one paused, one that did not work out, one blurred, notes on a couple.
 *
 * [title, status, track/phase, note, parent index or -1, private]
 */
type DemoQuest = [string, string, string, string?, number?, boolean?];

const DEMO_MAIN: DemoQuest[] = [
  ['Graduate university', 'done', 'Education'],
  ['Land the first real job', 'done', 'Career'],
  ['Find work worth doing', 'active', 'Career', 'the open question right now'],
  ['Start a company', 'done', 'Company'],
  ['Raise a first round', 'failed', 'Company', 'pitched 40, no takers'],
  ['Reach profitability', 'active', 'Company'],
  ['Hit $1M revenue run rate', 'locked', 'Company'],
  ['Reach $100k liquid net worth', 'done', 'Money'],
  ['Reach $1M liquid net worth', 'locked', 'Money'],
  ['Meet someone worth keeping', 'done', 'Life'],
  ['Buy a place', 'locked', 'Life'],
  ['Raise a kid well', 'locked', 'Life'],
];

const DEMO_SIDE: DemoQuest[] = [
  ['Run a 10K', 'done', 'Running'],
  ['Run a half marathon', 'done', 'Running'],
  ['Run a marathon', 'active', 'Running', 'entered for October'],
  ['Break 4 hours in a marathon', 'locked', 'Running'],
  ['Become a divemaster', 'active', 'Diving', 'the long chain below'],
  ['Get PADI Open Water certified', 'done', 'Diving', '', 4],
  ['Get PADI Advanced Open Water certified', 'done', 'Diving', '', 4],
  ['Get PADI Rescue Diver certified', 'active', 'Diving', '', 4],
  ['Log 100 dives', 'locked', 'Diving', '', 4],
  ['Climb a fourteener', 'done', 'Mountaineering'],
  ['Climb Mont Blanc', 'paused', 'Mountaineering', 'shelved after the knee'],
  ['Visit Iceland', 'done', 'Exploring'],
  ['Travel alone for a month', 'done', 'Exploring'],
  ['See the northern lights', 'locked', 'Exploring'],
  ['Visit every US state', 'locked', 'Exploring'],
  ['Bench bodyweight', 'done', 'Strength'],
  ['Do ten pull-ups', 'locked', 'Strength'],
  ['Hold a handstand', 'locked', 'Strength'],
  ['Learn an instrument', 'locked', 'Skills'],
  ['Learn the guitar', 'locked', 'Skills', '', 18],
  ['Learn the piano', 'locked', 'Skills', '', 18],
  ['Learn conversational Spanish', 'paused', 'Skills', 'picked it up twice, dropped it twice'],
  ['Read fifty books in a year', 'done', 'Skills'],
  ['Quit the habit I keep going back to', 'active', 'Habits', '', -1, true],
  ['Get a dog', 'locked', 'Life'],
];

const ITEM_NAMES = [
  'Watch', 'Jacket', 'Bicycle', 'Camera', 'Headphones', 'Desk', 'Boots', 'Guitar',
  'Suitcase', 'Tent', 'Knife', 'Chair', 'Speakers', 'Backpack', 'Coat',
];

/** Deterministic, so the demo does not reshuffle itself on every render. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disguise(sheet: Sheet, seed = 7): Sheet {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  /**
   * Each metric gets its own scale factor, held constant across that metric's
   * whole history, plus a little noise per reading.
   *
   * Jittering every reading independently around the true value left body fat,
   * VO2 max and testosterone landing within a point or two of the real ones -
   * close enough to recognise, which defeats the purpose. Shifting the centre
   * moves the number somewhere else entirely, while a constant factor keeps the
   * series coherent: a trend still trends, a plateau still plateaus.
   */
  const scales = new Map<string, number>();
  const scaleFor = (key: string) => {
    // A factor drawn across 1.0 can land on it: a disguised reading within a
    // point of the real one is not a disguise. The dead zone guarantees
    // every metric moves at least 15% one way or the other.
    if (!scales.has(key)) {
      // Capped at 30%: a bigger shift disguises just as well but starts
      // printing a 49 kg adult, which reads as broken rather than private.
      const mag = 0.15 + r() * 0.15;
      scales.set(key, r() < 0.5 ? 1 - mag : 1 + mag);
    }
    return scales.get(key)!;
  };
  const jitter = (n: number, key = '', spread = 0.05) => {
    const out = n * (key ? scaleFor(key) : 1) * (1 + (r() * 2 - 1) * spread);
    return Math.abs(out) >= 100 ? Math.round(out) : Math.round(out * 10) / 10;
  };
  const round = (n: number) => {
    const mag = 10 ** Math.max(3, Math.floor(Math.log10(Math.abs(n) || 1)) - 1);
    return Math.round(n / mag) * mag;
  };

  const birthday = sheet.profile?.birthday
    ? new Date(new Date(sheet.profile.birthday).getTime()
        + Math.round((r() * 2 - 1) * 900) * 86_400_000).toISOString().slice(0, 10)
    : null;

  return {
    ...sheet,
    profile: sheet.profile && {
      ...sheet.profile,
      display_name: pick(NAMES),
      // The sigil is drawn from other_name, and a family name character is as
      // identifying as the name itself.
      other_name: '',
      ethnicity: '',
      // The card title is generated from your top skills, and those stay real,
      // so it has to be replaced directly or it still names them.
      title: pick(TITLES),
      birthplace: pick(PLACES),
      birthday,
      avatar_url: null,
      friend_order: null,
      vault_pin_hash: null,
    },
    measurements: sheet.measurements.map((m) => ({
      ...m,
      value: m.value == null ? null : jitter(Number(m.value), m.metric_key),
      text_value: m.text_value ? '—' : m.text_value,
      note: '',
    })),
    // Same dead zone as the measurements: a multiplier drawn across 1.0 can
    // land on it, and a figure a few percent off the real one is not a disguise.
    money: sheet.money.map((m) => ({
      ...m,
      value: m.value == null ? null : round(Number(m.value) * scaleFor(`m:${m.key}`)),
      note: '',
    })),
    items: sheet.items.map((i, n) => ({
      ...i,
      name: ITEM_NAMES[(n * 3 + Math.floor(r() * 5)) % ITEM_NAMES.length],
      value: i.value == null ? null : round(Number(i.value) * (0.5 + r())),
      note: '',
      brand: '',
    })),
    counters: sheet.counters.map((c) => ({
      ...c,
      value: c.value == null ? null : Math.max(0, Math.round(jitter(Number(c.value), `c:${c.id}`, 0.1))),
    })),
    // Skills and the People tab are deliberately left real: a skill name is
    // not private, and scrambling them turned the demo into nonsense. Their
    // rungs are a different matter - those name what you actually did.
    milestones: sheet.milestones.map((m) => ({
      ...m,
      label: RUNGS[Math.min(RUNGS.length - 1, Math.floor((m.level / 100) * RUNGS.length))],
      note: '',
    })),
    atlas: (() => {
      const pools: Record<string, string[]> = {
        country: Object.values(CONTINENTS).flat(),
        state: Object.values(US_STATES).flat(),
        province: Object.values(CHINA_PROVINCES).flat(),
        park: NATIONAL_PARKS.map((x) => x.name),
        animal_seen: Object.values(WILD_ANIMALS).flat(),
        animal_eaten: EATEN_ANIMALS.flatMap((g) => g.items),
        city_lived: CITIES,
        // The most sensitive rows on the sheet, and the only ones that are
        // somebody else's data rather than yours.
        intimate: COMPANIONS.flatMap((f) => SURNAMES.map((l) => `${f} ${l}`)),
      };
      const used: Record<string, Set<string>> = {};
      // A demo character with 37 countries and 22 states looks like a data
      // dump. Keep a believable handful of each.
      const caps: Record<string, number> = {
        country: 11, state: 8, province: 3, park: 4,
        animal_seen: 7, animal_eaten: 9, city_lived: 3, intimate: 4,
      };
      const seen: Record<string, number> = {};
      return sheet.atlas.filter((a) => {
        seen[a.kind] = (seen[a.kind] ?? 0) + 1;
        return seen[a.kind] <= (caps[a.kind] ?? 6);
      }).map((a) => {
        const pool = pools[a.kind];
        if (!pool) return { ...a, detail: '' };
        used[a.kind] ??= new Set();
        // Walk the pool from a seeded offset so a swapped country is still a
        // real country, and no two rows collide.
        let pick = a.name;
        for (let i = 0; i < pool.length; i++) {
          const cand = pool[(Math.floor(r() * pool.length) + i) % pool.length];
          if (!used[a.kind].has(cand)) { pick = cand; break; }
        }
        used[a.kind].add(pick);
        return { ...a, name: pick, detail: '' };
      });
    })(),
    quests: (() => {
      const build = (rows: DemoQuest[], kind: 'main' | 'side', offset: number) => {
        const ids = rows.map((_, i) => `demo-${kind}-${i}`);
        return rows.map(([title, status, group, note, parent, priv], i) => ({
          id: ids[i],
          title,
          kind,
          track: kind === 'side' ? group : '',
          phase: kind === 'main' ? group : '',
          status,
          completed_on: status === 'done'
            ? `202${3 + (i % 4)}-0${1 + (i % 9)}-1${i % 9}` : null,
          progress_current: null,
          progress_total: null,
          note: note ?? '',
          display_order: offset + i,
          is_public: true,
          // A couple of finished ones on the card, so it is not empty.
          pinned: status === 'done' && i % 4 === 0,
          parent_id: parent != null && parent >= 0 ? ids[parent] : null,
          is_private: priv === true,
        }));
      };
      return [...build(DEMO_MAIN, 'main', 0), ...build(DEMO_SIDE, 'side', 100)] as Sheet['quests'];
    })(),
    // Diary-shaped tables are removed, not faked.
    notes: [],
    medical: [],
    documents: [],
    events: sheet.events.map((e, i) => ({
      ...e, title: DEMO_MAIN[i % DEMO_MAIN.length][0], note: '',
    })),
  };
}
