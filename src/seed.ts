/**
 * First-run content: a sample character.
 *
 * Everything below is invented. Rowan Abernathy is not a real person, and
 * none of these quests, places, dates or readings describe anyone. The sample
 * exists so a fresh account opens onto a sheet that shows every feature -
 * ladders at many levels, quests done / in progress / locked, partial
 * progress, readings trending over several years, and an atlas with every
 * kind of place - instead of an empty page. Edit or delete any of it; the
 * seeder only fills tables that are empty, so it never overwrites your own.
 *
 * Every ladder answers one question: what does 100 mean? Everything below it is
 * partial credit toward that.
 */

export interface SeedMilestone {
  label: string;
  level: number;
  achieved?: boolean;
  on?: string;
  note?: string;
}

export interface SeedSkill {
  name: string;
  category: 'physical' | 'mental' | 'craft' | 'world';
  mastery_def: string;
  ladder: SeedMilestone[];
}

export const SEED_SKILLS: SeedSkill[] = [
  {
    name: 'Climbing',
    category: 'physical',
    mastery_def: 'Redpoint 5.13a outdoors and lead a multi-pitch trad route',
    ladder: [
      { label: 'First day at a climbing gym', level: 4, achieved: true, on: '2016-02-01' },
      { label: 'Top-rope 5.9', level: 15, achieved: true, on: '2016-06-01' },
      { label: 'Lead certified', level: 28, achieved: true, on: '2017-04-01' },
      { label: 'Redpoint 5.11a outdoors', level: 45, achieved: true, on: '2019-08-01', note: 'Sample: Eldorado Canyon' },
      { label: 'Redpoint 5.12a outdoors', level: 65 },
      { label: 'Lead a multi-pitch trad route', level: 80 },
      { label: 'Redpoint 5.13a outdoors', level: 100 },
    ],
  },
  {
    name: 'Running',
    category: 'physical',
    mastery_def: 'A sub-3-hour marathon',
    ladder: [
      { label: 'Run a 5K', level: 8, achieved: true, on: '2014-10-01' },
      { label: 'Sub-25 5K', level: 18, achieved: true, on: '2015-05-01' },
      { label: 'Half marathon', level: 30, achieved: true, on: '2018-09-01' },
      { label: 'Marathon', level: 48, achieved: true, on: '2021-10-01', note: 'Sample: 4:12, walked mile 22' },
      { label: 'Sub-4 marathon', level: 64 },
      { label: 'Boston qualifier', level: 82 },
      { label: 'Sub-3 marathon', level: 100 },
    ],
  },
  {
    name: 'Swimming',
    category: 'physical',
    mastery_def: 'A 10 km open-water swim',
    ladder: [
      { label: 'Swim a length without stopping', level: 6, achieved: true },
      { label: '1,500 m continuous', level: 25, achieved: true, on: '2020-07-01' },
      { label: 'First open-water race', level: 45 },
      { label: '5 km open water', level: 70 },
      { label: '10 km open water', level: 100 },
    ],
  },
  {
    name: 'Strength',
    category: 'physical',
    mastery_def: 'A 1,000 lb powerlifting total (bench + squat + deadlift)',
    ladder: [
      { label: 'Ten strict push-ups', level: 6, achieved: true },
      { label: 'First pull-up', level: 14, achieved: true, on: '2019-01-01' },
      { label: 'Squat bodyweight', level: 25, achieved: true, on: '2020-03-01' },
      { label: 'Deadlift 1.5x bodyweight', level: 38, achieved: true, on: '2022-06-01' },
      { label: '600 lb total', level: 50 },
      { label: '800 lb total', level: 72 },
      { label: '1,000 lb total', level: 100 },
    ],
  },
  {
    name: 'Yoga',
    category: 'physical',
    mastery_def: 'A free-standing handstand held for a minute',
    ladder: [
      { label: 'Touch your toes', level: 8, achieved: true },
      { label: 'Crow pose', level: 20, achieved: true, on: '2021-02-01' },
      { label: 'Headstand', level: 35 },
      { label: 'Wall handstand, 60 s', level: 55 },
      { label: 'Free-standing handstand, 10 s', level: 75 },
      { label: 'Free-standing handstand, 60 s', level: 100 },
    ],
  },
  {
    name: 'Diving',
    category: 'physical',
    mastery_def: 'PADI Divemaster - qualified to lead dives',
    ladder: [
      { label: 'Discover Scuba dive', level: 5, achieved: true, on: '2018-03-01' },
      { label: 'Open Water', level: 20, achieved: true, on: '2018-03-01' },
      { label: 'Advanced Open Water', level: 35, achieved: true, on: '2023-02-01' },
      { label: 'Rescue Diver', level: 55 },
      { label: '100 logged dives', level: 75 },
      { label: 'Divemaster', level: 100 },
    ],
  },
  {
    name: 'Spanish',
    category: 'mental',
    mastery_def: 'Native: speak, read and write without effort',
    ladder: [
      { label: 'Survival phrases', level: 10, achieved: true },
      { label: 'Hold a conversation', level: 25, achieved: true, on: '2017-01-01' },
      { label: 'Travel and order alone', level: 35, achieved: true, on: '2017-06-01' },
      { label: 'DELE B2', level: 50 },
      { label: 'Read a newspaper', level: 65 },
      { label: 'Read a novel', level: 80 },
      { label: 'Business fluent', level: 90 },
      { label: 'Native', level: 100 },
    ],
  },
  {
    name: 'Chess',
    category: 'mental',
    mastery_def: 'FIDE Master title',
    ladder: [
      { label: 'Know how every piece moves', level: 3, achieved: true },
      { label: '1200 online rapid', level: 15, achieved: true, on: '2020-11-01' },
      { label: '1500 online rapid', level: 28 },
      { label: 'First rated over-the-board tournament', level: 40 },
      { label: '1800 USCF', level: 60 },
      { label: '2000 USCF (Expert)', level: 78 },
      { label: 'FIDE Master', level: 100 },
    ],
  },
  {
    name: 'Woodworking',
    category: 'craft',
    mastery_def: 'Build fine furniture with hand-cut joinery, to commission',
    ladder: [
      { label: 'Build a cutting board', level: 8, achieved: true, on: '2022-12-01' },
      { label: 'Build a bookshelf', level: 20, achieved: true, on: '2023-05-01' },
      { label: 'Hand-cut dovetails', level: 38 },
      { label: 'Build a dining table', level: 55 },
      { label: 'Sell a piece', level: 72 },
      { label: 'Take a commission', level: 100 },
    ],
  },
  {
    name: 'Photography',
    category: 'craft',
    mastery_def: 'A solo exhibition',
    ladder: [
      { label: 'Shoot in manual mode', level: 10, achieved: true },
      { label: 'Develop a roll of film', level: 22, achieved: true, on: '2019-04-01' },
      { label: 'Sell a print', level: 40, achieved: true, on: '2024-09-01' },
      { label: 'Published in a magazine', level: 60 },
      { label: 'Group exhibition', level: 78 },
      { label: 'Solo exhibition', level: 100 },
    ],
  },
  {
    name: 'Cooking',
    category: 'craft',
    mastery_def: 'Cook a restaurant-quality tasting menu from scratch',
    ladder: [
      { label: 'Feed yourself', level: 12, achieved: true },
      { label: 'Cook for friends', level: 30, achieved: true },
      { label: 'Cook without a recipe', level: 50, achieved: true, on: '2022-01-01' },
      { label: 'Break down proteins yourself', level: 68 },
      { label: 'Host a multi-course dinner', level: 85 },
      { label: 'Tasting menu', level: 100 },
    ],
  },
  {
    name: 'Exploring',
    category: 'world',
    mastery_def: '100 countries and all 7 continents',
    ladder: [
      { label: '5 countries', level: 12, achieved: true },
      { label: '10 countries', level: 22, achieved: true },
      { label: '25 countries', level: 40 },
      { label: '6 continents', level: 55 },
      { label: '50 countries', level: 72 },
      { label: 'All 7 continents', level: 85 },
      { label: '100 countries', level: 100 },
    ],
  },
];

export interface SeedQuest {
  title: string;
  kind: 'main' | 'side' | 'retired';
  track?: string;
  phase?: string;
  status?: 'done' | 'active' | 'locked';
  on?: string;
  cur?: number;
  total?: number;
  note?: string;
}

export const SEED_QUESTS: SeedQuest[] = [
  // Main
  { title: 'Finish a degree', kind: 'main', phase: 'Education', status: 'done', on: '2013-05-01' },
  { title: 'Study abroad for a semester', kind: 'main', phase: 'Education', status: 'done', on: '2012-06-01' },
  { title: 'Land a first real job', kind: 'main', phase: 'Career', status: 'done', on: '2013-09-01' },
  { title: 'Get promoted to senior', kind: 'main', phase: 'Career', status: 'done', on: '2018-03-01' },
  { title: 'Lead a team', kind: 'main', phase: 'Career', status: 'done', on: '2021-07-01' },
  { title: 'Ship something used by a million people', kind: 'main', phase: 'Career', status: 'active', note: 'Sample: the transit app is at 240k' },
  { title: 'Work four days a week', kind: 'main', phase: 'Career', status: 'locked' },
  { title: 'Pay off student loans', kind: 'main', phase: 'Money', status: 'done', on: '2019-12-01' },
  { title: 'Six months of savings', kind: 'main', phase: 'Money', status: 'done', on: '2021-04-01' },
  { title: 'Save a house deposit', kind: 'main', phase: 'Money', status: 'active', cur: 62, total: 100, note: 'Percent of target' },
  { title: 'Buy a house', kind: 'main', phase: 'Home', status: 'locked' },
  { title: 'Plant an orchard', kind: 'main', phase: 'Home', status: 'locked' },

  // Side - Adventuring
  { title: 'Climb a fourteener', kind: 'side', track: 'Adventuring', status: 'done', on: '2016-08-01', note: 'Sample: Longs Peak' },
  { title: 'Hike the Colorado Trail', kind: 'side', track: 'Adventuring', status: 'active', cur: 14, total: 33, note: 'Segments done' },
  { title: 'Climb all 58 Colorado fourteeners', kind: 'side', track: 'Adventuring', status: 'active', cur: 11, total: 58 },
  { title: 'Climb Mont Blanc', kind: 'side', track: 'Adventuring', status: 'locked' },
  { title: 'See the northern lights', kind: 'side', track: 'Adventuring', status: 'done', on: '2024-02-01' },
  // Side - Running
  { title: 'Run a half marathon', kind: 'side', track: 'Running', status: 'done', on: '2018-09-01' },
  { title: 'Run a marathon', kind: 'side', track: 'Running', status: 'done', on: '2021-10-01' },
  { title: 'Break 4 hours in a marathon', kind: 'side', track: 'Running', status: 'active' },
  { title: 'Run an ultramarathon', kind: 'side', track: 'Running', status: 'locked' },
  // Side - Strength
  { title: 'Do ten pull-ups', kind: 'side', track: 'Strength', status: 'done', on: '2022-02-01' },
  { title: 'Deadlift 300 lb', kind: 'side', track: 'Strength', status: 'active' },
  { title: 'Hold a handstand', kind: 'side', track: 'Strength', status: 'locked' },
  // Side - Making
  { title: 'Build a piece of furniture', kind: 'side', track: 'Making', status: 'done', on: '2023-05-01' },
  { title: 'Learn the piano', kind: 'side', track: 'Making', status: 'active', note: 'Grade 2 pieces' },
  { title: 'Read fifty books in a year', kind: 'side', track: 'Making', status: 'active', cur: 31, total: 50 },
  // Side - Exploring
  { title: 'Visit all 63 US national parks', kind: 'side', track: 'Exploring', status: 'active', cur: 7, total: 63 },
  { title: 'Travel alone for a month', kind: 'side', track: 'Exploring', status: 'done', on: '2017-06-01' },
  { title: 'Visit every continent', kind: 'side', track: 'Exploring', status: 'active', cur: 4, total: 7 },
];

export const SEED_METRICS = [
  { key: 'height', label: 'Height', unit: 'in', category: 'body', direction: 'range', display_order: 1 },
  { key: 'weight', label: 'Weight', unit: 'lb', category: 'body', direction: 'range', display_order: 2 },
  { key: 'body_fat', label: 'Body fat', unit: '%', category: 'body', direction: 'lower', target_high: 20, display_order: 3 },
  { key: 'waist_circumference', label: 'Waist', unit: 'in', category: 'body', direction: 'lower', target_high: 34, display_order: 4 },
  { key: 'vo2max', label: 'VO2 max', unit: 'mL/kg/min', category: 'performance', direction: 'higher', target_low: 45, display_order: 10 },
  { key: 'resting_heart_rate', label: 'Resting HR', unit: 'bpm', category: 'performance', direction: 'lower', target_high: 60, display_order: 11 },
  { key: 'grip_strength_right', label: 'Grip (right)', unit: 'kg', category: 'performance', direction: 'higher', target_low: 40, display_order: 12 },
  { key: 'bench_1rm', label: 'Bench 1RM', unit: 'lb', category: 'performance', direction: 'higher', display_order: 13 },
  { key: 'squat_1rm', label: 'Squat 1RM', unit: 'lb', category: 'performance', direction: 'higher', display_order: 14 },
  { key: 'deadlift_1rm', label: 'Deadlift 1RM', unit: 'lb', category: 'performance', direction: 'higher', display_order: 15 },
  { key: 'apob', label: 'ApoB', unit: 'mg/dL', category: 'labs', direction: 'lower', target_high: 80, display_order: 20 },
  { key: 'hba1c', label: 'HbA1c', unit: '%', category: 'labs', direction: 'lower', target_high: 5.4, display_order: 21 },
  { key: 'hs_crp', label: 'hs-CRP', unit: 'mg/L', category: 'labs', direction: 'lower', target_high: 1, display_order: 22 },
  { key: 'ldl_cholesterol_calculated', label: 'LDL-C', unit: 'mg/dL', category: 'labs', direction: 'lower', target_high: 100, display_order: 23 },
  { key: 'hdl_cholesterol', label: 'HDL-C', unit: 'mg/dL', category: 'labs', direction: 'higher', target_low: 50, display_order: 24 },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', category: 'labs', direction: 'lower', target_high: 100, display_order: 25 },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'ng/mL', category: 'labs', direction: 'range', target_low: 40, target_high: 80, display_order: 26 },
];

export interface SeedMeasurement {
  key: string;
  value: number;
  on: string;
  source: string;
}

/**
 * Readings for the sample character, a few years of them per metric so the
 * charts, trends and targets have something to draw. All invented.
 */
const series = (key: string, source: string, points: [string, number][]): SeedMeasurement[] =>
  points.map(([on, value]) => ({ key, value, on, source }));

export const SEED_MEASUREMENTS: SeedMeasurement[] = [
  ...series('height', 'sample', [['2022-01-15', 69]]),
  ...series('weight', 'sample scale', [
    ['2022-01-15', 186], ['2022-07-10', 181], ['2023-01-12', 178], ['2023-07-08', 174],
    ['2024-01-14', 176], ['2024-07-06', 171], ['2025-01-11', 169], ['2025-07-12', 170],
    ['2026-01-10', 167],
  ]),
  ...series('body_fat', 'sample DEXA', [
    ['2022-02-01', 26.4], ['2023-02-01', 23.1], ['2024-02-01', 21.8], ['2025-02-01', 19.9], ['2026-02-01', 18.7],
  ]),
  ...series('waist_circumference', 'sample tape', [
    ['2022-01-15', 37.5], ['2023-01-12', 35.5], ['2024-01-14', 35], ['2025-01-11', 33.5], ['2026-01-10', 33],
  ]),
  ...series('vo2max', 'sample treadmill test', [
    ['2022-03-01', 38.2], ['2023-03-01', 41.5], ['2024-03-01', 44.0], ['2025-03-01', 46.3], ['2026-03-01', 47.1],
  ]),
  ...series('resting_heart_rate', 'sample watch', [
    ['2022-01-01', 68], ['2022-07-01', 65], ['2023-01-01', 62], ['2023-07-01', 60],
    ['2024-01-01', 61], ['2024-07-01', 57], ['2025-01-01', 56], ['2026-01-01', 54],
  ]),
  ...series('grip_strength_right', 'sample dynamometer', [
    ['2023-03-01', 41], ['2024-03-01', 44], ['2025-03-01', 46],
  ]),
  ...series('bench_1rm', 'sample gym log', [
    ['2022-04-01', 135], ['2023-04-01', 165], ['2024-04-01', 185], ['2025-04-01', 195],
  ]),
  ...series('squat_1rm', 'sample gym log', [
    ['2022-04-01', 185], ['2023-04-01', 215], ['2024-04-01', 245], ['2025-04-01', 255],
  ]),
  ...series('deadlift_1rm', 'sample gym log', [
    ['2022-04-01', 225], ['2023-04-01', 255], ['2024-04-01', 275], ['2025-04-01', 285],
  ]),
  ...series('apob', 'sample blood panel', [
    ['2022-02-10', 112], ['2023-02-10', 98], ['2024-02-10', 91], ['2025-02-10', 84], ['2026-02-10', 78],
  ]),
  ...series('hba1c', 'sample blood panel', [
    ['2022-02-10', 5.7], ['2023-02-10', 5.5], ['2024-02-10', 5.4], ['2025-02-10', 5.3], ['2026-02-10', 5.3],
  ]),
  ...series('hs_crp', 'sample blood panel', [
    ['2022-02-10', 2.4], ['2023-02-10', 1.6], ['2024-02-10', 1.1], ['2025-02-10', 0.8], ['2026-02-10', 0.9],
  ]),
  ...series('ldl_cholesterol_calculated', 'sample blood panel', [
    ['2022-02-10', 141], ['2023-02-10', 127], ['2024-02-10', 118], ['2025-02-10', 106], ['2026-02-10', 99],
  ]),
  ...series('hdl_cholesterol', 'sample blood panel', [
    ['2022-02-10', 42], ['2023-02-10', 46], ['2024-02-10', 49], ['2025-02-10', 53], ['2026-02-10', 55],
  ]),
  ...series('triglycerides', 'sample blood panel', [
    ['2022-02-10', 168], ['2023-02-10', 139], ['2024-02-10', 121], ['2025-02-10', 96], ['2026-02-10', 88],
  ]),
  ...series('vitamin_d', 'sample blood panel', [
    ['2022-02-10', 22], ['2023-02-10', 31], ['2024-02-10', 44], ['2025-02-10', 52], ['2026-02-10', 49],
  ]),
];

export const SEED_ATLAS = [
  { kind: 'city_lived', name: 'Duluth, Minnesota', years: 18 },
  { kind: 'city_lived', name: 'Madison, Wisconsin', years: 4 },
  { kind: 'city_lived', name: 'Valparaíso, Chile', years: 1 },
  { kind: 'city_lived', name: 'Denver, Colorado', detail: 'current' },
  { kind: 'country', name: 'United States' },
  { kind: 'country', name: 'Canada' },
  { kind: 'country', name: 'Mexico', detail: 'first dives' },
  { kind: 'country', name: 'Chile', detail: 'semester abroad' },
  { kind: 'country', name: 'Argentina' },
  { kind: 'country', name: 'Peru' },
  { kind: 'country', name: 'Iceland', detail: 'northern lights' },
  { kind: 'country', name: 'Portugal' },
  { kind: 'country', name: 'Spain' },
  { kind: 'country', name: 'Japan' },
  { kind: 'country', name: 'China' },
  { kind: 'state', name: 'Minnesota' },
  { kind: 'state', name: 'Wisconsin' },
  { kind: 'state', name: 'Colorado' },
  { kind: 'state', name: 'Utah' },
  { kind: 'state', name: 'Wyoming' },
  { kind: 'state', name: 'Montana' },
  { kind: 'state', name: 'California' },
  { kind: 'state', name: 'Washington' },
  { kind: 'state', name: 'Maine' },
  { kind: 'province', name: 'Sichuan' },
  { kind: 'province', name: 'Yunnan' },
  { kind: 'park', name: 'Rocky Mountain' },
  { kind: 'park', name: 'Arches' },
  { kind: 'park', name: 'Zion' },
  { kind: 'park', name: 'Grand Teton' },
  { kind: 'park', name: 'Glacier' },
  { kind: 'park', name: 'Olympic' },
  { kind: 'park', name: 'Acadia' },
  { kind: 'animal_seen', name: 'Moose' },
  { kind: 'animal_seen', name: 'Bighorn sheep' },
  { kind: 'animal_seen', name: 'Mountain goat' },
  { kind: 'animal_seen', name: 'Pika' },
  { kind: 'animal_seen', name: 'Humpback whale' },
  { kind: 'animal_seen', name: 'Green sea turtle' },
  { kind: 'animal_seen', name: 'Eagle ray' },
  { kind: 'animal_seen', name: 'Condor' },
  { kind: 'animal_eaten', name: 'Chicken' },
  { kind: 'animal_eaten', name: 'Cow' },
  { kind: 'animal_eaten', name: 'Salmon' },
  { kind: 'animal_eaten', name: 'Octopus' },
  { kind: 'animal_eaten', name: 'Sea urchin' },
  { kind: 'animal_eaten', name: 'Bison' },
  { kind: 'animal_eaten', name: 'Elk' },
  { kind: 'animal_eaten', name: 'Guinea pig', detail: 'Cusco' },
];

export const SEED_PROFILE = {
  display_name: 'Rowan Abernathy',
  other_name: 'Ro',
  species: 'Homo sapiens',
  ethnicity: '',
  birthday: '1991-08-14',
  birthplace: 'Duluth, Minnesota',
  title: 'Sample character · Climber · Woodworker',
  life_expectancy_years: 90,
  gold_label: 'Net worth',
};
