import { useState, useMemo, useRef } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS, TAB_RAINBOW } from '../constants'

// ── Tool definitions for nav ─────────────────────────────────────
const TOOLS = [
  { id: 'datetime',  label: 'Date & Time',           emoji: '🕰', color: 'var(--cca)' },
  { id: 'ixcitlatl', label: "Ix'Citlatl Converter",  emoji: '✦',  color: 'var(--cl)'  },
  { id: 'pronun',    label: 'Pronunciation Helper',  emoji: '🔊', color: 'var(--cwr)' },
  { id: 'scots',     label: 'Scots Dialogue',        emoji: '🏴', color: 'var(--ct)'  },
  { id: 'imagelib',  label: 'Image Library',         emoji: '🖼', color: 'var(--ci)'  },
  { id: 'backfill',  label: 'Birthday Backfill',     emoji: '🗓', color: 'var(--cfl)' },
  { id: 'units',     label: 'Unit Converter',        emoji: '📐', color: 'var(--csp)' },
]

// ── Speak helper (Web Speech API) ────────────────────────────────
function speak(text, lang = 'en-GB') {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang; u.rate = 0.85
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
  } catch {}
}

const inputStyle = { fontSize: '0.85em', padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }
const chipStyle = on => ({ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--cca)' : 'var(--brd)'), background: on ? 'rgba(255,170,51,.15)' : 'transparent', color: on ? 'var(--cca)' : 'var(--dim)' })

// ── Language conversion systems ──────────────────────────────────
// Each system: { label, prefix_f, prefix_m, convert(name) → string, note }
const LANG_SYSTEMS = [
  {
    id: 'nahuatl_strict',
    label: 'Nahuatl (Strict)',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'G→K, B/D/F/R/V mapped, no voiced stops',
    convert: (n) => {
      const DIGRAPHS = [['th','t'],['ph','p'],['sh','x'],['ch','ch'],['ll','l'],['wh','w']]
      const MAP = { b:'p',f:'p',g:'k',d:'t',r:'l',v:'w',j:'x',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      DIGRAPHS.forEach(([f,t]) => { s = s.split(f).join(t) })
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1]) && r[r.length-1] !== "'") r += 'a'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'nahuatl_soft',
    label: 'Nahuatl (Softened)',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Opening consonants dropped, vowel-forward',
    convert: (n) => {
      const MAP = { b:'p',f:'p',g:'',d:'t',r:'l',v:'w',j:'x',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      // drop opening consonant cluster
      let start = 0
      while (start < s.length && !'aeiou'.includes(s[start]) && start < 2) start++
      s = s.slice(start)
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'a'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'yucatec',
    label: 'Yucatec Maya',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Glottal stops, x=sh, -son→-x endings',
    convert: (n) => {
      const MAP = { b:"b'",f:'p',g:'',d:'t',r:'l',v:'w',j:'h',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      // drop opening consonant
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      // -son → -x, -son → glottal
      s = s.replace(/son$/,"'x").replace(/son\b/,"'x")
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou x'.includes(r[r.length-1])) r += 'ix'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'kiche',
    label: "K'iche' Maya",
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: "Ejective pops (k', b', ch'), warrior-feel",
    convert: (n) => {
      const MAP = { b:"b'",f:'p',g:"k'",d:'t',r:'l',v:'w',j:'h',z:'ts',q:"k'",
        a:'a',e:'e',i:'i',o:'o',u:'u',k:"k'",c:"k'",l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'on'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'tzotzil',
    label: 'Tzotzil Maya',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Softer Maya, j=h sound, flowing',
    convert: (n) => {
      const MAP = { b:"b'",f:'p',g:'',d:'t',r:'l',v:'w',j:'j',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'j' }
      let s = n.toLowerCase()
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'en'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'zapotec',
    label: 'Zapotec',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Tonal, nasal, z-buzz, doubled final vowels',
    convert: (n) => {
      const MAP = { b:'b',f:'p',g:'',d:'d',r:'l',v:'b',j:'h',z:'dz',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'z',t:'t',w:'w',x:'sh',y:'y',h:'h' }
      let s = n.toLowerCase()
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      // tonal doubling of final vowel
      if (r && 'aeiou'.includes(r[r.length-1])) r += r[r.length-1]
      else r += 'oo'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'mixtec',
    label: 'Mixtec',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Tonal like Zapotec but softer, nasal -ni endings',
    convert: (n) => {
      const MAP = { b:'v',f:'v',g:'',d:'t',r:'l',v:'v',j:'h',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'sh',y:'y',h:'h' }
      let s = n.toLowerCase()
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'ini'
      else r += 'ni'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'purepecha',
    label: 'Purépecha',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Language isolate — radical compression, crisp & alien',
    convert: (n) => {
      const MAP = { b:'p',f:'p',g:'k',d:'ts',r:'',v:'p',j:'ts',z:'ts',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'ts',w:'w',x:'sh',y:'y',h:'h' }
      let s = n.toLowerCase()
      // compress — remove duplicate vowels
      s = s.replace(/([aeiou])\1+/g,'$1')
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r.length > 4) r = r.slice(0,5)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'i'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'totonac',
    label: 'Totonac',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: '-tl endings like Nahuatl but with uvular stops',
    convert: (n) => {
      const MAP = { b:'p',f:'p',g:'k',d:'t',r:'l',v:'w',j:'x',z:'s',q:'kw',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'sh',y:'y',h:'h' }
      let s = n.toLowerCase()
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou'.includes(r[r.length-1])) r += 'tl'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'zapotec_tonal',
    label: 'Zapotec (Full Tonal)',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Full tonal doubling throughout',
    convert: (n) => {
      const MAP = { b:'b',f:'p',g:'',d:'d',r:'l',v:'b',j:'h',z:'dz',q:'k',
        a:'aa',e:'ee',i:'ii',o:'oo',u:'uu',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'dz',t:'t',w:'w',x:'sh',y:'y',h:'h' }
      let s = n.toLowerCase()
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'blend_best',
    label: '✨ Best Mix Blend',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Mayan w-sound, melodic -on/-ien endings, balanced',
    convert: (n) => {
      const MAP = { b:'w',f:'p',g:'',d:'t',r:'l',v:'w',j:'h',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      if (s.length > 1 && !'aeiou'.includes(s[0])) s = s.slice(1)
      s = s.replace(/ison$/,'iwon').replace(/isen$/,'iwen').replace(/son$/,'won')
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou n'.includes(r[r.length-1])) r += 'on'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'canon_rules',
    label: '⭐ Canon Rules (Ahilion-style)',
    prefix_f: 'Ix',
    prefix_m: 'Ah',
    note: 'Opening consonant drops, -ison→-ilion, melodic Romance-Mayan blend',
    convert: (n) => {
      const MAP = { b:'',f:'',g:'',d:'',r:'l',v:'w',j:'y',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
      // drop opening consonant(s)
      let i = 0
      while (i < s.length && !'aeiou'.includes(s[i]) && i < 2) i++
      s = s.slice(i)
      // -ison → -ilion, -son → -lion
      s = s.replace(/ison$/,'ilion').replace(/isen$/,'ilien').replace(/son$/,'lion')
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      if (r && !'aeiou n'.includes(r[r.length-1])) r += 'on'
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
]

// Canon hardcoded exceptions — always override
const CANON_OVERRIDES = {
  'gillison_male':   'Ahilion',
  'elaodien_female': 'Ixelaoien',
}

function applyPrefix(converted, prefix_f, prefix_m, gender) {
  const prefix = gender === 'female' ? prefix_f : prefix_m
  return prefix + converted
}

function getResult(name, gender, system) {
  const key = name.toLowerCase().trim() + '_' + gender
  if (CANON_OVERRIDES[key]) return CANON_OVERRIDES[key]
  const converted = system.convert(name)
  return applyPrefix(converted, system.prefix_f, system.prefix_m, gender)
}


// inWorld=true → phonetic rendering only (+ translation layer when available)
const PRONUN_LANGS = [
  {
    id: 'common',      label: 'Lajen Common',   inWorld: true,  confirmed: true,
    desc: 'English/Standard pronunciation',
    phonetic: w => w,
  },
  {
    id: 'ixcitlatl',   label: "Ix'Citlatl",     inWorld: true,  confirmed: true,
    desc: "x=sh, tl=one sound, Ix'=eesh, glottal stops",
    phonetic: w => w.replace(/Ix'/gi,'eesh-').replace(/tl/gi,'tl').replace(/x/gi,'sh').replace(/tz/gi,'ts').replace(/hu/gi,'w'),
  },
  {
    id: 'murvetian',   label: 'Murvetian',       inWorld: true,  confirmed: false, realBase: 'it',
    desc: 'Italian-inspired. Vowels pure: a=ah, e=eh, i=ee, o=oh, u=oo. c before e/i = ch.',
    phonetic: w => w
      .replace(/ce/gi,'che').replace(/ci/gi,'chi').replace(/ch/gi,'k')
      .replace(/gl/gi,'ly').replace(/gn/gi,'ny').replace(/sc/gi,'sh')
      .replace(/z/gi,'ts'),
  },
  {
    id: 'thaeronic',   label: 'Thaeronic',       inWorld: true,  confirmed: false, realBase: 'el',
    desc: 'Greek-inspired. th=th, ph=f, ch=kh, rr=rolled r, final -os/-is/-as.',
    phonetic: w => w.replace(/ph/gi,'f').replace(/ch/gi,'kh').replace(/th/gi,'th').replace(/rr/gi,'rr'),
  },
  {
    id: 'dreslundic',  label: 'Dreslundic',      inWorld: true,  confirmed: false, realBase: 'de',
    desc: 'Germanic/Norse. w=v, v=f, j=y, ei=ay, ie=ee, ö=er, ü=ew.',
    phonetic: w => w.replace(/\bw/gi,'v').replace(/\bv/gi,'f').replace(/\bj/gi,'y')
      .replace(/ei/gi,'ay').replace(/ie/gi,'ee').replace(/ö/gi,'er').replace(/ü/gi,'ew'),
  },
  {
    id: 'dakara',      label: 'Dakara',           inWorld: true,  confirmed: false, realBase: 'hi',
    desc: 'Sanskrit/Indian. long vowels doubled, retroflex consonants, aspirates.',
    phonetic: w => w.replace(/aa/g,'ā').replace(/ii/g,'ī').replace(/sh/gi,'ś').replace(/kh/gi,'kh'),
  },
  {
    id: 'kandori',     label: 'Kandorī',          inWorld: true,  confirmed: false, realBase: 'ja',
    desc: 'Japanese-inspired. Syllabic: CV structure, no consonant clusters, u often silent.',
    phonetic: w => w.replace(/tsu/gi,'tsu').replace(/chi/gi,'chi').replace(/shi/gi,'shi')
      .replace(/fu/gi,'fu').replace(/r/gi,'r'),
  },
  {
    id: 'xeradi',      label: 'Xeradi',           inWorld: true,  confirmed: false, realBase: 'fa',
    desc: 'Persian/Iranian. x=kh, gh=guttural g, soft vowels, stress on last syllable.',
    phonetic: w => w.replace(/x/gi,'kh').replace(/gh/gi,'gh').replace(/q/gi,'gh'),
  },
  {
    id: 'hafari',      label: 'Hafari',           inWorld: true,  confirmed: false, realBase: 'ar',
    desc: 'Arabic-inspired. emphatic consonants, pharyngeal ʿ, long vowels.',
    phonetic: w => w.replace(/'/g,'ʿ').replace(/kh/gi,'kh').replace(/gh/gi,'gh').replace(/th/gi,'th'),
  },
  {
    id: 'lurlish',     label: 'Lurlish',          inWorld: true,  confirmed: false, realBase: 'cy',
    desc: 'Celtic/Welsh. ll=voiceless l, ch=loch, dd=th, w/y are vowels.',
    phonetic: w => w.replace(/ll/gi,'ɬ').replace(/ch/gi,'ch').replace(/dd/gi,'ð').replace(/rh/gi,'rh'),
  },
  {
    id: 'manual',      label: 'Manual',           inWorld: false, confirmed: true,
    desc: 'Type the pronunciation yourself.',
    phonetic: w => w,
  },
]

// ══════════════════════════════════════════════════════════════════
// DATE & TIME — unified (Convert · Elapsed · Crossed-World · Age)
// Anchor: Akatriluna 1, HC 320 = June 21, 1554 AD · 8.52 LY = 1 MY
// ══════════════════════════════════════════════════════════════════
const ANCHOR_L_ABS = (320 - 1) * LDAYS            // Lajen days at HC 320, Akatriluna 1
const ANCHOR_E_MS  = Date.UTC(1554, 5, 21)        // June 21, 1554
const E_PER_L      = MDAYS / (RATIO * LDAYS)      // Earth days per Lajen day

function lajenAbs(hcYear, monthIdx = 0, day = 1) {
  return (hcYear - 1) * LDAYS + monthIdx * LDPM + (day - 1)
}
function absToLajen(abs) {
  const y = Math.floor(abs / LDAYS) + 1
  const doy = ((abs % LDAYS) + LDAYS) % LDAYS
  return { hcYear: abs < 0 && doy !== abs - (y - 1) * LDAYS ? y - (doy > abs - (y-1)*LDAYS ? 0 : 0) : y, monthIdx: Math.floor(doy / LDPM), day: (doy % LDPM) + 1 }
}
function lajenToEarth(abs) { return new Date(ANCHOR_E_MS + (abs - ANCHOR_L_ABS) * E_PER_L * 86400000) }
function earthToLajenAbs(dateMs) { return ANCHOR_L_ABS + (dateMs - ANCHOR_E_MS) / 86400000 / E_PER_L }
const EMONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
function fmtEarth(d, precision) {
  if (precision === 'year') return '~' + d.getUTCFullYear() + ' AD'
  if (precision === 'month') return '~' + EMONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ' AD'
  return EMONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear() + ' AD'
}
function fmtLajen(l, precision) {
  if (precision === 'year') return '~HC ' + l.hcYear
  if (precision === 'month') return '~' + (MONTHS[l.monthIdx]?.n || '?') + ', HC ' + l.hcYear
  return (MONTHS[l.monthIdx]?.n || '?') + ' ' + l.day + ', HC ' + l.hcYear
}
function breakdown(earthDays) {
  const lDays = Math.abs(earthDays) / E_PER_L
  const ly = Math.floor(lDays / LDAYS), lm = Math.floor((lDays % LDAYS) / LDPM), ld = Math.round(lDays % LDPM)
  const my = Math.floor(Math.abs(earthDays) / MDAYS), mrem = Math.abs(earthDays) % MDAYS
  const mm = Math.floor(mrem / 30.44), md = Math.round(mrem % 30.44)
  return { l: ly + 'y ' + lm + 'm ' + ld + 'd', m: my + 'y ' + mm + 'm ' + md + 'd', lYears: (lDays / LDAYS).toFixed(1), mYears: (Math.abs(earthDays) / MDAYS).toFixed(1) }
}

function DateInput({ val, onChange }) {
  const set = (k, v) => onChange({ ...val, [k]: v })
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={val.cal} onChange={e => set('cal', e.target.value)} style={inputStyle}>
        <option value="lajen">Lajen (HC)</option><option value="mnaerah">Mnaerah (AD)</option>
      </select>
      <input type="number" placeholder="Year" value={val.year} onChange={e => set('year', e.target.value)} style={{ ...inputStyle, width: 76 }} />
      <select value={val.month} onChange={e => set('month', e.target.value)} style={inputStyle}>
        <option value="">month?</option>
        {(val.cal === 'lajen' ? MONTHS.map(m => m.n) : EMONTHS).map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <input type="number" placeholder="Day" min="1" max={val.cal === 'lajen' ? 30 : 31} value={val.day} onChange={e => set('day', e.target.value)} style={{ ...inputStyle, width: 58 }} />
    </div>
  )
}
const emptyDate = cal => ({ cal, year: '', month: '', day: '' })
function parseDateVal(v) {
  if (v.year === '' || isNaN(parseFloat(v.year))) return null
  const y = parseFloat(v.year)
  const precision = v.month === '' ? 'year' : (v.day === '' || isNaN(parseFloat(v.day))) ? 'month' : 'day'
  const mi = v.month === '' ? (precision === 'year' ? 5 : 0) : parseInt(v.month)
  const d = precision === 'day' ? parseInt(v.day) : 15
  if (v.cal === 'lajen') return { abs: lajenAbs(y, precision === 'year' ? 6 : mi, precision === 'year' ? 1 : d), precision, cal: 'lajen' }
  const ms = Date.UTC(y, precision === 'year' ? 6 : mi, precision === 'year' ? 1 : d)
  return { abs: earthToLajenAbs(ms), precision, cal: 'mnaerah' }
}

function ConvertPane() {
  const [val, setVal] = useState(emptyDate('lajen'))
  const p = parseDateVal(val)
  return (
    <div>
      <DateInput val={val} onChange={setVal} />
      {p && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)' }}>
          <div style={{ fontSize: '0.92em' }}><span style={{ color: 'var(--cl)' }}>{fmtLajen(absToLajen(Math.round(p.abs)), p.precision)}</span>
            <span style={{ color: 'var(--mut)' }}>  =  </span>
            <span style={{ color: 'var(--ct)' }}>{fmtEarth(lajenToEarth(p.abs), p.precision)}</span></div>
          {(() => { const l = absToLajen(Math.round(p.abs)); const m = MONTHS[l.monthIdx]; return m ? (
            <div style={{ fontSize: '0.72em', color: 'var(--mut)', marginTop: 4 }}>{m.n} · {m.s} · Incarnate: {m.inc} · {m.ssn} · ≈ {m.eq}</div>) : null })()}
          {p.precision !== 'day' && <div style={{ fontSize: '0.69em', color: 'var(--cq)', marginTop: 4 }}>⚠ Fuzzy date — {p.precision}-level precision. Results are approximate.</div>}
        </div>
      )}
    </div>
  )
}

function ElapsedPane() {
  const [a, setA] = useState(emptyDate('lajen'))
  const [b, setB] = useState(emptyDate('mnaerah'))
  const pa = parseDateVal(a), pb = parseDateVal(b)
  let out = null
  if (pa && pb) {
    const eDays = (pb.abs - pa.abs) * E_PER_L
    const bd = breakdown(eDays)
    out = { sign: eDays < 0 ? ' (second date is earlier)' : '', bd, fuzzy: pa.precision !== 'day' || pb.precision !== 'day' }
  }
  return (
    <div>
      <div style={{ fontSize: '0.72em', color: 'var(--mut)', marginBottom: 4 }}>From:</div><DateInput val={a} onChange={setA} />
      <div style={{ fontSize: '0.72em', color: 'var(--mut)', margin: '8px 0 4px' }}>To:</div><DateInput val={b} onChange={setB} />
      {out ? (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)', fontSize: '0.85em' }}>
          <div>Lajen time: <b style={{ color: 'var(--cl)' }}>{out.bd.l}</b> ({out.bd.lYears} LY)</div>
          <div>Mnaerah time: <b style={{ color: 'var(--ct)' }}>{out.bd.m}</b> ({out.bd.mYears} MY){out.sign}</div>
          {out.fuzzy && <div style={{ fontSize: '0.69em', color: 'var(--cq)', marginTop: 4 }}>⚠ Includes fuzzy dates — approximate.</div>}
        </div>
      ) : <div style={{ marginTop: 8, fontSize: '0.77em', color: 'var(--mut)' }}>Enter at least a year on both sides — mixing calendars is fine.</div>}
    </div>
  )
}

const CROSSED_PRESETS = ['Rose','Lila','Martyn','Maitland','Thomas','Sandra','Faith','Hope','Silvia','Elizabeth']
function CrossedPane({ db }) {
  const [birth, setBirth] = useState(emptyDate('lajen'))
  const [crossings, setCrossings] = useState([])
  const [asOf, setAsOf] = useState(emptyDate('lajen'))
  const [who, setWho] = useState('')
  const profiles = (() => { try { return JSON.parse(db?.getSetting?.('crossed_profiles') || '{}') } catch { return {} } })()
  function loadPreset(name) {
    setWho(name)
    const p = profiles[name]
    if (p) { setBirth(p.birth || emptyDate('lajen')); setCrossings(p.crossings || []); setAsOf(p.asOf || emptyDate('lajen')) }
    else if (name === 'Maitland') setCrossings([])
  }
  function saveProfile() { if (!who) return; db?.saveSetting?.('crossed_profiles', JSON.stringify({ ...profiles, [who]: { birth, crossings, asOf } })) }
  const pb = parseDateVal(birth), pe = parseDateVal(asOf)
  const parsedCr = crossings.map(parseDateVal)
  let rows = null, totals = null, err = null
  if (pb && pe) {
    const pts = [pb.abs, ...parsedCr.map(p => p?.abs), pe.abs]
    if (parsedCr.some(p => !p)) err = 'Fill in every crossing date (year minimum), or remove empty rows.'
    else if (pts.some((v, i) => i > 0 && v < pts[i - 1])) err = 'Dates must be in chronological order.'
    else {
      let world = birth.cal
      rows = []; let lSum = 0, mSum = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const eDays = (pts[i + 1] - pts[i]) * E_PER_L
        const localYears = world === 'lajen' ? eDays / E_PER_L / LDAYS : eDays / MDAYS
        if (world === 'lajen') lSum += localYears; else mSum += localYears
        rows.push({ world, years: localYears.toFixed(1) })
        world = world === 'lajen' ? 'mnaerah' : 'lajen'
      }
      totals = { l: lSum.toFixed(1), m: mSum.toFixed(1) }
    }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {CROSSED_PRESETS.map(n => <span key={n} style={chipStyle(who === n)} onClick={() => loadPreset(n)}>{n}{n === 'Maitland' ? ' (no crossing)' : ''}</span>)}
        {who && <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={saveProfile}>💾 Save {who}</button>}
      </div>
      <div style={{ fontSize: '0.72em', color: 'var(--mut)', marginBottom: 4 }}>Born (world = starting side):</div>
      <DateInput val={birth} onChange={setBirth} />
      {crossings.map((c, i) => (
        <div key={i} style={{ marginTop: 8 }}>
          <div style={{ fontSize: '0.72em', color: 'var(--cca)', marginBottom: 4 }}>Crossing {i + 1}:
            <button onClick={() => setCrossings(crossings.filter((_, j) => j !== i))} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer' }}>✕</button></div>
          <DateInput val={c} onChange={v => setCrossings(crossings.map((x, j) => j === i ? v : x))} />
        </div>
      ))}
      <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} onClick={() => setCrossings([...crossings, emptyDate('lajen')])}>+ Add crossing</button>
      <div style={{ fontSize: '0.72em', color: 'var(--mut)', margin: '10px 0 4px' }}>Age as of:</div>
      <DateInput val={asOf} onChange={setAsOf} />
      {err && <div style={{ marginTop: 8, fontSize: '0.77em', color: '#ff3355' }}>{err}</div>}
      {rows && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)', fontSize: '0.85em' }}>
          {rows.map((r, i) => <div key={i} style={{ color: 'var(--dim)' }}>Segment {i + 1} · {r.world === 'lajen' ? 'Lajen' : 'Mnaerah'}: {r.years} perceived local years</div>)}
          <div style={{ marginTop: 6 }}>Perceived lifetime: <b style={{ color: 'var(--cl)' }}>{totals.l} Lajen years</b> + <b style={{ color: 'var(--ct)' }}>{totals.m} Mnaerah years</b></div>
          <div style={{ fontSize: '0.66em', color: 'var(--mut)', marginTop: 4 }}>Perceived-time semantics — canon-locked Jul 2, 2026.</div>
        </div>
      )}
    </div>
  )
}

function parseLooseDate(str) {
  if (!str || typeof str !== 'string') return null
  const ym = str.match(/-?\d{1,7}/); if (!ym) return null
  const year = parseFloat(ym[0])
  const mi = MONTHS.findIndex(m => str.toLowerCase().includes(m.n.toLowerCase()))
  const dm = str.match(/(?:^|\s)(\d{1,2})(?:\s*,|\s|$)/)
  const day = mi >= 0 && dm ? parseInt(dm[1]) : 1
  return { abs: lajenAbs(year, mi >= 0 ? mi : 5, mi >= 0 ? day : 1), precision: mi >= 0 ? (dm ? 'day' : 'month') : 'year' }
}

function AgePane({ db }) {
  const chars = (db.db.characters || []).filter(c => c.birthday_lajen)
  const events = (db.db.timeline || []).filter(e => e.date_hc && e.date_hc !== 'n/a' && e.date_hc !== 'unknown')
  const [ch, setCh] = useState(''); const [ev, setEv] = useState('')
  let out = null
  if (ch && ev) {
    const c = chars.find(x => x.id === ch); const e = events.find(x => x.id === ev)
    const pb = parseLooseDate(c?.birthday_lajen); const pe = parseLooseDate(e?.date_hc)
    if (!pb || !pe) out = { err: 'Could not calculate — ' + (!pb ? `"${c?.birthday_lajen}" isn't a parseable Lajen birthday.` : `event date "${e?.date_hc}" isn't parseable.`) }
    else { const bd = breakdown((pe.abs - pb.abs) * E_PER_L); out = { l: bd.lYears, m: bd.mYears, fuzzy: pb.precision !== 'day' || pe.precision !== 'day', neg: pe.abs < pb.abs } }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={ch} onChange={e => setCh(e.target.value)} style={inputStyle}>
          <option value="">Character…</option>{chars.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
        </select>
        <select value={ev} onChange={e => setEv(e.target.value)} style={inputStyle}>
          <option value="">Event…</option>{events.map(e => <option key={e.id} value={e.id}>{e.name} ({e.date_hc})</option>)}
        </select>
      </div>
      {out && (out.err
        ? <div style={{ marginTop: 8, fontSize: '0.77em', color: '#ff3355' }}>{out.err}</div>
        : <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)', fontSize: '0.85em' }}>
            {out.neg ? 'Event is BEFORE this birthday — check the dates.' : <>Age at event: <b style={{ color: 'var(--cl)' }}>{out.l} Lajen years</b> (≈ <b style={{ color: 'var(--ct)' }}>{out.m} Mnaerah years</b>)</>}
            {out.fuzzy && <div style={{ fontSize: '0.69em', color: 'var(--cq)', marginTop: 4 }}>⚠ Fuzzy date somewhere — approximate.</div>}
          </div>)}
      {chars.length === 0 && <div style={{ marginTop: 8, fontSize: '0.77em', color: 'var(--mut)' }}>No characters have a Lajen birthday set yet.</div>}
    </div>
  )
}

function DateTimeTool({ db }) {
  const [pane, setPane] = useState('convert')
  const panes = [['convert', 'Convert'], ['elapsed', 'Time Elapsed'], ['crossed', 'Crossed-World Lifetime'], ['age', 'Age at Event']]
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {panes.map(([id, l]) => <button key={id} style={chipStyle(pane === id)} onClick={() => setPane(id)}>{l}</button>)}
      </div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>Anchor: Akatriluna 1, HC 320 = June 21, 1554 AD · {RATIO} Lajen years = 1 Mnaerah year</div>
      {pane === 'convert' && <ConvertPane />}
      {pane === 'elapsed' && <ElapsedPane />}
      {pane === 'crossed' && <CrossedPane db={db} />}
      {pane === 'age' && <AgePane db={db} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// IX'CITLATL CONVERTER — real logic for ALL names; canon annotated
// ══════════════════════════════════════════════════════════════════
function IxCitlatlTool({ db }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [active, setActive] = useState(() => new Set(LANG_SYSTEMS.map(s => s.label)))
  const [results, setResults] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState(() => { try { return JSON.parse(db.getSetting?.('ixc_history') || '[]') } catch { return [] } })

  function toggle(l) { const n = new Set(active); n.has(l) ? n.delete(l) : n.add(l); setActive(n) }
  function convert() {
    const nm = name.trim(); if (!nm) return
    const rows = LANG_SYSTEMS.filter(s => active.has(s.label)).map(s => ({ system: s.label, out: getResult(nm, gender, s) }))
    const canon = CANON_OVERRIDES[nm.toLowerCase() + '_' + gender]
    setResults({ name: nm, gender, rows, canon }); setExpanded(false)
    const h = [{ name: nm, gender, when: new Date().toISOString() }, ...history.filter(x => x.name !== nm)].slice(0, 20)
    setHistory(h); db.saveSetting?.('ixc_history', JSON.stringify(h))
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && convert()} placeholder="Name to convert" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <select value={gender} onChange={e => setGender(e.target.value)} style={inputStyle}>
          <option value="female">Female — Ix</option><option value="male">Male — Ah</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cl)', color: '#000' }} onClick={convert}>Convert</button>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {LANG_SYSTEMS.map(s => <span key={s.label} style={chipStyle(active.has(s.label))} onClick={() => toggle(s.label)}>{s.label}</span>)}
      </div>
      {results && (
        <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)' }}>
          {results.canon && (
            <div style={{ fontSize: '0.77em', color: 'var(--cca)', marginBottom: 6, padding: '4px 8px', background: 'rgba(255,170,51,.1)', borderRadius: 6, display: 'inline-block' }}>
              📌 Canon: <b>{results.canon}</b> — table below shows raw system output for comparison.
            </div>
          )}
          <div style={{ fontSize: '0.85em', cursor: 'pointer' }} onClick={() => setExpanded(x => !x)}>
            <b style={{ color: 'var(--cl)' }}>{results.name}</b> → {results.rows.slice(0, 3).map(r => r.out).join(' · ')}
            <span style={{ color: 'var(--mut)' }}> … {expanded ? '▲ collapse' : `▼ all ${results.rows.length} systems`}</span>
          </div>
          {expanded && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em', marginTop: 8 }}>
              <tbody>{results.rows.map((r, i) => (
                <tr key={r.system} style={{ borderTop: '1px solid rgba(255,255,255,.05)', background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
                  <td style={{ padding: '4px 6px', color: 'var(--dim)' }}>{r.system}</td>
                  <td style={{ padding: '4px 6px', color: results.gender === 'female' ? 'var(--cl)' : 'var(--cca)', fontWeight: 600 }}>{r.out}</td>
                  <td style={{ padding: '4px 6px', width: 30 }}><button onClick={() => speak(r.out, 'es-MX')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🔊</button></td>
                </tr>))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {history.length > 0 && (
        <details style={{ marginTop: 8 }}><summary style={{ fontSize: '0.72em', color: 'var(--mut)', cursor: 'pointer' }}>History ({history.length})</summary>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 4 }}>{history.map(h => <span key={h.when} style={{ marginRight: 10, cursor: 'pointer' }} onClick={() => setName(h.name)}>{h.name}</span>)}</div>
        </details>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PRONUNCIATION HELPER — three tabs, no external services
// ══════════════════════════════════════════════════════════════════
function PronunciationTool() {
  const [tab, setTab] = useState('ixc')
  const [word, setWord] = useState('')
  const [ixcSys, setIxcSys] = useState(LANG_SYSTEMS[0].label)
  const inWorld = PRONUN_LANGS.filter(l => l.inWorld)
  const realWorld = PRONUN_LANGS.filter(l => !l.inWorld)
  const [lajenSel, setLajenSel] = useState(inWorld[0]?.id || '')
  const [realSel, setRealSel] = useState(() => new Set())
  const toggleReal = id => { const n = new Set(realSel); n.has(id) ? n.delete(id) : n.add(id); setRealSel(n) }
  const w = word.trim()
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['ixc', "Ix'Citlatl"], ['lajen', 'Lajen Languages'], ['real', 'Real-World']].map(([id, l]) =>
          <button key={id} style={chipStyle(tab === id)} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      <input value={word} onChange={e => setWord(e.target.value)} placeholder="Word or name…" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
      {tab === 'ixc' && (
        <div>
          <select value={ixcSys} onChange={e => setIxcSys(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
            {LANG_SYSTEMS.map(s => <option key={s.label}>{s.label}</option>)}
          </select>
          {w && (() => { const s = LANG_SYSTEMS.find(x => x.label === ixcSys); const out = s ? s.convert(w) : w; return (
            <div style={{ padding: '8px 12px', background: 'var(--card)', borderRadius: 8, fontSize: '0.92em' }}>
              <b style={{ color: 'var(--cwr)' }}>{out}</b>
              <button onClick={() => speak(out, 'es-MX')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>🔊</button>
              <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 3 }}>Audio uses a Mexican-Spanish voice as the closest real-world approximation.</div>
            </div>) })()}
        </div>
      )}
      {tab === 'lajen' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {inWorld.map(l => <span key={l.id} style={chipStyle(lajenSel === l.id)} onClick={() => setLajenSel(l.id)}>{l.label}{l.confirmed ? '' : ' ⚠'}</span>)}
          </div>
          {(() => { const l = inWorld.find(x => x.id === lajenSel); if (!l) return null; return (
            <div style={{ padding: '8px 12px', background: 'var(--card)', borderRadius: 8, fontSize: '0.85em' }}>
              {!l.confirmed && <div style={{ fontSize: '0.69em', color: 'var(--cq)', marginBottom: 4 }}>⚠ Phonology not yet confirmed for this language — provisional.</div>}
              {l.note && <div style={{ color: 'var(--dim)', marginBottom: 6 }}>{l.note}</div>}
              {w && <div><b style={{ color: 'var(--cwr)' }}>{(l.phonetic || (x => x))(w)}</b>
                <button onClick={() => speak((l.phonetic || (x => x))(w), l.bcp || 'en-GB')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>🔊</button></div>}
            </div>) })()}
        </div>
      )}
      {tab === 'real' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {realWorld.map(l => <span key={l.id} style={chipStyle(realSel.has(l.id))} onClick={() => toggleReal(l.id)}>{l.label}</span>)}
          </div>
          {w && [...realSel].map(id => { const l = realWorld.find(x => x.id === id); if (!l) return null; const out = (l.phonetic || (x => x))(w); return (
            <div key={id} style={{ padding: '6px 12px', background: 'var(--card)', borderRadius: 8, fontSize: '0.85em', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span style={{ color: 'var(--mut)', fontSize: '0.85em' }}>{l.label}: </span><b style={{ color: 'var(--cwr)' }}>{out}</b></span>
              <button onClick={() => speak(w, l.bcp || 'en-GB')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🔊</button>
            </div>) })}
          {w && realSel.size === 0 && <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>Pick one or more languages above.</div>}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SCOTS DIALOGUE — Silvia (educated Edinburgh) · Elizabeth (broad rural)
// ══════════════════════════════════════════════════════════════════
const SCOTS_LEVELS = [
  { id: 'L1', name: 'Trace',  who: "Elizabeth's default", note: 'Vocabulary only — not raised in Scotland; accent picked up from Silvia.', rules: [
    [/\byes\b/gi,'aye'], [/\bknow\b/gi,'ken'], [/\bknows\b/gi,'kens'], [/\bsmall\b/gi,'wee'], [/\blittle\b/gi,'wee'], [/\bchild\b/gi,'bairn'], [/\bchildren\b/gi,'bairns'], [/\bremember\b/gi,'mind'],
  ]},
  { id: 'L2', name: 'Light', who: '', note: 'Occasional Scots negatives; standard spelling otherwise.', rules: [
    [/\bdon't\b/gi,"dinnae"], [/\bcan't\b/gi,'cannae'], [/\bdidn't\b/gi,"didnae"], [/\bno\b/gi,'nae'],
  ]},
  { id: 'L3', name: 'Medium', who: "Silvia's default", note: 'Educated Edinburgh. (Canon note, exploratory: may broaden a level under strong emotion.)', rules: [
    [/\bto\b/gi,'tae'], [/\bfrom\b/gi,'fae'], [/\bdoesn't\b/gi,"disnae"], [/\bwon't\b/gi,"willnae"], [/\bisn't\b/gi,"isnae"], [/\bwasn't\b/gi,"wisnae"], [/\bnot\b/gi,"no'"], [/\bgive\b/gi,'gie'], [/\bhave\b/gi,'hae'], [/\bmore\b/gi,'mair'], [/\bwell\b/gi,'weel'], [/\bold\b/gi,'auld'],
  ]},
  { id: 'L4', name: 'Broad', who: '', note: 'Full rural register — sound shifts throughout.', rules: [
    [/\bI\b/g,'Ah'], [/\byou\b/gi,'ye'], [/\byour\b/gi,'yer'], [/\bout\b/gi,'oot'], [/\babout\b/gi,'aboot'], [/\bdown\b/gi,'doon'], [/\bhouse\b/gi,'hoose'], [/\bnight\b/gi,'nicht'], [/\bright\b/gi,'richt'], [/\bgo\b/gi,'gang'], [/\bgoing\b/gi,'gaun'], [/\baway\b/gi,"awa'"], [/\bcold\b/gi,'cauld'], [/\bhead\b/gi,'heid'], [/\bdead\b/gi,'deid'], [/\bwho\b/gi,'wha'], [/\bwhere\b/gi,'whaur'], [/\bone\b/gi,'ane'], [/\btwo\b/gi,'twa'], [/\bstone\b/gi,'stane'], [/\bhome\b/gi,'hame'], [/ing\b/g,"in'"],
  ]},
]
function keepCase(orig, rep) { return orig[0] === orig[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep }
function scotsAtLevel(text, levelIdx) {
  let out = text
  for (let i = 0; i <= levelIdx; i++) SCOTS_LEVELS[i].rules.forEach(([re, rep]) => { out = out.replace(re, m => keepCase(m, rep)) })
  return out
}
function ScotsDialogueTool() {
  const [text, setText] = useState('')
  const [levels, setLevels] = useState(() => new Set(['L1', 'L3']))
  const toggle = id => { const n = new Set(levels); n.has(id) ? n.delete(id) : n.add(id); setLevels(n) }
  const copy = s => { try { navigator.clipboard.writeText(s) } catch {} }
  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Type or paste plain English dialogue…"
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {SCOTS_LEVELS.map(l => <span key={l.id} style={chipStyle(levels.has(l.id))} onClick={() => toggle(l.id)}>{l.id} {l.name}{l.who ? ' · ' + l.who : ''}</span>)}
      </div>
      {text.trim() && SCOTS_LEVELS.map((l, i) => levels.has(l.id) && (
        <div key={l.id} style={{ marginTop: 8, padding: '8px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--brd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72em', color: 'var(--ct)', fontWeight: 700 }}>{l.id} {l.name.toUpperCase()}{l.who ? ' — ' + l.who : ''}</span>
            <button onClick={() => copy(scotsAtLevel(text, i))} style={{ background: 'none', border: '1px solid var(--brd)', borderRadius: 4, color: 'var(--dim)', cursor: 'pointer', fontSize: '0.69em', padding: '1px 7px' }}>copy</button>
          </div>
          <div style={{ fontSize: '0.92em', fontStyle: 'italic' }}>{scotsAtLevel(text, i)}</div>
          <div style={{ fontSize: '0.63em', color: 'var(--mut)', marginTop: 3 }}>{l.note}</div>
        </div>
      ))}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: '0.72em', color: 'var(--mut)', cursor: 'pointer' }}>Rules reference (cumulative by level)</summary>
        {SCOTS_LEVELS.map(l => (
          <div key={l.id} style={{ fontSize: '0.72em', color: 'var(--dim)', marginTop: 4 }}>
            <b style={{ color: 'var(--ct)' }}>{l.id} {l.name}:</b> {l.rules.map(([re, rep]) => re.source.replace(/\\b/g, '') + '→' + rep).join(' · ')}
          </div>
        ))}
        <div style={{ fontSize: '0.66em', color: 'var(--mut)', marginTop: 4 }}>⚠ Drafting aid, not a dialect engine. Levels are cumulative. Rule expansion pending Melissa's line review.</div>
      </details>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// UNIT CONVERTER — small & simple
// ══════════════════════════════════════════════════════════════════
const UNITS = {
  Length: { m: 1, km: 1000, cm: 0.01, ft: 0.3048, in: 0.0254, mi: 1609.34, yd: 0.9144, league: 4828 },
  Mass: { kg: 1, g: 0.001, lb: 0.4536, oz: 0.02835, stone: 6.3503 },
  Volume: { L: 1, mL: 0.001, gal: 3.785, pint: 0.4732, cup: 0.2366 },
  Time: { 'Mnaerah day': 1, 'Mnaerah year': 365.25, 'Lajen day (calendar-mapped)': 0.11909, 'Lajen month': 3.5727, 'Lajen year': 42.87 },
}
function UnitsTool() {
  const [cat, setCat] = useState('Length')
  const units = Object.keys(UNITS[cat])
  const [from, setFrom] = useState(units[0]); const [to, setTo] = useState(units[1] || units[0])
  const [val, setVal] = useState('1')
  const u = UNITS[cat]; const f = u[from] !== undefined ? from : units[0]; const t = u[to] !== undefined ? to : units[0]
  const out = parseFloat(val) ? (parseFloat(val) * u[f] / u[t]) : null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={cat} onChange={e => { setCat(e.target.value); const us = Object.keys(UNITS[e.target.value]); setFrom(us[0]); setTo(us[1] || us[0]) }} style={inputStyle}>
        {Object.keys(UNITS).map(c => <option key={c}>{c}</option>)}
      </select>
      <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ ...inputStyle, width: 90 }} />
      <select value={f} onChange={e => setFrom(e.target.value)} style={inputStyle}>{units.map(x => <option key={x}>{x}</option>)}</select>
      <span style={{ color: 'var(--mut)' }}>→</span>
      <select value={t} onChange={e => setTo(e.target.value)} style={inputStyle}>{units.map(x => <option key={x}>{x}</option>)}</select>
      {out !== null && <b style={{ color: 'var(--csp)' }}>{out.toLocaleString(undefined, { maximumFractionDigits: 4 })} {t}</b>}
      {cat === 'Time' && <div style={{ width: '100%', fontSize: '0.66em', color: 'var(--mut)' }}>Lajen units use the calendar mapping ({RATIO} LY = 1 MY), not experienced clock time — see Date & Time tool note.</div>}
    </div>
  )
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i
function looksLikeImage(v) { return typeof v === 'string' && (v.startsWith('data:image') || ((v.startsWith('http') || v.startsWith('/')) && (IMG_RE.test(v) || v.includes('supabase.co/storage')))) }
function ImageLibraryTool({ db }) {
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const gallery = useMemo(() => {
    const seen = new Set(); const out = []
    Object.entries(db.db || {}).forEach(([cat, entries]) => {
      if (!Array.isArray(entries)) return
      entries.forEach(e => {
        if (!e || typeof e !== 'object') return
        Object.entries(e).forEach(([field, v]) => {
          if (!looksLikeImage(v)) return
          const key = v.slice(0, 120) + '|' + e.id
          if (seen.has(key)) return
          seen.add(key)
          out.push({ src: v, cat, field, entryId: e.id, label: e.title || e.display_name || e.name || e.id })
        })
      })
    })
    return out
  }, [db.db])
  function addImage(ev) {
    const f = ev.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = e2 => db.upsertEntry('images', { id: 'img_' + Date.now(), name: f.name, src: e2.target.result, created: new Date().toISOString() })
    r.readAsDataURL(f); ev.target.value = ''
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '0.77em', color: 'var(--dim)' }}>Every image anywhere in the Compendium, gathered automatically ({gallery.length}). New images added anywhere appear here on their own.</div>
        <button className="btn btn-sm btn-outline" onClick={() => fileRef.current?.click()}>➕ Add image
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {gallery.map((g, i) => (
          <div key={i} onClick={() => setPreview(g)} style={{ cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, overflow: 'hidden' }}>
            <img src={g.src} alt={g.label} style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} loading="lazy" />
            <div style={{ fontSize: '0.63em', color: 'var(--dim)', padding: '3px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label} <span style={{ color: 'var(--mut)' }}>· {g.cat}</span></div>
          </div>
        ))}
      </div>
      {gallery.length === 0 && <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>No images found yet.</div>}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <img src={preview.src} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8 }} />
            <div style={{ color: 'var(--dim)', fontSize: '0.85em', marginTop: 8 }}>{preview.label} · {preview.cat}{preview.field ? ' · ' + preview.field : ''}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function BackfillTool({ db }) {
  const [report, setReport] = useState(null)
  function sweep() {
    const bad = ['pending_math', 'unknown', 'n/a', 'tbd', '?', '-']
    const tl = db.db.timeline || []
    let created = 0, existing = 0
    const skipped = []
    ;(db.db.characters || []).forEach(c => {
      const raw = String(c.birthday_lajen || '').trim()
      const nm = 'Birthday: ' + (c.display_name || c.name || '?')
      if (!raw || bad.includes(raw.toLowerCase()) || !/\d/.test(raw)) { if (raw) skipped.push((c.display_name || c.name) + ' — "' + raw + '"'); return }
      const bid = 'bday_' + c.id
      if (tl.some(x => x.id === bid || (x.name || '').toLowerCase() === nm.toLowerCase())) { existing++; return }
      db.upsertEntry('timeline', { id: bid, era: '', name: nm, books: [], detail: 'Auto-created from character birthday (' + raw + ')', status: 'provisional', created: new Date().toISOString(), date_hc: raw, date_mnaerah: String(c.birthday || ''), sort_order: '', relationships: [], auto_birthday: true }, { silent: true })
      created++
    })
    setReport({ created, existing, skipped })
  }
  return (
    <div>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 6 }}>Birthdays now auto-create timeline entries whenever a character is saved. This button sweeps ALL existing characters once and reports anything it couldn't place.</div>
      <button className="btn btn-primary btn-sm" style={{ background: 'var(--cfl)', color: '#000' }} onClick={sweep}>Sweep all characters</button>
      {report && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--card)', borderRadius: 8, fontSize: '0.85em' }}>
          <div>✓ Created {report.created} · already present {report.existing}</div>
          {report.skipped.length > 0 && (
            <div style={{ marginTop: 4, color: 'var(--cq)', fontSize: '0.85em' }}>⚠ Couldn't place {report.skipped.length} (placeholder/unparseable):
              <div style={{ color: 'var(--dim)', fontSize: '0.9em', marginTop: 2 }}>{report.skipped.join(' · ')}</div></div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN — accordion
// ══════════════════════════════════════════════════════════════════
export default function Tools({ db }) {
  const tabColor = TAB_RAINBOW['tools'] || '#aaaaaa'
  const [open, setOpen] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('tools_open') || '["datetime"]')) } catch { return new Set(['datetime']) } })
  function toggle(id) {
    const n = new Set(open); n.has(id) ? n.delete(id) : n.add(id); setOpen(n)
    try { localStorage.setItem('tools_open', JSON.stringify([...n])) } catch {}
  }
  const BODY = {
    datetime: <DateTimeTool db={db} />, ixcitlatl: <IxCitlatlTool db={db} />, pronun: <PronunciationTool />,
    scots: <ScotsDialogueTool />, imagelib: <ImageLibraryTool db={db} />, backfill: (
      <div><div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 6 }}>Auto-creates a timeline entry for every character who has a Lajen birthday set, skipping ones that already exist.</div><BackfillTool db={db} /></div>
    ), units: <UnitsTool />,
  }
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.31em', color: tabColor }}>⚒ Tools</div>
      </div>
      {TOOLS.map(t => (
        <div key={t.id} style={{ marginBottom: 8, background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: `3px solid ${t.color}`, borderRadius: 'var(--r)' }}>
          <div onClick={() => toggle(t.id)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: t.color }}>{t.emoji} {t.label}</span>
            <span style={{ color: 'var(--mut)' }}>{open.has(t.id) ? '▲' : '▼'}</span>
          </div>
          {open.has(t.id) && <div style={{ padding: '0 14px 14px' }}>{BODY[t.id]}</div>}
        </div>
      ))}
    </div>
  )
}
