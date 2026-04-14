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
  { n: 'Sachaluna',   s: 'Sachael (F)',   inc: 'Marhanna', num: 5,  eq: 'Oct 22–Nov 21',  ssn: 'Harvest', si: 1 },
  { n: 'Rhamilune',   s: 'Rhamiel (M)',   inc: 'Thomas',   num: 6,  eq: 'Nov 21–Dec 21',  ssn: 'Harvest', si: 2 },
  { n: 'Mailuna',     s: 'Maion (F)',     inc: 'Aenya',    num: 7,  eq: 'Dec 22–Jan 21',  ssn: 'Winter',  si: 0 },
  { n: 'Iahlune',     s: 'Iahhel (M)',    inc: 'Risben',   num: 8,  eq: 'Jan 21–Feb 20',  ssn: 'Winter',  si: 1 },
  { n: 'Liweluna',    s: 'Liwet (F)',     inc: 'Saraenya', num: 9,  eq: 'Feb 20–Mar 22',  ssn: 'Winter',  si: 2 },
  { n: 'Valolune',    s: 'Valoel (M)',    inc: 'Gillison', num: 10, eq: 'Mar 22–Apr 21',  ssn: 'Spring',  si: 0 },
  { n: 'Sraoluna',    s: 'Sraosha (F)',   inc: 'Dakane',   num: 11, eq: 'Apr 21–May 21',  ssn: 'Spring',  si: 1 },
  { n: 'Elemilune',   s: 'Elemiah (M)',   inc: 'Nataru',   num: 12, eq: 'May 21–Jun 20',  ssn: 'Spring',  si: 2 },
]

export const WEEKDAYS = ['Onesday', 'Twosday', 'Threesday', 'Foursday', 'Fivesday']

// ── Season config ──────────────────────────────────────────────
export const SEASON_COLORS = {
  Summer:  ['#00ffcc', '#80b399', '#ff3366'],
  Harvest: ['#f4c430', '#c76218', '#990000'],
  Winter:  ['#4477cc', '#7799cc', '#a9c0d3'],
  Spring:  ['#7fff00', '#bb77cc', '#9400d3'],
}
export const SEASON_TAG_COLORS = {
  Summer: '#00ffcc', Harvest: '#f4c430', Winter: '#6688cc', Spring: '#7fff00'
}

// ── 18-stop rainbow (locked Session 18) ──────────────────────────
// Artistic colour wheel: Pink → warm arc → cool arc → Magenta → Hot Pink → back to Pink
// Bubblegum Pink starts, Hot Pink ends, Magenta bridges Purple to Hot Pink
export const RAINBOW = [
  '#ff69b4', // 0  Pink (Bubblegum)
  '#ff6b6b', // 1  Coral
  '#e63946', // 2  Red
  '#f4442e', // 3  Red-Orange
  '#ff8c00', // 4  Orange
  '#ffb700', // 5  Amber
  '#ffd600', // 6  Yellow
  '#aacc00', // 7  Yellow-Green
  '#38b000', // 8  Green
  '#0fb5a0', // 9  Teal
  '#00b4d8', // 10 Cyan
  '#4cc9f0', // 11 Sky Blue
  '#3a86ff', // 12 Blue
  '#4361ee', // 13 Indigo
  '#7b2d8b', // 14 Violet
  '#9d4edd', // 15 Purple
  '#c77dff', // 16 Magenta
  '#ff48c4', // 17 Hot Pink
]

// Rainbow colour by position — wraps automatically
export const rainbowAt = (i) => RAINBOW[((i % 18) + 18) % 18]

// ── Per-tab rainbow colour map (24 tabs, spectrum distributed evenly) ──
// Dashboard = white (special neutral). Remaining 23 tabs distributed across 18 stops,
// cycling as needed so every tab has a distinct colour.
export const TAB_RAINBOW = {
  dashboard:    '#ffffff', // special: white
  wiki:         '#ff69b4', // 0  Pink
  glossary:     '#ff6b6b', // 1  Coral
  characters:   '#e63946', // 2  Red
  familytree:   '#f4442e', // 3  Red-Orange
  world:        '#ff8c00', // 4  Orange
  locations:    '#ffb700', // 5  Amber
  map:          '#ffd600', // 6  Yellow
  manuscript:   '#aacc00', // 7  Yellow-Green
  scenes:       '#38b000', // 8  Green
  timeline:     '#0fb5a0', // 9  Teal
  eras:         '#00b4d8', // 10 Cyan
  calendar:     '#4cc9f0', // 11 Sky Blue
  inventory:    '#3a86ff', // 12 Blue
  wardrobe:     '#4361ee', // 13 Indigo
  items:        '#7b2d8b', // 14 Violet
  flags:        '#9d4edd', // 15 Purple
  questions:    '#c77dff', // 16 Magenta
  canon:        '#ff48c4', // 17 Hot Pink
  spellings:    '#ff69b4', // cycles: index 18 % 18 = 0 → Pink
  notes:        '#ff6b6b', // cycles: index 19 % 18 = 1 → Coral
  journal:      '#e63946', // cycles: index 20 % 18 = 2 → Red
  tools:        '#f4442e', // cycles: index 21 % 18 = 3 → Red-Orange
  sessionlog:   '#ff8c00', // cycles: index 22 % 18 = 4 → Orange
}

// ── Category config ─────────────────────────────────────────────
export const CATS = {
  dashboard:   { l: 'Dashboard',    i: '⊞',  c: 'var(--cd)' },
  wiki:        { l: 'Wiki',         i: '📖', c: 'var(--cc)' },
  glossary:    { l: 'Glossary',     i: '📚', c: 'var(--csp)' },
  characters:  { l: 'Characters',   i: '👤', c: 'var(--cc)' },
  familytree:  { l: 'Family Tree',  i: '🌳', c: 'var(--cl)' },
  world:       { l: 'World',        i: '🌐', c: 'var(--cw)' },
  locations:   { l: 'Locations',    i: '🗺',  c: 'var(--cl)' },
  map:         { l: 'Maps',         i: '🌍', c: 'var(--cl)' },
  manuscript:  { l: 'Manuscript',   i: '📜', c: 'var(--csc)' },
  scenes:      { l: 'Scenes',       i: '🎬', c: 'var(--csc)' },
  timeline:    { l: 'Timeline',     i: '⏳', c: 'var(--ct)' },
  eras:        { l: 'Eras & Dating',i: '⧖',  c: 'var(--cca)' },
  calendar:    { l: 'Calendar',     i: '🌙', c: 'var(--cca)' },
  inventory:   { l: 'Inventory',    i: '🎒', c: 'var(--ci)' },
  wardrobe:    { l: 'Wardrobe',     i: '👗', c: 'var(--cwr)' },
  items:       { l: 'Items',        i: '⚔',  c: 'var(--ci)' },
  flags:       { l: 'Flags',        i: '🚩', c: 'var(--cfl)' },
  questions:   { l: 'Questions',    i: '❓', c: 'var(--cq)' },
  canon:       { l: 'Canon',        i: '✦',  c: 'var(--ccn)' },
  spellings:   { l: 'Spellings',    i: '✎',  c: 'var(--csp)' },
  notes:       { l: 'Journal',      i: '📓', c: 'var(--cw)' },
  journal:     { l: 'Notes',        i: '📝', c: 'var(--cc)' },
  tools:       { l: 'Tools',        i: '🔧', c: 'var(--ctl)' },
  sessionlog:  { l: 'Session Log',  i: '📋', c: 'var(--ct)' },
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
  { era: 'guardian', label: 'Guardian Era begins',  ly: 'HC -38,897',   my: '~3,010 BC',   desc: 'Lajen cataclysm (human-caused). Guardians arrive physically.', col: 'var(--cc)' },
  { era: 'guardian', label: 'Stone circles built',  ly: 'HC -26,552',   my: '~1,600 BC',   desc: 'Calling across all 7 planes. Portal comes online.', col: 'var(--cc)' },
  { era: 'guardian', label: 'Guardian sacrifice',   ly: 'HC -12,639',   my: '~33 AD',      desc: 'Sevorech breaks. 12 Guardians sacrifice immortality.', col: 'var(--ccn)' },
  { era: 'praelyn',  label: 'Praelyn arrive',       ly: 'HC -12,639',   my: '~33 AD',      desc: 'Serynae (Thirdform) arrives while Guardians still dying.', col: 'var(--cl)' },
  { era: 'hc',       label: 'Lurlen falls — HC 1',  ly: 'HC 1',         my: '~1516 AD',    desc: 'Hadryen conquers. Calendar reset. Rose flees.', col: 'var(--cca)' },
  { era: 'hc',       label: 'Book 1 opens — HC 320',ly: 'HC 320',       my: '1554 AD',     desc: 'Lila arrives in Lajen.', col: 'var(--ci)' },
]

export const ERA_SPANS = [
  { name: 'Guardian Era', ly: '~26,258 LY', my: '~3,083 MY', col: 'var(--cc)',  desc: 'From cataclysm to sacrifice' },
  { name: 'Praelyn Era',  ly: '~12,640 LY', my: '~1,484 MY', col: 'var(--cl)',  desc: 'From sacrifice to Lurlen falls' },
  { name: 'HC Era',       ly: '~320 LY',    my: '~37.5 MY',  col: 'var(--cca)', desc: 'From Lurlen falls to Book 1' },
]

// ── Colour helpers ─────────────────────────────────────────────
export function needsDarkText(c) {
  return ['var(--cl)','var(--cca)','var(--cw)','var(--csp)',
          'var(--csc)','var(--cwr)','var(--ctl)','var(--cfl)'].includes(c)
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

// ── Escape HTML ────────────────────────────────────────────────
export function esc(s) {
  const d = document.createElement('div')
  d.textContent = String(s)
  return d.innerHTML
}

// ── Highlight search matches ───────────────────────────────────
export function highlight(text, q) {
  if (!q || q.length < 2) return text
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')
  return text.replace(re, '<mark style="background:rgba(201,102,255,.35);color:inherit;border-radius:2px;padding:0 1px">$1</mark>')
}
