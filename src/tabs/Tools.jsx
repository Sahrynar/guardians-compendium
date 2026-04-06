import { useState, useCallback, useEffect, useRef } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

// ── Tool definitions for nav ─────────────────────────────────────
const TOOLS = [
  { id: 'l2m',       label: 'Lajen → Mnaerah',       emoji: '🌍', color: 'var(--cca)' },
  { id: 'm2l',       label: 'Mnaerah → Lajen',        emoji: '🌙', color: 'var(--ct)'  },
  { id: 'elapsed',   label: 'Time Elapsed',           emoji: '⏱',  color: 'var(--cq)'  },
  { id: 'age',       label: 'Character Age',          emoji: '🎂', color: 'var(--cc)'  },
  { id: 'units',     label: 'Unit Converter',         emoji: '📐', color: 'var(--csp)' },
  { id: 'ixcitlatl', label: "Ix'Citlatl Converter",  emoji: '✦',  color: 'var(--cl)'  },
  { id: 'pronun',    label: 'Pronunciation Helper',   emoji: '🔊', color: 'var(--cwr)' },
  { id: 'backfill',  label: 'Birthday Backfill',      emoji: '🗓', color: 'var(--cfl)' },
  { id: 'scots',     label: 'Scots Dialogue',         emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: 'var(--cca)' },
  { id: 'imagelib',  label: 'Image Library',          emoji: '🖼', color: 'var(--cl)'  },
]

function Row({ label, value }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <span className="calc-val">{value}</span>
    </div>
  )
}

// ── Speak helper (Web Speech API) ────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

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

// ── Ix'Citlatl Converter ─────────────────────────────────────────
function IxCitlatlTool() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gcomp_ix_history') || '[]') } catch { return [] }
  })

  function saveHistory(h) {
    setHistory(h)
    try { localStorage.setItem('gcomp_ix_history', JSON.stringify(h)) } catch {}
  }

  function convert() {
    if (!name.trim()) return
    const results = LANG_SYSTEMS.map(sys => ({
      system: sys.id,
      label: sys.label,
      note: sys.note,
      result: getResult(name.trim(), gender, sys),
    }))
    const entry = { id: Date.now(), original: name.trim(), gender, results }
    saveHistory([entry, ...history.slice(0, 14)])
    setName('')
  }

  return (
    <div className="tool-card" id="tool-ixcitlatl">
      <h3 style={{ color: 'var(--cl)' }}>✦ Ix'Citlatl Name Converter</h3>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Converts any name into its Ix'Citlatl equivalent across all 12 Mesoamerican language systems.
        Female private names begin with <strong style={{ color: 'var(--cl)' }}>Ix</strong> (pronounced "eesh"),
        male with <strong style={{ color: 'var(--cca)' }}>Ah</strong>.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 160, margin: 0 }}>
          <label>Name to convert</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && convert()}
            placeholder="e.g. Gillison, Thomas, Rose…" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Prefix</label>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="female">Female — Ix</option>
            <option value="male">Male — Ah</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cl)', color: '#000', alignSelf: 'flex-end' }}
          onClick={convert}>Convert All</button>
      </div>

      {history.length > 0 && (
        <div>
          {history.map(h => (
            <div key={h.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.77em', color: 'var(--cca)', fontWeight: 700, marginBottom: 6 }}>
                {h.original} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>({h.gender})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77em' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', color: 'var(--dim)', padding: '2px 8px 4px 0', fontSize: '0.69em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Language System</th>
                      <th style={{ textAlign: 'left', color: 'var(--dim)', padding: '2px 8px 4px 0', fontSize: '0.69em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Result</th>
                      <th style={{ textAlign: 'left', color: 'var(--dim)', padding: '2px 8px 4px 0', fontSize: '0.69em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.results.map((r, i) => (
                      <tr key={r.system} style={{ borderTop: '1px solid rgba(255,255,255,.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                        <td style={{ padding: '5px 8px 5px 0', color: 'var(--dim)', whiteSpace: 'nowrap' }}>{r.label}</td>
                        <td style={{ padding: '5px 8px 5px 0' }}>
                          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', fontWeight: 700,
                            color: h.gender === 'female' ? 'var(--cl)' : 'var(--cca)' }}>
                            {r.result}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px 5px 0', color: 'var(--mut)', fontSize: '0.69em', fontStyle: 'italic' }}>{r.note}</td>
                        <td style={{ padding: '5px 0', whiteSpace: 'nowrap' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.77em', padding: '0 3px' }}
                            onClick={() => navigator.clipboard?.writeText(r.result)} title="Copy">📋</button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.77em', padding: '0 3px' }}
                            onClick={() => speak(r.result)} title="Hear pronunciation">🔊</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button style={{ fontSize: '0.69em', color: 'var(--mut)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => saveHistory([])}>Clear history</button>
        </div>
      )}
    </div>
  )
}

// ── Pronunciation Helper (rebuilt) ───────────────────────────────
// Language config: realWorld=true → call translation API first, then phonetic
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

async function translateWord(word, targetLang) {
  // Uses MyMemory free translation API (no key needed, 5000 chars/day free)
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${targetLang}`)
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const t = data.responseData.translatedText
      // Reject if same as input or obviously failed
      if (t.toLowerCase() !== word.toLowerCase() && !t.includes('MYMEMORY')) return t
    }
  } catch {}
  return null
}

function PronunciationTool() {
  const [word, setWord] = useState('')
  const [system, setSystem] = useState('ixcitlatl')
  const [manualOverride, setManualOverride] = useState('')
  const [results, setResults] = useState([]) // multi-result array
  const [loading, setLoading] = useState(false)

  const sys = PRONUN_LANGS.find(s => s.id === system) || PRONUN_LANGS[0]

  async function generate() {
    const w = word.trim()
    if (!w) return
    if (system === 'manual') {
      setResults([{ system: 'Manual', original: w, translated: null, phonetic: manualOverride || w }])
      return
    }
    setLoading(true)
    const out = []

    // For each language, generate a result
    const langs = system === 'all'
      ? PRONUN_LANGS.filter(l => l.id !== 'manual')
      : [PRONUN_LANGS.find(l => l.id === system)].filter(Boolean)

    for (const lang of langs) {
      let translated = null
      // Real-world base language → try translation first
      if (lang.realBase) {
        translated = await translateWord(w, lang.realBase)
      }
      const sourceWord = translated || w
      const phonetic = lang.phonetic(sourceWord)
      out.push({
        system: lang.label,
        id: lang.id,
        confirmed: lang.confirmed,
        original: w,
        translated,
        phonetic,
      })
    }
    setResults(out)
    setLoading(false)
  }

  return (
    <div className="tool-card" id="tool-pronun">
      <h3 style={{ color: 'var(--cwr)' }}>🔊 Pronunciation Helper</h3>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Enter any word or name. Real-world language systems (Murvetian/Italian, Thaeronic/Greek, etc.)
        will attempt a translation first, then apply phonetic rules.
        In-world language systems apply phonetic rendering directly.
        Systems marked ⚠ have unconfirmed phonology.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
        <div className="field" style={{ flex: 1, minWidth: 140, margin: 0 }}>
          <label>Word or name</label>
          <input value={word} onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Ixelaoien, star, sword…" />
        </div>
        <div className="field" style={{ margin: 0, minWidth: 180 }}>
          <label>Language system</label>
          <select value={system} onChange={e => { setSystem(e.target.value); setResults([]) }}>
            <option value="all">— All languages —</option>
            {PRONUN_LANGS.map(s => (
              <option key={s.id} value={s.id}>{s.confirmed ? '' : '⚠ '}{s.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cwr)', color: '#000', alignSelf: 'flex-end' }}
          onClick={generate} disabled={loading}>
          {loading ? '…' : 'Generate'}
        </button>
      </div>

      {sys.id === 'manual' && (
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Type pronunciation</label>
          <input value={manualOverride} onChange={e => setManualOverride(e.target.value)}
            placeholder="e.g. eesh-eh-lah-OH-yen" />
        </div>
      )}

      {!sys.confirmed && system !== 'manual' && system !== 'all' && (
        <div style={{ fontSize: '0.77em', color: 'var(--sp)', padding: '4px 8px', background: 'rgba(255,204,0,.07)',
          borderRadius: 4, marginBottom: 8, border: '1px solid rgba(255,204,0,.2)' }}>
          ⚠ {sys.label} phonology not yet confirmed — output is approximate.
          {sys.realBase && <span> Translation via MyMemory API.</span>}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {results.map(r => (
            <div key={r.system} style={{ padding: '10px 12px', background: 'var(--sf)',
              border: '1px solid var(--brd)', borderRadius: 'var(--r)', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontSize: '0.69em', color: 'var(--mut)', textTransform: 'uppercase',
                    letterSpacing: '.05em', marginBottom: 2 }}>{r.system}</div>
                  {r.translated && (
                    <div style={{ fontSize: '0.69em', color: 'var(--dim)', fontStyle: 'italic' }}>
                      → {r.translated} (translated)
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '1.31em', fontFamily: "'Cinzel',serif",
                    color: 'var(--cwr)', fontWeight: 700 }}>{r.phonetic}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15em' }}
                    onClick={() => speak(r.phonetic)} title="Hear it">🔊</button>
                  <button style={{ background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)',
                    cursor: 'pointer', fontSize: '0.69em', padding: '2px 6px', borderRadius: 3 }}
                    onClick={() => navigator.clipboard?.writeText(r.phonetic)}>Copy</button>
                </div>
              </div>
              {!r.confirmed && (
                <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 4 }}>
                  ⚠ Unconfirmed phonology
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ix'Citlatl reference guide */}
      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: '0.77em', color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
          📖 Ix'Citlatl Sound Guide
        </summary>
        <div style={{ marginTop: 6, padding: 8, background: 'var(--card)', borderRadius: 'var(--r)', fontSize: '0.77em', lineHeight: 1.8 }}>
          {[["Ix'","eesh (prefix)"],["x","sh (as in 'shell')"],["tl","tl as one sound (like in 'Nahuatl')"],["tz","ts (as in 'bits')"],["hu","w"],["'","glottal stop (like 'uh-oh')"],["c (before a/o)","k"],["c (before e/i)","s"],["ll","long L"]].map(([sym,val]) => (
            <div key={sym} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--cl)', minWidth: 80, fontFamily: "'Cinzel',serif" }}>{sym}</span>
              <span style={{ color: 'var(--dim)' }}>{val}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}


export default function Tools({ db }) {
  const [lYear, setLYear] = useState(320)
  const [lMonth, setLMonth] = useState(1)
  const [lDay, setLDay] = useState(1)
  const [mYear, setMYear] = useState('')
  const [eC1, setEC1] = useState('lajen')
  const [eY1, setEY1] = useState(1)
  const [eC2, setEC2] = useState('mnaerah')
  const [eY2, setEY2] = useState(1550)
  const [eEv1, setEEv1] = useState('')
  const [eEv2, setEEv2] = useState('')
  const [elapResult, setElapResult] = useState(null)
  const [aCH, setACH] = useState('')
  const [aEV, setAEV] = useState('')
  const [aBY, setABY] = useState('')
  const [aEY, setAEY] = useState('')
  const [tuAmt, setTuAmt] = useState(1)
  const [tuFrom, setTuFrom] = useState('days')

  const events = db.db.timeline || []
  const chars = db.db.characters || []

  const l2m = useCallback(() => {
    const totalLDays = (lYear - 1) * LDAYS + (lMonth - 1) * LDPM + (lDay - 1)
    const mYearsFromHC1 = totalLDays / (RATIO * LDAYS)
    const mYr = Math.round(1516.5 + mYearsFromHC1)
    return { totalLDays, mYearsFromHC1, mYear: mYr, month: MONTHS[lMonth - 1] }
  }, [lYear, lMonth, lDay])

  const m2l = useCallback(() => {
    const my = parseFloat(mYear)
    if (isNaN(my)) return null
    const mYearsFromHC = my - 1516.5
    const lYears = mYearsFromHC * RATIO
    const lYr = Math.round(lYears)
    const totalLDays = Math.round(lYears * LDAYS)
    const lMonthIdx = Math.floor((Math.abs(totalLDays) % LDAYS) / LDPM)
    const monthName = MONTHS[Math.abs(lMonthIdx) % 12] || MONTHS[0]
    return { mYearsFromHC, lYear: lYr, totalLDays, monthName, my }
  }, [mYear])

  function calcElapsed() {
    let y1 = parseFloat(eY1), y2 = parseFloat(eY2)
    if (eEv1) {
      const ev = events.find(e => e.id === eEv1)
      if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y1 = parseFloat(m[0]) }
    }
    if (eEv2) {
      const ev = events.find(e => e.id === eEv2)
      if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y2 = parseFloat(m[0]) }
    }
    const mY1 = eC1==='mnaerah' ? y1 : (y1/RATIO)+1516.5
    const mY2 = eC2==='mnaerah' ? y2 : (y2/RATIO)+1516.5
    const mElapsed = Math.abs(mY2-mY1)
    setElapResult({ mElapsed, lElapsed: mElapsed*RATIO })
  }

  function calcAge() {
    let by = parseFloat(aBY), ey = parseFloat(aEY)
    if (aCH) {
      const ch = chars.find(c => c.id === aCH)
      if (ch && ch.birthday) { const m = ch.birthday.match(/-?\d{4}/); if (m) by = parseFloat(m[0]) }
    }
    if (aEV) {
      const ev = events.find(e => e.id === aEV)
      if (ev) { const m = (ev.date_mnaerah||'').match(/-?\d+/)||[]; if (m[0]) ey = parseFloat(m[0]) }
    }
    if (!by || !ey) return null
    return { age: ey - by, lAge: (ey - by) * RATIO }
  }

  const toMin = { minutes:1, hours:60, days:1440, weeks:10080, months30:43200, months365:43829, years360:518400, years365:525960, decades:5259600, centuries:52596000 }
  const mins = tuAmt * (toMin[tuFrom]||1440)
  function fmtN(n) {
    if (n >= 1e9) return (n/1e9).toFixed(2)+' billion'
    if (n >= 1e6) return (n/1e6).toFixed(2)+' million'
    if (n >= 10000) return Math.round(n).toLocaleString()
    if (n >= 10) return n.toFixed(1)
    return n.toFixed(2)
  }
  const unitRows = [
    ['Minutes',mins],['Hours',mins/60],['Days',mins/1440],['Weeks',mins/10080],
    ['Months (30-day)',mins/43200],['Years (Lajen / 360-day)',mins/518400],
    ['Years (Mnaerah / 365.25-day)',mins/525960],['Decades',mins/5259600],['Centuries',mins/52596000]
  ]

  const l2mResult = l2m()
  const ageResult = calcAge()
  const m2lResult = m2l()

  function scrollTo(id) {
    const el = document.getElementById('tool-' + id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* ── Title ── */}
      <div style={{ fontFamily:"'Cinzel',serif", fontSize: '1.15em', color:'var(--ctl)', marginBottom:10 }}>🔧 Tools</div>

      {/* ── Quick-nav bar ── */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16, padding:'8px 10px',
        background:'var(--card)', border:'1px solid var(--brd)', borderRadius:'var(--rl)' }}>
        <span style={{ fontSize: '0.69em', color:'var(--dim)', alignSelf:'center', marginRight:4, textTransform:'uppercase', letterSpacing:'.04em' }}>Jump to:</span>
        {TOOLS.map(t => (
          <button key={t.id}
            style={{ fontSize: '0.77em', padding:'3px 10px', borderRadius:12, background:'none',
              border:`1px solid ${t.color}44`, color:t.color, cursor:'pointer', whiteSpace:'nowrap',
              transition:'.2s' }}
            onMouseDown={e => e.currentTarget.style.background = `${t.color}22`}
            onMouseUp={e => e.currentTarget.style.background = 'none'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => scrollTo(t.id)}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Two-column grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:10 }}>

        {/* ── Lajen → Mnaerah ── */}
        <div className="tool-card" id="tool-l2m">
          <h3 style={{ color:'var(--cca)' }}>🌍 Lajen → Mnaerah</h3>
          <div className="field-row">
            <div className="field"><label>Lajen Year (HC)</label>
              <input type="number" value={lYear} onChange={e => setLYear(parseInt(e.target.value)||0)} />
            </div>
            <div className="field"><label>Lajen Month</label>
              <select value={lMonth} onChange={e => setLMonth(parseInt(e.target.value))}>
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m.num}. {m.n}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Lajen Day (1–30)</label>
            <input type="number" value={lDay} min={1} max={30} onChange={e => setLDay(parseInt(e.target.value)||1)} />
          </div>
          <div className="calc-result">
            <Row label="Lajen Date" value={`Year ${lYear} HC, ${MONTHS[lMonth-1].n} Day ${lDay}`} />
            <Row label="Total Lajen Days from HC 1" value={l2mResult.totalLDays.toLocaleString()} />
            <Row label="Approximate Mnaerah Year" value={`~${l2mResult.mYear} AD`} />
            <Row label="Season" value={MONTHS[lMonth-1].ssn} />
          </div>
        </div>

        {/* ── Mnaerah → Lajen ── */}
        <div className="tool-card" id="tool-m2l">
          <h3 style={{ color:'var(--ct)' }}>🌙 Mnaerah → Lajen</h3>
          <div className="field"><label>Mnaerah Year (AD, negative for BC)</label>
            <input type="number" value={mYear} placeholder="e.g. 1554 or -2500" onChange={e => setMYear(e.target.value)} />
          </div>
          {m2lResult && (
            <div className="calc-result">
              <Row label="Mnaerah Year" value={m2lResult.my <= 0 ? Math.abs(m2lResult.my)+' BC' : m2lResult.my+' AD'} />
              <Row label="Lajen Year (HC)" value={m2lResult.lYear > 0 ? `Year ${m2lResult.lYear} HC` : `Year ${Math.abs(m2lResult.lYear)} before HC 1`} />
              <Row label="Approximate Lajen Month" value={`${m2lResult.monthName.n} (${m2lResult.monthName.ssn})`} />
            </div>
          )}
        </div>

        {/* ── Time Elapsed ── */}
        <div className="tool-card" id="tool-elapsed">
          <h3 style={{ color:'var(--cq)' }}>⏱ Time Elapsed</h3>
          <div style={{ fontSize: '0.77em', color:'var(--dim)', marginBottom:8 }}>Pick events from the dropdown or enter years manually.</div>
          <div style={{ fontSize: '0.77em', color:'var(--cca)', marginBottom:4, fontWeight:600 }}>START</div>
          <div className="field"><label>Pick event (optional)</label>
            <select value={eEv1} onChange={e => setEEv1(e.target.value)}>
              <option value="">— Manual entry —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date_mnaerah||ev.date_hc||''})</option>)}
            </select>
          </div>
          {!eEv1 && (
            <div className="field-row">
              <div className="field"><label>Calendar</label>
                <select value={eC1} onChange={e => setEC1(e.target.value)}>
                  <option value="lajen">Lajen (HC)</option>
                  <option value="mnaerah">Mnaerah (AD)</option>
                </select>
              </div>
              <div className="field"><label>Year</label>
                <input type="number" value={eY1} onChange={e => setEY1(parseFloat(e.target.value)||0)} />
              </div>
            </div>
          )}
          <div style={{ fontSize: '0.77em', color:'var(--cca)', marginBottom:4, fontWeight:600, marginTop:8 }}>END</div>
          <div className="field"><label>Pick event (optional)</label>
            <select value={eEv2} onChange={e => setEEv2(e.target.value)}>
              <option value="">— Manual entry —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date_mnaerah||ev.date_hc||''})</option>)}
            </select>
          </div>
          {!eEv2 && (
            <div className="field-row">
              <div className="field"><label>Calendar</label>
                <select value={eC2} onChange={e => setEC2(e.target.value)}>
                  <option value="mnaerah">Mnaerah (AD)</option>
                  <option value="lajen">Lajen (HC)</option>
                </select>
              </div>
              <div className="field"><label>Year</label>
                <input type="number" value={eY2} onChange={e => setEY2(parseFloat(e.target.value)||0)} />
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-sm" style={{ background:'var(--cq)' }} onClick={calcElapsed}>Calculate</button>
          {elapResult && (
            <div className="calc-result" style={{ marginTop:8 }}>
              <Row label="Mnaerah time elapsed" value={`~${elapResult.mElapsed.toFixed(2)} years (~${Math.round(elapResult.mElapsed*MDAYS).toLocaleString()} days)`} />
              <Row label="Lajen time elapsed" value={`~${elapResult.lElapsed.toFixed(2)} years (~${Math.round(elapResult.lElapsed*LDAYS).toLocaleString()} days)`} />
              <Row label="Ratio" value={`1 Mnaerah year = ${RATIO} Lajen years`} />
            </div>
          )}
        </div>

        {/* ── Character Age at Event ── */}
        <div className="tool-card" id="tool-age">
          <h3 style={{ color:'var(--cc)' }}>🎂 Character Age at Event</h3>
          <div className="field"><label>Character</label>
            <select value={aCH} onChange={e => setACH(e.target.value)}>
              <option value="">— Pick character —</option>
              {[...chars].sort((a,b) => (a.display_name||a.name||'').localeCompare(b.display_name||b.name||'')).map(c => (
                <option key={c.id} value={c.id}>{c.display_name||c.name}</option>
              ))}
            </select>
          </div>
          <div className="field"><label>Event</label>
            <select value={aEV} onChange={e => setAEV(e.target.value)}>
              <option value="">— Pick event —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date_mnaerah||ev.date_hc||''})</option>)}
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label>Or: Birth Year (Mnaerah)</label>
              <input type="number" value={aBY} placeholder="e.g. 1538" onChange={e => setABY(e.target.value)} />
            </div>
            <div className="field"><label>Or: Event Year (Mnaerah)</label>
              <input type="number" value={aEY} placeholder="e.g. 1554" onChange={e => setAEY(e.target.value)} />
            </div>
          </div>
          {ageResult ? (
            <div className="calc-result">
              <Row label="Mnaerah age at event" value={`${ageResult.age.toFixed(1)} years`} />
              <Row label="Equivalent Lajen time" value={`${ageResult.lAge.toFixed(1)} Lajen years`} />
            </div>
          ) : (
            <div style={{ fontSize: '0.77em', color:'var(--mut)', marginTop:6 }}>Pick character + event, or enter years manually.</div>
          )}
        </div>

        {/* ── Unit Converter ── */}
        <div className="tool-card" id="tool-units">
          <h3 style={{ color:'var(--csp)' }}>📐 Generic Time Unit Converter</h3>
          <div className="field-row">
            <div className="field"><label>Amount</label>
              <input type="number" value={tuAmt} onChange={e => setTuAmt(parseFloat(e.target.value)||0)} />
            </div>
            <div className="field"><label>From</label>
              <select value={tuFrom} onChange={e => setTuFrom(e.target.value)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months30">Months (30-day)</option>
                <option value="months365">Months (30.44-day avg)</option>
                <option value="years360">Years (360-day / Lajen)</option>
                <option value="years365">Years (365.25-day / Mnaerah)</option>
                <option value="decades">Decades</option>
                <option value="centuries">Centuries</option>
              </select>
            </div>
          </div>
          <div className="calc-result">
            {unitRows.map(([label, val]) => <Row key={label} label={label} value={fmtN(val)} />)}
          </div>
        </div>

        {/* ── Birthday Backfill ── */}
        <div className="tool-card" id="tool-backfill">
          <h3 style={{ color:'var(--cfl)' }}>🗓 Backfill Birthday Timeline Entries</h3>
          <div style={{ fontSize: '0.77em', color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
            Auto-creates a timeline entry for every character who has a Lajen birthday set,
            but doesn't yet have a matching "Birthday: [Name]" event in the timeline.
            Safe to run multiple times — won't create duplicates.
          </div>
          <BackfillTool db={db} />
        </div>

      </div>{/* end two-column grid */}

      {/* ── Full-width converters ── */}
      <div style={{ marginTop:10 }}>
        <IxCitlatlTool />
        <PronunciationTool />
        <ScotsDialogueTool />
        <ImageLibraryTool db={db} />
      </div>
    </div>
  )
}

// ── Scots Dialogue Converter ──────────────────────────────────────
const SCOTS_MAP = [
  // Modal verbs
  [/\bwill not\b/gi,'willnae'],[/\bwould not\b/gi,'woudnae'],[/\bcannot\b/gi,'cannae'],
  [/\bcan't\b/gi,'cannae'],[/\bwon't\b/gi,'willnae'],[/\bwouldn't\b/gi,'woudnae'],
  [/\bdon't\b/gi,'dinnae'],[/\bdo not\b/gi,'dinnae'],[/\bdoes not\b/gi,'disnae'],
  [/\bdoesn't\b/gi,'disnae'],[/\bdidn't\b/gi,'didnae'],[/\bdid not\b/gi,'didnae'],
  [/\bisn't\b/gi,'isnae'],[/\bis not\b/gi,'isnae'],[/\baren't\b/gi,'arnae'],
  [/\bwasn't\b/gi,'wisnae'],[/\bwere not\b/gi,'werenae'],[/\bweren't\b/gi,'werenae'],
  [/\bhaven't\b/gi,'huvnae'],[/\bhave not\b/gi,'huvnae'],[/\bhasn't\b/gi,'husnae'],
  [/\bshouldn't\b/gi,'shouldnae'],[/\bshould not\b/gi,'shouldnae'],
  [/\bmust not\b/gi,'mustnnae'],[/\bmustn't\b/gi,'mustnnae'],
  // Pronouns + verbs
  [/\bI am\b/gi,"Ah'm"],[/\bI have\b/gi,"Ah've"],[/\bI will\b/gi,"Ah'll"],
  [/\bI would\b/gi,"Ah'd"],[/\bI\b/g,'Ah'],
  [/\byou are\b/gi,"ye're"],[/\byou have\b/gi,"ye've"],[/\byou will\b/gi,"ye'll"],
  [/\byou would\b/gi,"ye'd"],[/\byou\b/gi,'ye'],
  [/\bthey are\b/gi,"they're"],[/\bthey have\b/gi,"they've"],
  [/\bwe are\b/gi,"we're"],[/\bwe have\b/gi,"we've"],
  // Common words
  [/\bthe\b/gi,'the'],[/\bthis\b/gi,'this'],[/\bthat\b/gi,'that'],
  [/\bwhat\b/gi,'whit'],[/\bwhere\b/gi,'whaur'],[/\bwho\b/gi,'wha'],
  [/\bwhy\b/gi,'why'],[/\bhow\b/gi,'hoo'],[/\bwhen\b/gi,'whan'],
  [/\bhere\b/gi,'here'],[/\bthere\b/gi,'thare'],[/\bnow\b/gi,'noo'],
  [/\bjust\b/gi,'juist'],[/\bonly\b/gi,'anly'],[/\bever\b/gi,'ever'],
  [/\bover\b/gi,'ower'],[/\bunder\b/gi,'unner'],[/\babout\b/gi,'aboot'],
  [/\bafter\b/gi,'efter'],[/\bbefore\b/gi,'afore'],[/\bbetween\b/gi,'atween'],
  [/\baway\b/gi,'awa'],[/\bback\b/gi,'back'],[/\bdown\b/gi,'doon'],
  [/\bup\b/gi,'up'],[/\bout\b/gi,'oot'],[/\bin\b/gi,'in'],
  [/\bwith\b/gi,'wi'],[/\bwithout\b/gi,'withoot'],[/\bfor\b/gi,'fer'],
  [/\bfrom\b/gi,'frae'],[/\binto\b/gi,'intae'],[/\bonto\b/gi,'ontae'],
  [/\bnot\b/gi,'nae'],[/\bno\b/gi,'nae'],[/\byes\b/gi,'aye'],[/\byeah\b/gi,'aye'],
  [/\blittle\b/gi,'wee'],[/\bsmall\b/gi,'wee'],[/\bgood\b/gi,'guid'],
  [/\bgreat\b/gi,'braw'],[/\bbeautiful\b/gi,'bonnie'],[/\bpretty\b/gi,'bonnie'],
  [/\bold\b/gi,'auld'],[/\bcold\b/gi,'cauld'],[/\bbold\b/gi,'bauld'],
  [/\btold\b/gi,'telt'],[/\bfold\b/gi,'fauld'],[/\bgold\b/gi,'gowd'],
  [/\bsaid\b/gi,'said'],[/\bknow\b/gi,'ken'],[/\bknew\b/gi,'kent'],
  [/\bchild\b/gi,'bairn'],[/\bchildren\b/gi,'bairns'],
  [/\bgirl\b/gi,'lassie'],[/\bboy\b/gi,'laddie'],[/\bman\b/gi,'man'],
  [/\bwoman\b/gi,'wumman'],[/\bfolk\b/gi,'fowk'],[/\bpeople\b/gi,'fowk'],
  [/\bhome\b/gi,'hame'],[/\bhouse\b/gi,'hoose'],[/\bstone\b/gi,'stane'],
  [/\bnight\b/gi,'nicht'],[/\bright\b/gi,'richt'],[/\blight\b/gi,'licht'],
  [/\bmight\b/gi,'micht'],[/\bfight\b/gi,'fecht'],[/\bsight\b/gi,'sicht'],
  [/\bring/gi,'ring'],[/\bking\b/gi,'king'],[/\bthing\b/gi,'thing'],
  [/\bthink\b/gi,'think'],[/\bbrother\b/gi,'brither'],[/\bmother\b/gi,'mither'],
  [/\bfather\b/gi,'faither'],[/\bother\b/gi,'ither'],[/\beach other\b/gi,'ane anither'],
  [/\bsomething\b/gi,'somthin'],[/\bnothing\b/gi,'naethin'],[/\beverything\b/gi,'awthin'],
  [/\banything\b/gi,'oniething'],[/\bsomewhere\b/gi,'somewhaur'],
  [/\bnever\b/gi,'never'],[/\balways\b/gi,'aye'],[/\bagain\b/gi,'again'],
  [/\bthrough\b/gi,'through'],[/\benough\b/gi,'eneuch'],
  // -ing endings
  [/ing\b/g,'in'],
  // -ow endings  
  [/\bknow\b/gi,'ken'],[/\bthrow\b/gi,'throw'],[/\bgrow\b/gi,'grow'],
]

function applyScots(text) {
  let out = text
  SCOTS_MAP.forEach(([pat, rep]) => { out = out.replace(pat, rep) })
  return out
}

function ScotsDialogueTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  function convert() {
    if (!input.trim()) return
    setOutput(applyScots(input))
  }

  function copy() {
    navigator.clipboard?.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tool-card" id="tool-scots">
      <h3 style={{ color: 'var(--cca)' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scots Dialogue Converter</h3>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Convert standard English dialogue into Scots-flavoured speech. Useful for Dreslundic or
        any character with a broad regional accent. Results are a starting point — hand-tune as needed.
      </div>
      <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>English dialogue</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
            placeholder={"\"I will not go back there. You know that.\""} 
            style={{ width: '100%', resize: 'vertical', fontSize: '0.92em', padding: '6px 8px',
              background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6,
              color: 'var(--tx)', boxSizing: 'border-box', fontFamily: 'Georgia, serif', lineHeight: 1.6 }} />
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cca)', color: '#000', alignSelf: 'flex-start' }}
          onClick={convert}>Convert to Scots</button>
        {output && (
          <div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', textTransform: 'uppercase',
              letterSpacing: '.05em', marginBottom: 4 }}>Result</div>
            <div style={{ padding: '10px 12px', background: 'var(--sf)', border: '1px solid var(--brd)',
              borderRadius: 6, fontSize: '0.92em', fontFamily: 'Georgia, serif', lineHeight: 1.7,
              color: 'var(--tx)', marginBottom: 6, whiteSpace: 'pre-wrap' }}>{output}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-outline" onClick={copy}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setOutput('')}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Image Library ─────────────────────────────────────────────────
const IMG_LIB_CATS = ['All','Characters','Wardrobe','Items','Locations','Maps','Manuscript','Other']

function ImageLibraryTool({ db }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCat, setUploadCat] = useState('Other')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // Gather all images from across all tabs
  function gatherImages() {
    const imgs = []
    const d = db.db

    // Characters
    ;(d.characters || []).forEach(c => {
      if (c.image) imgs.push({ url: c.image, name: c.display_name || c.name, cat: 'Characters', id: c.id })
    })
    // Wardrobe
    ;(d.wardrobe || []).forEach(w => {
      if (w.image) imgs.push({ url: w.image, name: w.name, cat: 'Wardrobe', id: w.id })
    })
    // Items / Inventory
    ;(d.items || []).forEach(it => {
      if (it.image) imgs.push({ url: it.image, name: it.name, cat: 'Items', id: it.id })
    })
    ;(d.inventory || []).forEach(it => {
      if (it.image) imgs.push({ url: it.image, name: it.name, cat: 'Items', id: it.id })
    })
    // Locations
    ;(d.locations || []).forEach(loc => {
      if (loc.image) imgs.push({ url: loc.image, name: loc.name, cat: 'Locations', id: loc.id })
      if (loc.map_image) imgs.push({ url: loc.map_image, name: (loc.name || '') + ' (map)', cat: 'Maps', id: loc.id + '_map' })
    })
    // Maps tab
    ;(d.maps || []).forEach(m => {
      if (m.image) imgs.push({ url: m.image, name: m.name, cat: 'Maps', id: m.id })
    })
    // Manuscript covers + chapter images
    try {
      const bookMeta = JSON.parse(d.settings?.manuscript_books || '{}')
      Object.entries(bookMeta).forEach(([book, meta]) => {
        if (meta.cover) imgs.push({ url: meta.cover, name: `${book} Cover`, cat: 'Manuscript', id: 'cover_' + book })
      })
    } catch {}
    ;(d.manuscript || []).forEach(ch => {
      if (ch.chapter_image) imgs.push({
        url: ch.chapter_image, cat: 'Manuscript',
        name: `${ch.book} Ch.${ch.chapter_num}${ch.title ? ' — ' + ch.title : ''}`,
        id: ch.id + '_img'
      })
    })
    // Direct uploads (stored in image_library settings key)
    try {
      const direct = JSON.parse(d.settings?.image_library || '[]')
      direct.forEach(img => imgs.push({ ...img, direct: true }))
    } catch {}

    return imgs
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !uploadName.trim()) return
    setUploading(true)
    try {
      const { supabase } = await import('../supabase').catch(() => ({ supabase: null }))
      let url = null
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `library/${Date.now()}_${uploadName.replace(/\s+/g,'_')}.${ext}`
        const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
          url = urlData.publicUrl
        }
      }
      if (!url) {
        url = await new Promise(res => {
          const reader = new FileReader()
          reader.onload = ev => res(ev.target.result)
          reader.readAsDataURL(file)
        })
      }
      const existing = JSON.parse(db.db.settings?.image_library || '[]')
      const newEntry = { id: Date.now().toString(36), url, name: uploadName.trim(), cat: uploadCat, direct: true }
      db.saveSetting('image_library', JSON.stringify([...existing, newEntry]))
      setUploadName('')
      e.target.value = ''
    } catch(err) { console.error(err) }
    setUploading(false)
  }

  function deleteDirectImage(id) {
    try {
      const existing = JSON.parse(db.db.settings?.image_library || '[]')
      db.saveSetting('image_library', JSON.stringify(existing.filter(i => i.id !== id)))
    } catch {}
  }

  const allImgs = gatherImages()
  const filtered = allImgs.filter(img => {
    const mc = filterCat === 'All' || img.cat === filterCat
    const mq = !search || img.name.toLowerCase().includes(search.toLowerCase())
    return mc && mq
  })

  return (
    <div className="tool-card" id="tool-imagelib">
      <h3 style={{ color: 'var(--cl)' }}>🖼 Image Library</h3>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        All images from across the Compendium in one place — characters, wardrobe, items, locations,
        maps, manuscript covers and chapter headers. You can also upload images directly here.
      </div>

      {/* Upload strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end',
        padding: '8px 10px', background: 'var(--card)', borderRadius: 6,
        border: '1px solid var(--brd)', marginBottom: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 130, margin: 0 }}>
          <label>Name</label>
          <input value={uploadName} onChange={e => setUploadName(e.target.value)}
            placeholder="Image name…" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Category</label>
          <select value={uploadCat} onChange={e => setUploadCat(e.target.value)}>
            {IMG_LIB_CATS.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        <button className="btn btn-sm btn-outline"
          disabled={!uploadName.trim() || uploading}
          onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading…' : '📷 Upload image'}
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <input className="sx" placeholder="Search by name…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {IMG_LIB_CATS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
                background: filterCat === c ? 'var(--cl)' : 'none',
                color: filterCat === c ? '#000' : 'var(--dim)',
                border: `1px solid ${filterCat === c ? 'var(--cl)' : 'var(--brd)'}` }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginBottom: 8 }}>
        {filtered.length} image{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {filtered.map(img => (
          <div key={img.id} style={{ position: 'relative', background: 'var(--card)',
            border: '1px solid var(--brd)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ position: 'relative', paddingTop: '66%', cursor: 'pointer' }}
              onClick={() => setLightbox(img.url)}>
              <img src={img.url} alt={img.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'} />
              <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.92em',
                background: 'rgba(0,0,0,.6)', borderRadius: 4, padding: '1px 4px',
                color: '#fff' }}>↗</div>
            </div>
            <div style={{ padding: '5px 7px' }}>
              <div style={{ fontSize: '0.77em', fontWeight: 600, color: 'var(--tx)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</div>
              <div style={{ fontSize: '0.69em', color: 'var(--cl)' }}>{img.cat}</div>
            </div>
            {img.direct && (
              <button onClick={() => deleteDirectImage(img.id)}
                style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,.7)',
                  border: 'none', borderRadius: 4, color: '#ff3355', cursor: 'pointer',
                  fontSize: '0.85em', padding: '1px 5px', lineHeight: 1 }}>✕</button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px 0',
            color: 'var(--mut)', fontSize: '0.85em' }}>
            No images found. Upload some or add images to Characters, Wardrobe, Items, or Locations.
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

function BackfillTool({ db }) {
  const [result, setResult] = useState(null)

  function run() {
    const chars = db.db.characters || []
    const timeline = db.db.timeline || []
    let added = 0

    chars.forEach(ch => {
      if (!ch.birthday_lajen || ch.birthday_lajen === 'n/a (born in Mnaerah)' || ch.birthday_lajen === 'pending_math') return
      const name = ch.display_name || ch.name
      const existing = timeline.find(t => t.name === 'Birthday: ' + name)
      if (existing) return

      const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7) + added

      db.upsertEntry('timeline', {
        id: uid(),
        name: 'Birthday: ' + name,
        date_hc: ch.birthday_lajen,
        date_mnaerah: ch.birthday || '',
        sort_order: '',
        era: ch.books && ch.books.length ? ch.books[0] : '',
        detail: 'Auto-created from character birthday.',
        status: 'locked',
        books: ch.books || [],
        relationships: [],
        created: new Date().toISOString(),
      })
      added++
    })

    setResult(added)
  }

  return (
    <div>
      <button className="btn btn-primary btn-sm" style={{ background:'var(--cfl)' }} onClick={run}>
        Run Backfill
      </button>
      {result !== null && (
        <div style={{ marginTop:8, fontSize: '0.85em', color: result > 0 ? 'var(--sl)' : 'var(--dim)' }}>
          {result > 0
            ? `✓ Created ${result} birthday event${result !== 1 ? 's' : ''}.`
            : '✓ All birthdays already have timeline entries — nothing to add.'}
        </div>
      )}
    </div>
  )
}
