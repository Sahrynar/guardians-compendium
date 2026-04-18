// ── Unique ID generator ────────────────────────────────────────
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ── Book options ───────────────────────────────────────────────
export const BKS = [
  'Ancient', 'Pre-Series', 'Book 1', 'Between B1–B2',
  'Book 2', 'Between B2–B3', 'Book 3', 'Book 4', 'Book 5', 'Future'
]

// ── Status options ─────────────────────────────────────────────
export const STS = ['locked', 'provisional', 'open', 'exploratory']
export const SL = {
  locked: 'Locked', provisional: 'Provisional',
  open: 'Open', exploratory: 'Exploratory'
}

// ── Time ratio ─────────────────────────────────────────────────
export const RATIO = 8.52
export const LDAYS = 360
export const MDAYS = 365.25
export const LDPM = 30

// ── Lajen months ───────────────────────────────────────────────
export const MONTHS = [
  { n: 'Akatriluna',  s: 'Akatriel (F)', inc: 'Lila',     num: 1,  eq: 'Jun 21–Jul 21',  ssn: 'Summer',  si: 0 },
  { n: 'Zacharlune',  s: 'Zacharael (M)', inc: 'Martyn',   num: 2,  eq: 'Jul 21–Aug 21',  ssn: 'Summer',  si: 1 },
  { n: 'Sofiluna',    s: 'Sofiel (F)',    inc: 'Ehmma',    num: 3,  eq: 'Aug 21–Sep 21',  ssn: 'Summer',  si: 2 },
  { n: 'Trgilune',    s: 'Trgianol (M)',  inc: 'Trevin',   num: 4,  eq: 'Sep 21–Oct 22',  ssn: 'Harvest', si: 0 },
  { n: 'Sachalune',   s: 'Sachael (F)',   inc: 'Marhanna', num: 5,  eq: 'Oct 22–Nov 21',  ssn: 'Harvest', si: 1 },
  { n: 'Rhamilune',   s: 'Rhamiel (M)',   inc: 'Thomas',   num: 6,  eq: 'Nov 21–Dec 21',  ssn: 'Harvest', si: 2 },
  { n: 'Mailuna',     s: 'Maion (F)',     inc: 'Aenya',    num: 7,  eq: 'Dec 22–Jan 21',  ssn: 'Winter',  si: 0 },
  { n: 'Iahlune',     s: 'Iahhel (M)',    inc: 'Risben',   num: 8,  eq: 'Jan 21–Feb 20',  ssn: 'Winter',  si: 1 },
  { n: 'Liweluna',    s: 'Liwet (F)',     inc: 'Saraenya', num: 9,  eq: 'Feb 20–Mar 22',  ssn: 'Winter',  si: 2 },
  { n: 'Valolune',    s: 'Valoel (M)',    inc: 'Gillison', num: 10, eq: 'Mar 22–Apr 21',  ssn: 'Spring',  si: 0 },
  { n: 'Sraoluna',    s: 'Sraosha (F)',   inc: 'Dakane',   num: 11, eq: 'Apr 21–May 21',  ssn: 'Spring',  si: 1 },
  { n: 'Elemilune',   s: 'Elemiah (M)',   inc: 'Nataru',   num: 12, eq: 'May 21–Jun 20',  ssn: 'Spring',  si: 2 },
]

export const WEEKDAYS = ['Onesday', 'Twosday', 'Threesday', 'Foursday', 'Fivesday']

// ── Season colors — midpoint system ───────────────────────────
// Each season: [month1_color, month2_midpoint, month3_color]
// Summer: violet → magenta-purple midpoint → deep pink
// Harvest: amber → burnt orange midpoint → almost-red dark orange
// Winter: deep navy → true mid-blue → icy periwinkle
// Spring: deep forest green → bright lime → aqua-teal (wider spread for contrast)
export const SEASON_COLORS = {
  Summer:  ['#9d4edd', '#b940b0', '#d63384'],
  Harvest: ['#ffb700', '#d46c00', '#aa2200'],
  Winter:  ['#1a3a8f', '#4488cc', '#99ccee'],
  Spring:  ['#1a7a2e', '#5cd65c', '#00c4b0'],
}

// Per-month hex colors for calendar display
export const MONTH_COLORS = [
  '#9d4edd', // 1 Akatriluna — violet
  '#b940b0', // 2 Zacharlune — magenta-purple (midpoint)
  '#d63384', // 3 Sofiluna   — deep pink
  '#ffb700', // 4 Trgilune   — amber
  '#d46c00', // 5 Sachaluna  — burnt orange (midpoint)
  '#aa2200', // 6 Rhamilune  — almost-red dark orange
  '#1a3a8f', // 7 Mailuna    — deep navy
  '#4488cc', // 8 Iahlune    — true mid-blue (midpoint)
  '#99ccee', // 9 Liweluna   — icy periwinkle
  '#1a7a2e', // 10 Valolune  — deep forest green
  '#5cd65c', // 11 Sraoluna  — bright lime (midpoint)
  '#00c4b0', // 12 Elemilune — aqua-teal
]

export const SEASON_TAG_COLORS = {
  Summer: '#d63384', Harvest: '#ffb700', Winter: '#4488cc', Spring: '#5cd65c'
}

// ── Category config — locked 24-tab order ─────────────────────
// Eras & Dating is a sub-tab within Calendar, not a standalone nav tab
export const CATS = {
  dashboard:  { l: 'Dashboard',    i: '⊞',  c: '#ff69b4' },  // Pink
  wiki:       { l: 'Wiki',         i: '📖', c: '#ff6b6b' },  // Coral
  glossary:   { l: 'Glossary',     i: '📚', c: '#ff4433' },  // Red
  characters: { l: 'Characters',   i: '👤', c: '#ff5533' },  // Red-Orange
  familytree: { l: 'Family Tree',  i: '🌳', c: '#ff7040' },  // Orange
  world:      { l: 'World',        i: '🌐', c: '#ffaa33' },  // Amber
  locations:  { l: 'Locations',    i: '🗺',  c: '#ffcc00' },  // Yellow
  map:        { l: 'Maps',         i: '🌍', c: '#aacc44' },  // Yellow-Green
  manuscript: { l: 'Manuscript',   i: '📜', c: '#44bb44' },  // Green
  scenes:     { l: 'Scenes',       i: '🎬', c: '#00ccaa' },  // Teal
  timeline:   { l: 'Timeline',     i: '⏳', c: '#00ddff' },  // Cyan
  calendar:   { l: 'Calendar',     i: '🌙', c: '#44aaff' },  // Sky Blue
  inventory:  { l: 'Inventory',    i: '🎒', c: '#3388ff' },  // Blue
  wardrobe:   { l: 'Wardrobe',     i: '👗', c: '#6655ff' },  // Indigo
  items:      { l: 'Items',        i: '⚔',  c: '#8844ff' },  // Violet
  flags:      { l: 'Flags',        i: '🚩', c: '#aa44ff' },  // Purple
  questions:  { l: 'Questions',    i: '❓', c: '#cc44ff' },  // Magenta
  canon:      { l: 'Canon',        i: '✦',  c: '#ff44cc' },  // Hot Pink
  spellings:  { l: 'Spellings',    i: '✎',  c: '#ff69b4' },  // back to Pink
  notes:      { l: 'Notes',        i: '📝', c: '#ff6b6b' },  // Coral
  journal:    { l: 'Journal',      i: '📓', c: '#ff4433' },  // Red
  tools:      { l: 'Tools',        i: '🔧', c: '#ff5533' },  // Red-Orange
  sessionlog: { l: 'Session Log',  i: '📋', c: '#ff44cc' },  // Hot Pink
  // eras is a Calendar sub-tab only — kept here for reference/legacy checks
  eras:       { l: 'Eras & Dating',i: '⧖',  c: '#44aaff' },  // same as Calendar (sub-tab)
}

export const RAINBOW = ['#ff69b4','#ff6b6b','#ff4433','#ff5533','#ff7040','#ffaa33','#ffcc00','#aacc44','#44bb44','#00ccaa','#00ddff','#44aaff','#3388ff','#6655ff','#8844ff','#aa44ff','#cc44ff','#ff44cc']

export const TAB_RAINBOW = {
  dashboard:    '#ffffff',
  wiki:         '#ff6b6b',
  glossary:     '#ff4433',
  characters:   '#ff5533',
  familytree:   '#ff7040',
  world:        '#ffaa33',
  locations:    '#ffcc00',
  map:          '#aacc44',
  manuscript:   '#44bb44',
  scenes:       '#00ccaa',
  timeline:     '#00ddff',
  eras:         '#44aaff',
  calendar:     '#44aaff',
  inventory:    '#3388ff',
  wardrobe:     '#6655ff',
  items:        '#8844ff',
  flags:        '#aa44ff',
  questions:    '#cc44ff',
  canon:        '#ff44cc',
  spellings:    '#ff69b4',
  notes:        '#ff6b6b',
  journal:      '#ff4433',
  tools:        '#ff5533',
  sessionlog:   '#ff44cc',
}

// ── CSS variable map — kept for backward compatibility ─────────
// Some older tab files reference these; they still work via globals.css
export const CSS_VARS = {
  '--cc': '#c966ff', '--ci': '#ff7040', '--cl': '#ffcc00', '--ct': '#00ddff',
  '--cca': '#44aaff', '--ccn': '#ff4433', '--cw': '#ffaa33', '--cq': '#cc44ff',
  '--csp': '#ff69b4', '--csc': '#00ccaa', '--cwr': '#6655ff', '--cd': '#ff69b4',
  '--cfl': '#aa44ff', '--ctl': '#ff5533',
}

// ── Character field definitions ────────────────────────────────
export const CHAR_FIELDS = [
  { k: 'name',            l: 'Full Name',           t: 'text',   r: true },
  { k: 'display_name',    l: 'Display Name',        t: 'text',   p: 'How to show in lists' },
  { k: 'aliases',         l: 'Aliases',             t: 'text' },
  { k: 'guardian_number', l: 'Guardian #',          t: 'text' },
  { k: 'birthday',        l: 'Birthday (Mnaerah)',   t: 'text' },
  { k: 'birthday_lajen',  l: 'Birthday (Lajen)',     t: 'text' },
  { k: 'sign',            l: 'Zodiac',              t: 'text' },
  { k: 'element',         l: 'Element',             t: 'sel',    o: ['','Water','Fire','Earth','Air'] },
  { k: 'age_b1',          l: 'Age Book 1',          t: 'text' },
  { k: 'age_b2',          l: 'Age Book 2',          t: 'text' },
  { k: 'age_b3',          l: 'Age Book 3',          t: 'text' },
  { k: 'hair_color',      l: 'Hair Colour',         t: 'color' },
  { k: 'eye_color',       l: 'Eye Colour',          t: 'color' },
  { k: 'skin_color',      l: 'Skin Colour',         t: 'color' },
  { k: 'aura_color',      l: 'Aura/Power Colour',   t: 'color' },
  { k: 'clothing_color',  l: 'Usual Clothing Colour', t: 'color' },
  { k: 'has_wings',       l: 'Has Wings',           t: 'sel',    o: ['','Yes','No'] },
  { k: 'wing_color',      l: 'Wing Colour',         t: 'color' },
  { k: 'deceased',        l: 'Deceased',            t: 'sel',    o: ['','Yes','No','Unknown'] },
  { k: 'dies_in',         l: 'Dies In',             t: 'sel',    o: ['','Before Series','Book 1','Book 2','Book 3','Book 4','Book 5','Future'] },
  { k: 'traits',          l: 'Traits',              t: 'ta' },
]

// ── Era timeline data ──────────────────────────────────────────
export const ERA_TIMELINE = [
  { era: 'seeding',  label: 'Seeding',              ly: '~HC -300,000', my: '~35,000 BC',  desc: 'Guardians (non-physical) seed modern Lajen humans.', col: 'var(--dim)' },
  { era: 'guardian', label: 'Guardian Era begins',  ly: 'HC -38,897',   my: '~3,010 BC',   desc: 'Lajen cataclysm (human-caused). Guardians arrive physically.', col: '#00ddff' },
  { era: 'guardian', label: 'Stone circles built',  ly: 'HC -26,552',   my: '~1,600 BC',   desc: 'Calling across all 7 planes. Portal comes online.', col: '#00ddff' },
  { era: 'guardian', label: 'Guardian sacrifice',   ly: 'HC -12,639',   my: '~33 AD',      desc: 'Sevorech breaks. 12 Guardians sacrifice immortality.', col: '#ff4433' },
  { era: 'praelyn',  label: 'Praelyn arrive',       ly: 'HC -12,639',   my: '~33 AD',      desc: 'Serynae (Thirdform) arrives while Guardians still dying.', col: '#ffcc00' },
  { era: 'hc',       label: 'Lurlen falls — HC 1',  ly: 'HC 1',         my: '~1516 AD',    desc: 'Hadryen conquers. Calendar reset. Rose flees.', col: '#44aaff' },
  { era: 'hc',       label: 'Book 1 opens — HC 320',ly: 'HC 320',       my: '1554 AD',     desc: 'Lila arrives in Lajen.', col: '#ff7040' },
]

export const ERA_SPANS = [
  { name: 'Guardian Era', ly: '~26,258 LY', my: '~3,083 MY', col: '#00ddff',  desc: 'From cataclysm to sacrifice' },
  { name: 'Praelyn Era',  ly: '~12,640 LY', my: '~1,484 MY', col: '#ffcc00',  desc: 'From sacrifice to Lurlen falls' },
  { name: 'HC Era',       ly: '~320 LY',    my: '~37.5 MY',  col: '#44aaff',  desc: 'From Lurlen falls to Book 1' },
]

// ── Colour helpers ─────────────────────────────────────────────
export function needsDarkText(hex) {
  // Returns true if white text would be hard to read on this color
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255
  return luminance > 0.55
}

export function hexToRgba(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return [r,g,b,255]
}

export function lerpColor(a, b, t) {
  const p = s => parseInt(s.slice(1),16)
  const ar=p(a)>>16, ag=(p(a)>>8)&0xff, ab=p(a)&0xff
  const br=p(b)>>16, bg=(p(b)>>8)&0xff, bb=p(b)&0xff
  const rr=Math.round(ar+(br-ar)*t)
  const rg=Math.round(ag+(bg-ag)*t)
  const rb=Math.round(ab+(bb-ab)*t)
  return '#'+[rr,rg,rb].map(v=>v.toString(16).padStart(2,'0')).join('')
}

export function esc(s) {
  const d = document.createElement('div')
  d.textContent = String(s)
  return d.innerHTML
}

export function highlight(text, q) {
  if (!q || q.length < 2) return text
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')
  return text.replace(re, '<mark style="background:rgba(201,102,255,.35);color:inherit;border-radius:2px;padding:0 1px">$1</mark>')
}
