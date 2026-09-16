/**
 * Pick-lists. Ticking from a list is far faster than typing names one by one,
 * and it keeps spelling consistent so counts stay honest.
 */

export const CONTINENTS: Record<string, string[]> = {
  'North America': [
    'United States', 'Canada', 'Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador',
    'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Jamaica', 'Haiti', 'Dominican Republic',
    'Bahamas', 'Barbados', 'Trinidad and Tobago', 'Saint Lucia', 'Grenada', 'Antigua and Barbuda',
  ],
  'South America': [
    'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Ecuador', 'Bolivia', 'Venezuela',
    'Uruguay', 'Paraguay', 'Guyana', 'Suriname',
  ],
  Europe: [
    'United Kingdom', 'Ireland', 'France', 'Spain', 'Portugal', 'Italy', 'Germany', 'Netherlands',
    'Belgium', 'Luxembourg', 'Switzerland', 'Austria', 'Denmark', 'Norway', 'Sweden', 'Finland',
    'Iceland', 'Poland', 'Czechia', 'Slovakia', 'Hungary', 'Slovenia', 'Croatia', 'Bosnia and Herzegovina',
    'Serbia', 'Montenegro', 'Albania', 'North Macedonia', 'Greece', 'Bulgaria', 'Romania', 'Moldova',
    'Ukraine', 'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Russia', 'Malta', 'Cyprus', 'Monaco', 'Vatican City',
  ],
  Asia: [
    'China', 'Japan', 'South Korea', 'North Korea', 'Taiwan', 'Mongolia', 'Hong Kong', 'Macau',
    'Vietnam', 'Thailand', 'Cambodia', 'Laos', 'Myanmar', 'Malaysia', 'Singapore', 'Indonesia',
    'Philippines', 'Brunei', 'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan',
    'Maldives', 'Afghanistan', 'Kazakhstan', 'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan',
    'Turkey', 'Georgia', 'Armenia', 'Azerbaijan', 'Iran', 'Iraq', 'Israel', 'Palestine', 'Jordan',
    'Lebanon', 'Syria', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Yemen',
  ],
  Africa: [
    'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Sudan', 'Ethiopia', 'Eritrea', 'Djibouti',
    'Somalia', 'Kenya', 'Uganda', 'Rwanda', 'Burundi', 'Tanzania', 'Zambia', 'Zimbabwe', 'Malawi',
    'Mozambique', 'Botswana', 'Namibia', 'South Africa', 'Lesotho', 'Eswatini', 'Madagascar',
    'Mauritius', 'Seychelles', 'Nigeria', 'Ghana', 'Senegal', 'Gambia', 'Mali', 'Burkina Faso',
    'Ivory Coast', 'Liberia', 'Sierra Leone', 'Guinea', 'Togo', 'Benin', 'Niger', 'Chad',
    'Cameroon', 'Gabon', 'Congo', 'DR Congo', 'Angola', 'Central African Republic', 'Cape Verde',
  ],
  Oceania: [
    'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga', 'Vanuatu',
    'Solomon Islands', 'French Polynesia', 'New Caledonia', 'Palau', 'Micronesia', 'Marshall Islands', 'Kiribati',
  ],
  Antarctica: ['Antarctica'],
};

/** Animals seen in the wild, grouped by how you would have seen them. */
export const WILD_ANIMALS: Record<string, string[]> = {
  'African safari': [
    'Lion', 'Leopard', 'Cheetah', 'African elephant', 'Black rhino', 'White rhino', 'Cape buffalo',
    'Giraffe', 'Zebra', 'Hippopotamus', 'Wildebeest', 'Impala', 'Gazelle', 'Warthog', 'Hyena',
    'Baboon', 'Vervet monkey', 'Mongoose', 'Ostrich', 'Secretary bird', 'Nile crocodile', 'Kudu', 'Eland',
  ],
  'Scuba and snorkel': [
    'Reef shark', 'Whale shark', 'Nurse shark', 'Hammerhead shark', 'Manta ray', 'Eagle ray',
    'Stingray', 'Green sea turtle', 'Hawksbill turtle', 'Moray eel', 'Octopus', 'Cuttlefish',
    'Reef squid', 'Barracuda', 'Parrotfish', 'Lionfish', 'Clownfish', 'Grouper', 'Nudibranch',
    'Seahorse', 'Dolphin', 'Sea lion',
  ],
  'Whale watching and coast': [
    'Humpback whale', 'Blue whale', 'Gray whale', 'Orca', 'Sperm whale', 'Harbor seal',
    'Elephant seal', 'Sea otter', 'Puffin', 'Albatross', 'Pelican',
  ],
  'Mountain and forest': [
    'Black bear', 'Grizzly bear', 'Moose', 'Elk', 'Mule deer', 'White-tailed deer', 'Bighorn sheep',
    'Mountain goat', 'Marmot', 'Pika', 'Coyote', 'Red fox', 'Bobcat', 'Mountain lion', 'Wolf',
    'Porcupine', 'Beaver', 'River otter', 'Raccoon',
  ],
  'Jungle and tropics': [
    'Howler monkey', 'Spider monkey', 'Capuchin monkey', 'Sloth', 'Toucan', 'Scarlet macaw',
    'Poison dart frog', 'Iguana', 'Anaconda', 'Jaguar', 'Tapir', 'Coati', 'Orangutan', 'Gibbon',
    'Komodo dragon', 'Flying fox',
  ],
  'Polar and alpine': [
    'Polar bear', 'Arctic fox', 'Reindeer', 'Musk ox', 'Snowy owl', 'Penguin', 'Walrus', 'Snow leopard', 'Yak',
  ],
  'Birds of prey and sky': [
    'Bald eagle', 'Golden eagle', 'Osprey', 'Peregrine falcon', 'Red-tailed hawk', 'Condor',
    'Great horned owl', 'Vulture', 'Heron', 'Crane', 'Flamingo',
  ],
};

/** Animals eaten, ordered common first so the list is quick to work down. */
export const EATEN_ANIMALS: { group: string; items: string[] }[] = [
  { group: 'Everyday', items: ['Chicken', 'Pig', 'Cow', 'Sheep', 'Turkey', 'Duck', 'Salmon', 'Tuna', 'Cod', 'Shrimp'] },
  { group: 'Common enough', items: ['Goat', 'Lamb', 'Goose', 'Quail', 'Rabbit', 'Crab', 'Lobster', 'Clam', 'Mussel', 'Oyster', 'Scallop', 'Squid', 'Octopus', 'Eel', 'Trout', 'Halibut', 'Sardine', 'Anchovy', 'Mackerel', 'Sea bass', 'Sea urchin', 'Snail'] },
  { group: 'Getting unusual', items: ['Venison', 'Wild boar', 'Bison', 'Elk', 'Pheasant', 'Pigeon', 'Frog', 'Turtle', 'Alligator', 'Ostrich', 'Emu', 'Kangaroo', 'Horse', 'Camel', 'Reindeer', 'Jellyfish', 'Abalone', 'Crawfish'] },
  { group: 'Rare', items: ['Crocodile', 'Snake', 'Guinea pig', 'Yak', 'Llama', 'Shark', 'Whale', 'Puffin', 'Crickets', 'Mealworms', 'Ants', 'Scorpion', 'Silkworm', 'Balut', 'Blood sausage', 'Bone marrow', 'Tripe', 'Sweetbreads'] },
];

export const CONTINENT_OF: Record<string, string> = Object.fromEntries(
  Object.entries(CONTINENTS).flatMap(([c, list]) => list.map((n) => [n, c])),
);

export const TOTAL_COUNTRIES = Object.values(CONTINENTS).reduce((n, l) => n + l.length, 0);

export const US_STATES: Record<string, string[]> = {
  West: ['California','Oregon','Washington','Nevada','Arizona','Idaho','Montana','Wyoming','Colorado','Utah','New Mexico','Alaska','Hawaii'],
  Midwest: ['Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri','Nebraska','North Dakota','Ohio','South Dakota','Wisconsin'],
  South: ['Alabama','Arkansas','Delaware','Florida','Georgia','Kentucky','Louisiana','Maryland','Mississippi','North Carolina','Oklahoma','South Carolina','Tennessee','Texas','Virginia','West Virginia','Washington DC'],
  Northeast: ['Connecticut','Maine','Massachusetts','New Hampshire','New Jersey','New York','Pennsylvania','Rhode Island','Vermont'],
};

export const CHINA_PROVINCES: Record<string, string[]> = {
  'Municipalities': ['Beijing','Shanghai','Tianjin','Chongqing'],
  'East': ['Jiangsu','Zhejiang','Anhui','Fujian','Jiangxi','Shandong'],
  'North & Northeast': ['Hebei','Shanxi','Inner Mongolia','Liaoning','Jilin','Heilongjiang'],
  'Central & South': ['Henan','Hubei','Hunan','Guangdong','Guangxi','Hainan'],
  'Southwest': ['Sichuan','Guizhou','Yunnan','Tibet'],
  'Northwest': ['Shaanxi','Gansu','Qinghai','Ningxia','Xinjiang'],
  'Special': ['Hong Kong','Macau','Taiwan'],
};

export const TOTAL_STATES = Object.values(US_STATES).reduce((n, l) => n + l.length, 0);
export const TOTAL_PROVINCES = Object.values(CHINA_PROVINCES).reduce((n, l) => n + l.length, 0);

/**
 * Emoji exist for maybe a third of these, so the rest fall back to a glyph for
 * their family. That keeps every row visually anchored instead of half of them
 * having an icon and half not.
 */
const EXACT: Record<string, string> = {
  Lion: '🦁', Leopard: '🐆', Cheetah: '🐆', 'African elephant': '🐘', 'Black rhino': '🦏',
  'White rhino': '🦏', 'Cape buffalo': '🐃', Giraffe: '🦒', Zebra: '🦓', Hippopotamus: '🦛',
  Warthog: '🐗', Baboon: '🐒', 'Vervet monkey': '🐒', Ostrich: '🦩', 'Nile crocodile': '🐊',
  'Reef shark': '🦈', 'Whale shark': '🦈', 'Nurse shark': '🦈', 'Hammerhead shark': '🦈',
  'Manta ray': '🐟', 'Eagle ray': '🐟', Stingray: '🐟', 'Green sea turtle': '🐢',
  'Hawksbill turtle': '🐢', Octopus: '🐙', 'Reef squid': '🦑', Clownfish: '🐠',
  Parrotfish: '🐠', Lionfish: '🐠', Grouper: '🐟', Seahorse: '🐠', Dolphin: '🐬',
  'Sea lion': '🦭', 'Humpback whale': '🐋', 'Blue whale': '🐋', 'Gray whale': '🐋',
  Orca: '🐋', 'Sperm whale': '🐋', 'Harbor seal': '🦭', 'Elephant seal': '🦭', 'Sea otter': '🦦',
  Puffin: '🐦', Albatross: '🐦', Pelican: '🐦', 'Black bear': '🐻', 'Grizzly bear': '🐻',
  Moose: '🫎', Elk: '🦌', 'Mule deer': '🦌', 'White-tailed deer': '🦌', 'Bighorn sheep': '🐏',
  'Mountain goat': '🐐', Coyote: '🐺', 'Red fox': '🦊', Wolf: '🐺', Beaver: '🦫',
  'River otter': '🦦', Raccoon: '🦝', 'Howler monkey': '🐒', 'Spider monkey': '🐒',
  'Capuchin monkey': '🐒', Sloth: '🦥', Toucan: '🦜', 'Scarlet macaw': '🦜',
  'Poison dart frog': '🐸', Iguana: '🦎', Anaconda: '🐍', Jaguar: '🐆', Orangutan: '🦧',
  Gibbon: '🐒', 'Komodo dragon': '🦎', 'Flying fox': '🦇', 'Polar bear': '🐻‍❄️',
  'Arctic fox': '🦊', Reindeer: '🦌', 'Snowy owl': '🦉', Penguin: '🐧', Walrus: '🦭',
  Yak: '🐂', 'Bald eagle': '🦅', 'Golden eagle': '🦅', Osprey: '🦅', 'Peregrine falcon': '🦅',
  'Red-tailed hawk': '🦅', Condor: '🦅', 'Great horned owl': '🦉', Vulture: '🦅',
  Heron: '🦩', Crane: '🦩', Flamingo: '🦩',
  Chicken: '🐔', Pig: '🐖', Cow: '🐄', Sheep: '🐑', Turkey: '🦃', Duck: '🦆',
  Salmon: '🐟', Tuna: '🐟', Cod: '🐟', Shrimp: '🦐', Goat: '🐐', Lamb: '🐑', Goose: '🦆',
  Quail: '🐦', Rabbit: '🐇', Crab: '🦀', Lobster: '🦞', Clam: '🦪', Mussel: '🦪',
  Oyster: '🦪', Scallop: '🦪', Squid: '🦑', Eel: '🐟', Trout: '🐟', Halibut: '🐟',
  Sardine: '🐟', Anchovy: '🐟', Mackerel: '🐟', 'Sea bass': '🐟', Snail: '🐌',
  Venison: '🦌', 'Wild boar': '🐗', Bison: '🦬', Pheasant: '🐦', Pigeon: '🕊️',
  Frog: '🐸', Turtle: '🐢', Alligator: '🐊', Emu: '🦤', Kangaroo: '🦘', Horse: '🐎',
  Camel: '🐪', Jellyfish: '🪼', Crocodile: '🐊', Snake: '🐍', 'Guinea pig': '🐹',
  Llama: '🦙', Shark: '🦈', Whale: '🐋', Crickets: '🦗', Ants: '🐜', Scorpion: '🦂',
};

const FAMILY: [RegExp, string][] = [
  [/shark|fish|tuna|cod|bass|eel|ray/i, '🐟'],
  [/whale|dolphin/i, '🐋'],
  [/seal|otter|walrus/i, '🦭'],
  [/monkey|ape|gibbon/i, '🐒'],
  [/bear/i, '🐻'],
  [/deer|elk|moose|antelope|gazelle|impala|kudu|eland|wildebeest/i, '🦌'],
  [/owl|eagle|hawk|falcon|bird|macaw|toucan|puffin/i, '🦅'],
  [/snake|python|viper|cobra/i, '🐍'],
  [/lizard|gecko|iguana|dragon/i, '🦎'],
  [/crab|lobster|shrimp|crawfish/i, '🦐'],
  [/oyster|clam|mussel|scallop|abalone|urchin/i, '🦪'],
  [/worm|cricket|ant|insect|silkworm/i, '🦗'],
  [/cat|lion|leopard|cheetah|jaguar|lynx|bobcat|puma|cougar/i, '🐆'],
  [/fox|wolf|coyote|dog|hyena|jackal/i, '🐺'],
];

export function animalIcon(name: string): string {
  if (EXACT[name]) return EXACT[name];
  for (const [re, icon] of FAMILY) if (re.test(name)) return icon;
  return '◆';
}

/** One shared ladder, so "Advanced" means the same in every sport. */
export const SPORT_LADDER: [string, number][] = [
  ['Tried it', 10],
  ['Beginner', 25],
  ['Intermediate', 50],
  ['Advanced', 75],
  ['Expert', 100],
];

export const SPORTS: Record<string, string[]> = {
  'Ball & team': ['Basketball','Soccer','American football','Baseball','Volleyball','Beach volleyball','Ultimate frisbee','Hockey','Lacrosse','Rugby','Cricket','Handball','Water polo'],
  'Racquet & paddle': ['Tennis','Table tennis','Badminton','Pickleball','Squash','Padel','Racquetball'],
  'Combat': ['Jiu-jitsu','Wrestling','Boxing','Muay Thai','Judo','Karate','Taekwondo','MMA','Fencing'],
  'Water': ['Swimming','Surfing','Scuba diving','Freediving','Sailing','Kayaking','Rowing','Paddleboarding','Kitesurfing','Wakeboarding','Water skiing'],
  'Snow & ice': ['Skiing','Snowboarding','Ice skating','Ski touring','Cross-country skiing'],
  'Endurance': ['Running','Trail running','Road cycling','Mountain biking','Triathlon'],
  'Mountain & outdoor': ['Hiking','Backpacking','Mountaineering','Climbing (outdoor)','Climbing (indoor)','Bouldering','Ice climbing','Canyoneering','Skydiving','Paragliding'],
  'Strength & movement': ['Weightlifting','Powerlifting','CrossFit','Gymnastics','Calisthenics','Parkour'],
  'Precision & other': ['Golf','Archery','Shooting','Bowling','Billiards','Horse riding','Motorsport'],
};


/**
 * What each rung means for a given sport. Without an anchor, "Intermediate" is
 * a vibe; with one it is a fact you either have or do not.
 */
export const SPORT_CRITERIA: Record<string, [string, string, string, string]> = {
  //                       Beginner                Intermediate              Advanced                    Expert
  'Scuba diving':        ['Open Water certified', 'Advanced Open Water',    'Rescue Diver, 50+ dives',  'Divemaster or 100+ dives'],
  Freediving:            ['Can equalise, 5 m',    '15 m constant weight',   '30 m, static 3 min',       '40 m+, competition'],
  'Jiu-jitsu':           ['White belt',           'Blue belt',              'Purple or brown belt',     'Black belt'],
  Judo:                  ['White to yellow belt', 'Green to blue belt',     'Brown belt',               'Black belt'],
  Karate:                ['White to orange belt', 'Green to blue belt',     'Brown belt',               'Black belt'],
  Taekwondo:             ['White to yellow belt', 'Green to blue belt',     'Red belt',                 'Black belt'],
  Boxing:                ['Can hold form, bagwork','Regular sparring',      'Amateur bouts',            'Competed seriously'],
  'Muay Thai':           ['Basic strikes, bagwork','Regular sparring',      'Amateur bouts',            'Competed seriously'],
  Wrestling:             ['Learned the basics',   'School team',            'Varsity or college',       'Competed nationally'],
  Skiing:                ['Green and blue runs',  'Black runs, parallel',   'Moguls, steeps, off-piste','Backcountry, big lines'],
  Snowboarding:          ['Linking turns',        'Black runs confidently', 'Park or off-piste',        'Backcountry, big lines'],
  Surfing:               ['Whitewater, pop-up',   'Green waves, unbroken',  'Overhead, reef breaks',    'Double overhead, barrels'],
  Running:               ['Can run 5K',           'Half marathon',          'Marathon',                 'Sub-3 marathon or ultra'],
  'Trail running':       ['Can run 5K on trail',  'Half on trail',          '50K ultra',                '100K+ or major vert'],
  Triathlon:             ['Sprint distance',      'Olympic distance',       'Half Ironman',             'Full Ironman'],
  Swimming:              ['Comfortable 4 strokes','1 km continuous',        'Open water 2 km+',         'Masters or competitive'],
  'Road cycling':        ['Comfortable 20 km',    '100 km ride',            'Century, climbs',          'Racing, cat 3+'],
  'Mountain biking':     ['Green trails',         'Blue trails',            'Black trails, drops',      'Double black, racing'],
  Climbing: ['5.7 top rope', '5.10 lead', '5.12 or multi-pitch trad', '5.13+ or big walls'],
  'Climbing (indoor)':   ['5.7 top rope',         '5.10 lead',              '5.12 routes',              '5.13+ routes'],
  'Climbing (outdoor)':  ['Top rope outside',     'Lead sport climbs',      'Trad or multi-pitch',      'Big walls, hard trad'],
  Bouldering:            ['V0 to V2',             'V3 to V4',               'V5 to V7',                 'V8+'],
  Mountaineering:        ['Non-technical peaks',  'Glacier travel, ropes',  'Technical alpine routes',  'Expedition, 8000 m'],
  'Ice climbing':        ['WI2 top rope',         'WI3 lead',               'WI4 to WI5',               'WI6+, mixed'],
  Tennis:                ['Rallying, NTRP 2.5',   'NTRP 3.5, league',       'NTRP 4.5+',                'Open or college level'],
  'Table tennis':        ['Can rally, serve',     'Spin, club play',        'League rated',             'Competitive rated'],
  Golf:                  ['Breaking 120',         'Breaking 100',           'Breaking 85',              'Single-digit handicap'],
  Basketball:            ['Pickup games',         'Organised league',       'Varsity level',            'College or semi-pro'],
  Soccer:                ['Pickup games',         'Organised league',       'Varsity level',            'College or semi-pro'],
  Volleyball:            ['Pickup games',         'Organised league',       'Varsity level',            'College or semi-pro'],
  Yoga:                  ['Regular beginner class','Comfortable in flow',   'Inversions, arm balances', 'Teaching level'],
  Gymnastics:            ['Basic shapes',         'Handstand, cartwheel',   'Muscle-up, levers',        'Planche, competition'],
  Calisthenics:          ['Pull-ups, dips',       'Muscle-up',              'Front lever, handstand',   'Planche, one-arm pull-up'],
  Powerlifting:          ['Learned the three lifts','1x bodyweight squat',  '2x bodyweight squat',      'Competitive total'],
  Weightlifting:         ['Learned the lifts',    'Bodyweight clean',       '1.5x bodyweight clean',    'Competitive total'],
  Sailing:               ['Crewed a boat',        'Can skipper a dinghy',   'Offshore passages',        'Racing or ocean crossing'],
  Skydiving:             ['Tandem jump',          'A licence',              'B or C licence',           'D licence, 500+ jumps'],
};

export const SPORT_CRITERIA_DEFAULT: [string, string, string, string] = [
  'Know the basics, can play',
  'Play regularly, hold your own',
  'Better than most who play',
  'Competitive or coaching level',
];

export const HOBBIES: Record<string, string[]> = {
  'Making': ['Pottery','Woodworking','Metalworking','Leatherwork','Sewing','Knitting','Candlemaking','3D printing','Electronics','Model building'],
  'Visual': ['Drawing','Painting','Photography','Film photography','Calligraphy','Graphic design','Animation','Video editing'],
  'Music': ['Guitar','Piano','Drums','Bass','Violin','Singing','Music production','DJing'],
  'Food & drink': ['Cooking','Baking','Bread','Barbecue','Fermentation','Coffee','Tea','Wine','Mixology','Butchery'],
  'Mind & games': ['Chess','Go','Poker','Board games','Video games','Puzzles','Magic','Juggling'],
  'Words': ['Reading','Creative writing','Poetry','Journaling','Podcasting','Public speaking','Stand-up comedy'],
  'Outdoors & nature': ['Gardening','Birdwatching','Fishing','Foraging','Camping','Astronomy','Beekeeping','Aquariums'],
  'Practice': ['Meditation','Breathwork','Language learning','Investing','Volunteering','Collecting'],
};

export const TOTAL_HOBBIES = Object.values(HOBBIES).reduce((n, l) => n + l.length, 0);

const ICONS: Record<string, string> = {
  Basketball:'🏀', Soccer:'⚽', 'American football':'🏈', Baseball:'⚾', Volleyball:'🏐',
  'Beach volleyball':'🏐', 'Ultimate frisbee':'🥏', Hockey:'🏒', Lacrosse:'🥍', Rugby:'🏉',
  Cricket:'🏏', Handball:'🤾', 'Water polo':'🤽', Tennis:'🎾', 'Table tennis':'🏓',
  Badminton:'🏸', Pickleball:'🏓', Squash:'🎾', Padel:'🎾', Racquetball:'🎾',
  'Jiu-jitsu':'🥋', Wrestling:'🤼', Boxing:'🥊', 'Muay Thai':'🥊', Judo:'🥋', Karate:'🥋',
  Taekwondo:'🥋', MMA:'🥊', Fencing:'🤺', Swimming:'🏊', Surfing:'🏄', 'Scuba diving':'🤿',
  Freediving:'🤿', Sailing:'⛵', Kayaking:'🛶', Rowing:'🚣', Paddleboarding:'🏄',
  Kitesurfing:'🪁', Wakeboarding:'🏄', 'Water skiing':'🎿', Skiing:'⛷️', Snowboarding:'🏂',
  'Ice skating':'⛸️', 'Ski touring':'🎿', 'Cross-country skiing':'🎿', Running:'🏃',
  'Trail running':'🏃', 'Road cycling':'🚴', 'Mountain biking':'🚵', Triathlon:'🏊',
  Hiking:'🥾', Backpacking:'🎒', Mountaineering:'🏔️', 'Climbing (outdoor)':'🧗',
  'Climbing (indoor)':'🧗', Bouldering:'🧗', 'Ice climbing':'🧊', Canyoneering:'🏞️',
  Skydiving:'🪂', Paragliding:'🪂', Weightlifting:'🏋️', Powerlifting:'🏋️', CrossFit:'🏋️',
  Gymnastics:'🤸', Calisthenics:'🤸', Parkour:'🤸', Golf:'⛳', Archery:'🏹', Shooting:'🎯',
  Bowling:'🎳', Billiards:'🎱', 'Horse riding':'🏇', Motorsport:'🏎️',
  Pottery:'🏺', Woodworking:'🪵', Metalworking:'⚒️', Leatherwork:'🧰', Sewing:'🧵',
  Knitting:'🧶', Candlemaking:'🕯️', '3D printing':'🖨️', Electronics:'🔌', 'Model building':'🧩',
  Drawing:'✏️', Painting:'🎨', Photography:'📷', 'Film photography':'📸', Calligraphy:'🖌️',
  'Graphic design':'🖥️', Animation:'🎬', 'Video editing':'🎞️', Guitar:'🎸', Piano:'🎹',
  Drums:'🥁', Bass:'🎸', Violin:'🎻', Singing:'🎤', 'Music production':'🎛️', DJing:'🎧',
  Cooking:'🍳', Baking:'🧁', Bread:'🍞', Barbecue:'🍖', Fermentation:'🫙', Coffee:'☕',
  Tea:'🍵', Wine:'🍷', Mixology:'🍸', Butchery:'🔪', Chess:'♟️', Go:'⚫', Poker:'🃏',
  'Board games':'🎲', 'Video games':'🎮', Puzzles:'🧩', Magic:'🎩', Juggling:'🤹',
  Reading:'📚', 'Creative writing':'✍️', Poetry:'🪶', Journaling:'📓', Podcasting:'🎙️',
  'Public speaking':'🗣️', 'Stand-up comedy':'🎤', Gardening:'🌱', Birdwatching:'🦉',
  Fishing:'🎣', Foraging:'🍄', Camping:'⛺', Astronomy:'🔭', Beekeeping:'🐝', Aquariums:'🐠',
  Meditation:'🧘', Breathwork:'🌬️', 'Language learning':'🗣️', Investing:'📈',
  Volunteering:'🤝', Collecting:'🗃️', Dance:'💃', Yoga:'🧘', Pilates:'🧘',
  // core skills
  Strength:'🏋️', Cardio:'🏃', Mobility:'🤸', Climbing:'🧗', Diving:'🤿',
  Mandarin:'🀄', Spanish:'🇪🇸', Japanese:'🇯🇵', Learning:'📖', Company:'🏢',
  Writing:'✍️', Exploring:'🧭',
};

export function skillIcon(name: string): string {
  return ICONS[name] ?? '◆';
}

/** The 63 US national parks, with coordinates so they can be plotted. */
export const NATIONAL_PARKS: { name: string; state: string; lat: number; lon: number }[] = [
  { name: 'Acadia', state: 'ME', lat: 44.35, lon: -68.21 },
  { name: 'American Samoa', state: 'AS', lat: -14.26, lon: -170.68 },
  { name: 'Arches', state: 'UT', lat: 38.73, lon: -109.59 },
  { name: 'Badlands', state: 'SD', lat: 43.86, lon: -102.34 },
  { name: 'Big Bend', state: 'TX', lat: 29.25, lon: -103.25 },
  { name: 'Biscayne', state: 'FL', lat: 25.49, lon: -80.21 },
  { name: 'Black Canyon of the Gunnison', state: 'CO', lat: 38.57, lon: -107.72 },
  { name: 'Bryce Canyon', state: 'UT', lat: 37.57, lon: -112.18 },
  { name: 'Canyonlands', state: 'UT', lat: 38.20, lon: -109.93 },
  { name: 'Capitol Reef', state: 'UT', lat: 38.37, lon: -111.27 },
  { name: 'Carlsbad Caverns', state: 'NM', lat: 32.17, lon: -104.44 },
  { name: 'Channel Islands', state: 'CA', lat: 34.01, lon: -119.42 },
  { name: 'Congaree', state: 'SC', lat: 33.78, lon: -80.78 },
  { name: 'Crater Lake', state: 'OR', lat: 42.94, lon: -122.14 },
  { name: 'Cuyahoga Valley', state: 'OH', lat: 41.24, lon: -81.55 },
  { name: 'Death Valley', state: 'CA', lat: 36.51, lon: -117.08 },
  { name: 'Denali', state: 'AK', lat: 63.33, lon: -150.50 },
  { name: 'Dry Tortugas', state: 'FL', lat: 24.63, lon: -82.87 },
  { name: 'Everglades', state: 'FL', lat: 25.32, lon: -80.93 },
  { name: 'Gates of the Arctic', state: 'AK', lat: 67.78, lon: -153.30 },
  { name: 'Gateway Arch', state: 'MO', lat: 38.63, lon: -90.19 },
  { name: 'Glacier', state: 'MT', lat: 48.80, lon: -114.00 },
  { name: 'Glacier Bay', state: 'AK', lat: 58.67, lon: -136.90 },
  { name: 'Grand Canyon', state: 'AZ', lat: 36.06, lon: -112.14 },
  { name: 'Grand Teton', state: 'WY', lat: 43.73, lon: -110.80 },
  { name: 'Great Basin', state: 'NV', lat: 38.98, lon: -114.30 },
  { name: 'Great Sand Dunes', state: 'CO', lat: 37.73, lon: -105.51 },
  { name: 'Great Smoky Mountains', state: 'TN', lat: 35.68, lon: -83.53 },
  { name: 'Guadalupe Mountains', state: 'TX', lat: 31.92, lon: -104.87 },
  { name: 'Haleakalā', state: 'HI', lat: 20.72, lon: -156.17 },
  { name: 'Hawaiʻi Volcanoes', state: 'HI', lat: 19.38, lon: -155.20 },
  { name: 'Hot Springs', state: 'AR', lat: 34.51, lon: -93.05 },
  { name: 'Indiana Dunes', state: 'IN', lat: 41.63, lon: -87.05 },
  { name: 'Isle Royale', state: 'MI', lat: 48.10, lon: -88.55 },
  { name: 'Joshua Tree', state: 'CA', lat: 33.79, lon: -115.90 },
  { name: 'Katmai', state: 'AK', lat: 58.50, lon: -155.00 },
  { name: 'Kenai Fjords', state: 'AK', lat: 59.92, lon: -149.65 },
  { name: 'Kings Canyon', state: 'CA', lat: 36.89, lon: -118.55 },
  { name: 'Kobuk Valley', state: 'AK', lat: 67.55, lon: -159.28 },
  { name: 'Lake Clark', state: 'AK', lat: 60.97, lon: -153.42 },
  { name: 'Lassen Volcanic', state: 'CA', lat: 40.49, lon: -121.51 },
  { name: 'Mammoth Cave', state: 'KY', lat: 37.19, lon: -86.10 },
  { name: 'Mesa Verde', state: 'CO', lat: 37.23, lon: -108.46 },
  { name: 'Mount Rainier', state: 'WA', lat: 46.85, lon: -121.75 },
  { name: 'New River Gorge', state: 'WV', lat: 37.92, lon: -81.06 },
  { name: 'North Cascades', state: 'WA', lat: 48.70, lon: -121.20 },
  { name: 'Olympic', state: 'WA', lat: 47.80, lon: -123.60 },
  { name: 'Petrified Forest', state: 'AZ', lat: 35.07, lon: -109.78 },
  { name: 'Pinnacles', state: 'CA', lat: 36.49, lon: -121.16 },
  { name: 'Redwood', state: 'CA', lat: 41.40, lon: -124.00 },
  { name: 'Rocky Mountain', state: 'CO', lat: 40.40, lon: -105.58 },
  { name: 'Saguaro', state: 'AZ', lat: 32.25, lon: -110.50 },
  { name: 'Sequoia', state: 'CA', lat: 36.43, lon: -118.68 },
  { name: 'Shenandoah', state: 'VA', lat: 38.53, lon: -78.35 },
  { name: 'Theodore Roosevelt', state: 'ND', lat: 46.98, lon: -103.54 },
  { name: 'Virgin Islands', state: 'VI', lat: 18.34, lon: -64.73 },
  { name: 'Voyageurs', state: 'MN', lat: 48.50, lon: -92.88 },
  { name: 'White Sands', state: 'NM', lat: 32.78, lon: -106.17 },
  { name: 'Wind Cave', state: 'SD', lat: 43.57, lon: -103.48 },
  { name: 'Wrangell–St. Elias', state: 'AK', lat: 61.00, lon: -142.00 },
  { name: 'Yellowstone', state: 'WY', lat: 44.60, lon: -110.50 },
  { name: 'Yosemite', state: 'CA', lat: 37.83, lon: -119.50 },
  { name: 'Zion', state: 'UT', lat: 37.30, lon: -113.05 },
];

export const PARKS_BY_REGION: Record<string, string[]> = {
  'California & Hawaii': ['Yosemite','Sequoia','Kings Canyon','Death Valley','Joshua Tree','Redwood','Lassen Volcanic','Pinnacles','Channel Islands','Haleakalā','Hawaiʻi Volcanoes'],
  'Southwest': ['Grand Canyon','Zion','Bryce Canyon','Arches','Canyonlands','Capitol Reef','Petrified Forest','Saguaro','Carlsbad Caverns','White Sands','Great Basin','Mesa Verde'],
  'Rockies & Plains': ['Yellowstone','Grand Teton','Glacier','Rocky Mountain','Great Sand Dunes','Black Canyon of the Gunnison','Badlands','Wind Cave','Theodore Roosevelt'],
  'Pacific Northwest': ['Mount Rainier','Olympic','North Cascades','Crater Lake'],
  Alaska: ['Denali','Kenai Fjords','Glacier Bay','Katmai','Lake Clark','Wrangell–St. Elias','Gates of the Arctic','Kobuk Valley'],
  'East & South': ['Acadia','Great Smoky Mountains','Shenandoah','New River Gorge','Congaree','Mammoth Cave','Cuyahoga Valley','Indiana Dunes','Isle Royale','Voyageurs','Gateway Arch','Hot Springs','Everglades','Biscayne','Dry Tortugas','Big Bend','Guadalupe Mountains','Virgin Islands','American Samoa'],
};

export const TOTAL_PARKS = 63;
