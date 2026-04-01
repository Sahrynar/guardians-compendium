import { useState, useCallback, useEffect } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

// ── Speak helper (Web Speech API) ────────────────────────────────
function speak(text, lang) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  if (lang) u.lang = lang
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

function Row({ label, value }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <span className="calc-val">{value}</span>
    </div>
  )
}

// ── Accordion wrapper ────────────────────────────────────────────
function Accordion({ id, title, emoji, color, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div id={'tool-' + id} style={{
      border: `1px solid ${color}44`,
      borderRadius: 'var(--rl)',
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: open ? `${color}11` : 'var(--card)',
          border: 'none', padding: '10px 14px', cursor: 'pointer',
          color: 'var(--tx)', textAlign: 'left', transition: '.15s',
        }}
      >
        <span style={{ fontSize: '1.1em' }}>{emoji}</span>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.95em', color, flex: 1 }}>{title}</span>
        <span style={{ fontSize: '0.75em', color: 'var(--dim)', transform: open ? 'rotate(90deg)' : 'none', transition: '.15s', display: 'inline-block' }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--sf)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Ix'Citlatl name converter language systems ───────────────────
const LANG_SYSTEMS = [
  {
    id: 'nahuatl_strict',
    label: 'Nahuatl (Strict)',
    prefix_f: 'Ix', prefix_m: 'Ah',
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
    prefix_f: 'Ix', prefix_m: 'Ah',
    note: 'Opening consonants dropped, vowel-forward',
    convert: (n) => {
      const MAP = { b:'p',f:'p',g:'',d:'t',r:'l',v:'w',j:'x',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase()
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
    prefix_f: 'Ix', prefix_m: 'Ah',
    note: 'Glottal stops preserved, x=sh',
    convert: (n) => {
      const MAP = { b:'b',d:'t',f:'p',g:'k',j:'h',r:'l',v:'w',z:'s',q:'k',
        a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',
        p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h' }
      let s = n.toLowerCase().replace(/sh/g,'x').replace(/th/g,'t').replace(/ph/g,'p')
      let r = ''
      for (const ch of s) r += MAP[ch] !== undefined ? MAP[ch] : (" -'".includes(ch) ? ch : ch)
      return r.charAt(0).toUpperCase() + r.slice(1)
    }
  },
  {
    id: 'tzotzil',
    label: 'Tzotzil',
    prefix_f: 'Ix', prefix_m: 'Ah',
    note: 'Ejective consonants approximated',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/ph/g,"p'").replace(/th/g,"t'").replace(/ch/g,"ch'")
        .replace(/r/g,'l').replace(/d/g,'t').replace(/b/g,"b'")
        .replace(/f/g,'p').replace(/v/g,'w').replace(/g/g,'k').replace(/z/g,'s')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'classic_mayan',
    label: 'Classic Mayan',
    prefix_f: 'Ix', prefix_m: 'Ah',
    note: 'Hieroglyphic-era approximation',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,'l').replace(/d/g,'t').replace(/f/g,'p')
        .replace(/v/g,'b').replace(/g/g,'k').replace(/z/g,'s')
        .replace(/j/g,'h').replace(/q/g,'k')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'mixtec',
    label: 'Mixtec',
    prefix_f: 'Ix', prefix_m: 'Nu',
    note: 'Tone-language approximation, r→nd',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,'nd').replace(/th/g,'s').replace(/sh/g,'x')
        .replace(/f/g,'v').replace(/g/g,'ku').replace(/d/g,'t')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'zapotec',
    label: 'Zapotec',
    prefix_f: 'Ix', prefix_m: 'Be',
    note: 'Vowel harmony, r→l',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,'l').replace(/b/g,'p').replace(/d/g,'t')
        .replace(/g/g,'k').replace(/f/g,'p').replace(/v/g,'b')
        .replace(/sh/g,'x').replace(/th/g,'t')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'totonac',
    label: 'Totonac',
    prefix_f: 'Ix', prefix_m: 'Ta',
    note: 'Lateral fricatives, retroflex approx',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,'lh').replace(/sh/g,'lh').replace(/f/g,'p')
        .replace(/d/g,'t').replace(/g/g,'k').replace(/v/g,'w')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'huastec',
    label: 'Huastec',
    prefix_f: 'Ix', prefix_m: 'Ts',
    note: 'Ts- affricates, nasals prominent',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/z/g,'ts').replace(/ch/g,'ts').replace(/r/g,'l')
        .replace(/d/g,'t').replace(/g/g,'k').replace(/f/g,'p')
        .replace(/v/g,'w').replace(/sh/g,'s')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'pipil',
    label: 'Pipil (Nawat)',
    prefix_f: 'Ix', prefix_m: 'No',
    note: 'Salvadoran Nahuatl variant',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,'l').replace(/b/g,'p').replace(/d/g,'t')
        .replace(/g/g,'k').replace(/f/g,'p').replace(/v/g,'w')
        .replace(/z/g,'s').replace(/j/g,'h')
      if (s && !'aeiou'.includes(s[s.length-1])) s += 'i'
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'kiche',
    label: "K'iche' Maya",
    prefix_f: 'Ix', prefix_m: 'Aj',
    note: "Q' uvulars, glottalized stops",
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/c(?=[aou])/g,"k'").replace(/qu/g,"k'")
        .replace(/r/g,'l').replace(/d/g,'t').replace(/b/g,"b'")
        .replace(/f/g,'p').replace(/v/g,'w').replace(/g/g,'k')
        .replace(/z/g,'s').replace(/sh/g,'x').replace(/j/g,'x')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
  {
    id: 'qanjobal',
    label: "Q'anjob'al",
    prefix_f: 'Ix', prefix_m: 'Aw',
    note: 'Highland Maya, complex consonant inventory',
    convert: (n) => {
      let s = n.toLowerCase()
        .replace(/r/g,"y").replace(/d/g,'t').replace(/b/g,"b'")
        .replace(/f/g,'p').replace(/v/g,'w').replace(/g/g,'k')
        .replace(/sh/g,'x').replace(/z/g,'s')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  },
]

function IxCitlatlTool({ db }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(
        db?.getSetting?.('ixcitlatl_history') ||
        localStorage.getItem('ixcitlatl_history') ||
        '[]'
      )
    } catch { return [] }
  })

  function saveHistory(h) {
    setHistory(h)
    db?.saveSetting?.('ixcitlatl_history', JSON.stringify(h))
  }

  function convert() {
    if (!name.trim()) return
    const isFemale = gender === 'female'
    const results = LANG_SYSTEMS.map(sys => {
      const converted = sys.convert(name.trim())
      const prefix = isFemale ? sys.prefix_f : sys.prefix_m
      const result = prefix === 'Ix'
        ? `Ix'${converted}`
        : `${prefix}${converted}`
      return { system: sys.id, label: sys.label, result, note: sys.note }
    })
    const entry = { id: Date.now(), original: name.trim(), gender, results }
    saveHistory([entry, ...history.slice(0, 19)])
    setName('')
  }

  return (
    <div>
      <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Enter a Mnaerah (real-world) name to see how the Xitalar would render it across all 12 Mesoamerican language systems.
        <span style={{ color: 'var(--cl)', marginLeft: 6 }}>Ix' prefix = female · Ah/variant = male</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
        <div className="field" style={{ flex: 1, minWidth: 140, margin: 0 }}>
          <label>Name to convert</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && convert()}
            placeholder="e.g. Thomas, Lila, Saraenya…" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value)} style={{ minWidth: 100 }}>
            <option value="female">Female (Ix')</option>
            <option value="male">Male (Ah/variant)</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cl)', color: '#000', alignSelf: 'flex-end' }}
          onClick={convert}>Convert</button>
      </div>

      {history.length > 0 && (
        <div>
          {history.map(h => (
            <div key={h.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.85em', color: 'var(--cca)', fontWeight: 700, marginBottom: 5 }}>
                {h.original} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>({h.gender})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8em' }}>
                  <thead>
                    <tr>
                      {['System','Result','Notes',''].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: 'var(--dim)', padding: '2px 8px 4px 0',
                          fontSize: '0.85em', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {h.results.map((r, i) => (
                      <tr key={r.system} style={{ borderTop: '1px solid rgba(255,255,255,.04)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                        <td style={{ padding: '4px 8px 4px 0', color: 'var(--dim)', whiteSpace: 'nowrap' }}>{r.label}</td>
                        <td style={{ padding: '4px 8px 4px 0' }}>
                          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1em', fontWeight: 700,
                            color: h.gender === 'female' ? 'var(--cl)' : 'var(--cca)' }}>
                            {r.result}
                          </span>
                        </td>
                        <td style={{ padding: '4px 8px 4px 0', color: 'var(--mut)', fontSize: '0.85em', fontStyle: 'italic' }}>{r.note}</td>
                        <td style={{ padding: '4px 0', whiteSpace: 'nowrap' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.9em', padding: '0 3px' }}
                            onClick={() => navigator.clipboard?.writeText(r.result)} title="Copy">📋</button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.9em', padding: '0 3px' }}
                            onClick={() => speak(r.result)} title="Hear it">🔊</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button style={{ fontSize: '0.8em', color: 'var(--mut)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => saveHistory([])}>Clear history</button>
        </div>
      )}
    </div>
  )
}

// ── Pronunciation helper language list ───────────────────────────
// Real-world BCP-47 codes for TTS; in-world systems marked phonologyTBD
const PRONUN_SYSTEMS = [
  // In-world languages
  { id: 'common',    label: 'Lajen Common',  group: 'In-World', desc: 'English/European base', confirmed: true,  bcp47: 'en-GB', generate: w => w },
  { id: 'ixcitlatl', label: "Ix'Citlatl",   group: 'In-World', desc: "x=sh, tl=one sound, Ix=eesh, '=glottal", confirmed: true, bcp47: null,
    generate: w => w.replace(/Ix'/gi,'eesh-').replace(/tl/gi,'tl').replace(/x/gi,'sh').replace(/tz/gi,'ts').replace(/hu/gi,'w') },
  { id: 'murvetian',  label: 'Murvetian',    group: 'In-World', desc: 'Italian-inspired (phonology TBD)', confirmed: false, bcp47: 'it-IT', generate: w => w },
  { id: 'thaeronic',  label: 'Thaeronic',   group: 'In-World', desc: 'Greek-inspired (phonology TBD)', confirmed: false, bcp47: 'el-GR', generate: w => w },
  { id: 'dreslundic', label: 'Dreslundic',  group: 'In-World', desc: 'Germanic/Norse-inspired (phonology TBD)', confirmed: false, bcp47: 'de-DE', generate: w => w },
  { id: 'dakara',     label: 'Dakara',      group: 'In-World', desc: 'Sanskrit/Indian-inspired (phonology TBD)', confirmed: false, bcp47: 'hi-IN', generate: w => w },
  { id: 'kandori',    label: 'Kandorī',     group: 'In-World', desc: 'Japanese/Asian-inspired (phonology TBD)', confirmed: false, bcp47: 'ja-JP', generate: w => w },
  { id: 'xeradi',     label: 'Xeradi',      group: 'In-World', desc: 'Persian/Iranian-inspired (phonology TBD)', confirmed: false, bcp47: 'fa-IR', generate: w => w },
  { id: 'hafari',     label: 'Hafari',      group: 'In-World', desc: 'Arabic-inspired (phonology TBD)', confirmed: false, bcp47: 'ar-SA', generate: w => w },
  { id: 'lurlish',    label: 'Lurlish',     group: 'In-World', desc: 'Celtic/Welsh-inspired (phonology TBD)', confirmed: false, bcp47: 'cy-GB', generate: w => w },
  // Real-world reference languages (for hearing authentic sounds)
  { id: 'italian',    label: 'Italian',     group: 'European', desc: 'Italian TTS', confirmed: true, bcp47: 'it-IT', generate: w => w },
  { id: 'spanish',    label: 'Spanish',     group: 'European', desc: 'Spanish TTS', confirmed: true, bcp47: 'es-ES', generate: w => w },
  { id: 'french',     label: 'French',      group: 'European', desc: 'French TTS', confirmed: true, bcp47: 'fr-FR', generate: w => w },
  { id: 'portuguese', label: 'Portuguese',  group: 'European', desc: 'Portuguese TTS', confirmed: true, bcp47: 'pt-PT', generate: w => w },
  { id: 'german',     label: 'German',      group: 'European', desc: 'German TTS', confirmed: true, bcp47: 'de-DE', generate: w => w },
  { id: 'dutch',      label: 'Dutch',       group: 'European', desc: 'Dutch TTS', confirmed: true, bcp47: 'nl-NL', generate: w => w },
  { id: 'swedish',    label: 'Swedish',     group: 'European', desc: 'Swedish TTS', confirmed: true, bcp47: 'sv-SE', generate: w => w },
  { id: 'norwegian',  label: 'Norwegian',   group: 'European', desc: 'Norwegian TTS', confirmed: true, bcp47: 'nb-NO', generate: w => w },
  { id: 'danish',     label: 'Danish',      group: 'European', desc: 'Danish TTS', confirmed: true, bcp47: 'da-DK', generate: w => w },
  { id: 'welsh',      label: 'Welsh',       group: 'European', desc: 'Welsh TTS', confirmed: true, bcp47: 'cy-GB', generate: w => w },
  { id: 'irish',      label: 'Irish Gaelic',group: 'European', desc: 'Irish Gaelic TTS', confirmed: true, bcp47: 'ga-IE', generate: w => w },
  { id: 'scots_gael', label: 'Scots Gaelic',group: 'European', desc: 'Scots Gaelic TTS', confirmed: true, bcp47: 'gd-GB', generate: w => w },
  { id: 'latin',      label: 'Latin',       group: 'European', desc: 'Latin via Italian TTS', confirmed: true, bcp47: 'it-IT', generate: w => w },
  { id: 'greek',      label: 'Greek',       group: 'European', desc: 'Modern Greek TTS', confirmed: true, bcp47: 'el-GR', generate: w => w },
  { id: 'russian',    label: 'Russian',     group: 'European', desc: 'Russian TTS', confirmed: true, bcp47: 'ru-RU', generate: w => w },
  { id: 'polish',     label: 'Polish',      group: 'European', desc: 'Polish TTS', confirmed: true, bcp47: 'pl-PL', generate: w => w },
  { id: 'czech',      label: 'Czech',       group: 'European', desc: 'Czech TTS', confirmed: true, bcp47: 'cs-CZ', generate: w => w },
  { id: 'hungarian',  label: 'Hungarian',   group: 'European', desc: 'Hungarian TTS', confirmed: true, bcp47: 'hu-HU', generate: w => w },
  { id: 'finnish',    label: 'Finnish',     group: 'European', desc: 'Finnish TTS', confirmed: true, bcp47: 'fi-FI', generate: w => w },
  { id: 'romanian',   label: 'Romanian',    group: 'European', desc: 'Romanian TTS', confirmed: true, bcp47: 'ro-RO', generate: w => w },
  // Middle Eastern / Asian
  { id: 'arabic',     label: 'Arabic',      group: 'Middle East & Asia', desc: 'Arabic TTS', confirmed: true, bcp47: 'ar-SA', generate: w => w },
  { id: 'persian',    label: 'Persian/Farsi',group:'Middle East & Asia', desc: 'Persian TTS', confirmed: true, bcp47: 'fa-IR', generate: w => w },
  { id: 'turkish',    label: 'Turkish',     group: 'Middle East & Asia', desc: 'Turkish TTS', confirmed: true, bcp47: 'tr-TR', generate: w => w },
  { id: 'hebrew',     label: 'Hebrew',      group: 'Middle East & Asia', desc: 'Hebrew TTS', confirmed: true, bcp47: 'he-IL', generate: w => w },
  { id: 'hindi',      label: 'Hindi',       group: 'Middle East & Asia', desc: 'Hindi TTS', confirmed: true, bcp47: 'hi-IN', generate: w => w },
  { id: 'sanskrit_ref',label:'Sanskrit (via Hindi)',group:'Middle East & Asia', desc: 'Sanskrit approximated via Hindi TTS', confirmed: true, bcp47: 'hi-IN', generate: w => w },
  { id: 'urdu',       label: 'Urdu',        group: 'Middle East & Asia', desc: 'Urdu TTS', confirmed: true, bcp47: 'ur-PK', generate: w => w },
  { id: 'bengali',    label: 'Bengali',     group: 'Middle East & Asia', desc: 'Bengali TTS', confirmed: true, bcp47: 'bn-BD', generate: w => w },
  { id: 'japanese',   label: 'Japanese',    group: 'Middle East & Asia', desc: 'Japanese TTS', confirmed: true, bcp47: 'ja-JP', generate: w => w },
  { id: 'korean',     label: 'Korean',      group: 'Middle East & Asia', desc: 'Korean TTS', confirmed: true, bcp47: 'ko-KR', generate: w => w },
  { id: 'mandarin',   label: 'Mandarin',    group: 'Middle East & Asia', desc: 'Mandarin Chinese TTS', confirmed: true, bcp47: 'zh-CN', generate: w => w },
  { id: 'cantonese',  label: 'Cantonese',   group: 'Middle East & Asia', desc: 'Cantonese TTS', confirmed: true, bcp47: 'zh-HK', generate: w => w },
  { id: 'thai',       label: 'Thai',        group: 'Middle East & Asia', desc: 'Thai TTS', confirmed: true, bcp47: 'th-TH', generate: w => w },
  { id: 'vietnamese', label: 'Vietnamese',  group: 'Middle East & Asia', desc: 'Vietnamese TTS', confirmed: true, bcp47: 'vi-VN', generate: w => w },
  { id: 'indonesian', label: 'Indonesian',  group: 'Middle East & Asia', desc: 'Indonesian TTS', confirmed: true, bcp47: 'id-ID', generate: w => w },
  // African / Indigenous / Other
  { id: 'swahili',    label: 'Swahili',     group: 'African & Other', desc: 'Swahili TTS', confirmed: true, bcp47: 'sw-KE', generate: w => w },
  { id: 'zulu',       label: 'Zulu',        group: 'African & Other', desc: 'Zulu TTS', confirmed: true, bcp47: 'zu-ZA', generate: w => w },
  { id: 'afrikaans',  label: 'Afrikaans',   group: 'African & Other', desc: 'Afrikaans TTS', confirmed: true, bcp47: 'af-ZA', generate: w => w },
  { id: 'nahuatl_ref',label: 'Nahuatl (ref)',group:'African & Other', desc: 'Nahuatl via Spanish TTS approximation', confirmed: true, bcp47: 'es-MX', generate: w => w },
  { id: 'basque',     label: 'Basque',      group: 'African & Other', desc: 'Basque TTS', confirmed: true, bcp47: 'eu-ES', generate: w => w },
  { id: 'catalan',    label: 'Catalan',     group: 'African & Other', desc: 'Catalan TTS', confirmed: true, bcp47: 'ca-ES', generate: w => w },
  // Manual fallback
  { id: 'manual', label: 'Manual', group: 'Manual', desc: 'Type pronunciation yourself', confirmed: true, bcp47: null, generate: w => w },
]

const PRONUN_GROUPS = ['In-World', 'European', 'Middle East & Asia', 'African & Other', 'Manual']

function PronunciationTool() {
  const [word, setWord] = useState('')
  const [system, setSystem] = useState('ixcitlatl')
  const [manualOverride, setManualOverride] = useState('')
  const [result, setResult] = useState(null)

  const sys = PRONUN_SYSTEMS.find(s => s.id === system) || PRONUN_SYSTEMS[0]

  function generate() {
    if (!word.trim()) return
    if (system === 'manual') {
      setResult({ word: word.trim(), pronunciation: manualOverride || word.trim(), system: sys.label, bcp47: null })
      return
    }
    const pronunciation = sys.generate(word.trim())
    setResult({ word: word.trim(), pronunciation, system: sys.label, autoGenerated: sys.confirmed, bcp47: sys.bcp47 })
  }

  return (
    <div>
      <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Generate and hear how any word sounds. In-world language systems marked ⚠ have phonology not yet confirmed — output is approximate.
        Real-world languages use device TTS for authentic reference sounds.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
        <div className="field" style={{ flex: 1, minWidth: 140, margin: 0 }}>
          <label>Word or name</label>
          <input value={word} onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Ixelaoien, Akatriel…" />
        </div>
        <div className="field" style={{ margin: 0, minWidth: 180 }}>
          <label>Language system</label>
          <select value={system} onChange={e => { setSystem(e.target.value); setResult(null) }}>
            {PRONUN_GROUPS.map(grp => (
              <optgroup key={grp} label={grp}>
                {PRONUN_SYSTEMS.filter(s => s.group === grp).map(s => (
                  <option key={s.id} value={s.id}>{!s.confirmed ? '⚠ ' : ''}{s.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cwr)', color: '#000', alignSelf: 'flex-end' }}
          onClick={generate}>Generate</button>
      </div>

      {!sys.confirmed && system !== 'manual' && (
        <div style={{ fontSize: '0.8em', color: 'var(--sp)', padding: '4px 8px',
          background: 'rgba(255,204,0,.07)', borderRadius: 4, marginBottom: 8,
          border: '1px solid rgba(255,204,0,.2)' }}>
          ⚠ {sys.label} phonology not yet confirmed — output is placeholder only.
        </div>
      )}

      {sys.id === 'manual' && (
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Type pronunciation</label>
          <input value={manualOverride} onChange={e => setManualOverride(e.target.value)}
            placeholder="e.g. eesh-eh-lah-OH-yen" />
        </div>
      )}

      {result && (
        <div style={{ padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--brd)',
          borderRadius: 'var(--r)', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8em', color: 'var(--dim)' }}>{result.word} ({result.system})</span>
            <span style={{ fontSize: '1.2em', fontFamily: "'Cinzel',serif", color: 'var(--cwr)', fontWeight: 700 }}>{result.pronunciation}</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em' }}
              onClick={() => speak(result.pronunciation, result.bcp47)} title="Hear it">🔊</button>
            <button style={{ background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)',
              cursor: 'pointer', fontSize: '0.75em', padding: '2px 6px', borderRadius: 3 }}
              onClick={() => navigator.clipboard?.writeText(result.pronunciation)}>Copy</button>
          </div>
          {!result.autoGenerated && system !== 'manual' && (
            <div style={{ fontSize: '0.75em', color: 'var(--mut)', marginTop: 5 }}>
              Pronunciation rules for this language are not yet confirmed. Switch to Manual to lock in the correct form.
            </div>
          )}
        </div>
      )}

      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: '0.8em', color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
          📖 Ix'Citlatl Sound Guide
        </summary>
        <div style={{ marginTop: 6, padding: 8, background: 'var(--card)', borderRadius: 'var(--r)', fontSize: '0.8em', lineHeight: 1.8 }}>
          {[["Ix'","eesh (prefix)"],["x","sh (as in 'shell')"],["tl","tl as one sound (like in 'Nahuatl')"],
            ["tz","ts (as in 'bits')"],["hu","w"],["'","glottal stop (like 'uh-oh')"],
            ["c (before a/o)","k"],["c (before e/i)","s"],["ll","long L"]].map(([sym,val]) => (
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

// ── Scots Dialogue Converter ─────────────────────────────────────
const SCOTS_RULES = [
  // Vocabulary replacements (do these first, longest first to avoid partial matches)
  [/\bwould not\b/gi, 'wadnae'],
  [/\bwill not\b/gi, 'willnae'],
  [/\bdo not\b/gi, 'dinnae'],
  [/\bdoes not\b/gi, 'disnae'],
  [/\bdid not\b/gi, 'didnae'],
  [/\bcannot\b/gi, 'cannae'],
  [/\bcan not\b/gi, 'cannae'],
  [/\bhave not\b/gi, 'havenae'],
  [/\bhas not\b/gi, 'hasnae'],
  [/\bwas not\b/gi, 'wasnae'],
  [/\bwere not\b/gi, 'werenae'],
  [/\bwon't\b/gi, 'willnae'],
  [/\bwouldn't\b/gi, 'wadnae'],
  [/\bdon't\b/gi, 'dinnae'],
  [/\bdoesn't\b/gi, 'disnae'],
  [/\bdidn't\b/gi, 'didnae'],
  [/\bcan't\b/gi, 'cannae'],
  [/\bhaven't\b/gi, 'havenae'],
  [/\bhasn't\b/gi, 'hasnae'],
  [/\bwasn't\b/gi, 'wasnae'],
  [/\bweren't\b/gi, 'werenae'],
  [/\bisn't\b/gi, 'isnae'],
  [/\bis not\b/gi, 'isnae'],
  [/\baren't\b/gi, 'arnae'],
  [/\bare not\b/gi, 'arnae'],
  [/\bI am\b/gi, "Ah'm"],
  [/\bI'm\b/gi, "Ah'm"],
  [/\bI will\b/gi, "Ah'll"],
  [/\bI'll\b/gi, "Ah'll"],
  [/\bI have\b/gi, "Ah've"],
  [/\bI've\b/gi, "Ah've"],
  [/\bI would\b/gi, "Ah'd"],
  [/\bI'd\b/gi, "Ah'd"],
  [/\b(?<![A-Z])I\b/g, 'Ah'],
  [/\byou are\b/gi, "ye're"],
  [/\byou're\b/gi, "ye're"],
  [/\byou\b/gi, 'ye'],
  [/\byour\b/gi, 'yer'],
  [/\byours\b/gi, 'yers'],
  [/\bthey are\b/gi, "they're"],
  [/\bthey\b/gi, 'they'],
  [/\btheir\b/gi, 'thir'],
  [/\bthere\b/gi, 'thare'],
  [/\bwhat\b/gi, 'whit'],
  [/\bwhere\b/gi, 'whaur'],
  [/\bwhen\b/gi, 'whan'],
  [/\bwhy\b/gi, 'whit wey'],
  [/\bhow\b/gi, 'hoo'],
  [/\bwho\b/gi, 'wha'],
  [/\bwhose\b/gi, 'whas'],
  [/\bjust\b/gi, 'juist'],
  [/\bold\b/gi, 'auld'],
  [/\bcold\b/gi, 'cauld'],
  [/\bbold\b/gi, 'bauld'],
  [/\bgold\b/gi, 'gowd'],
  [/\bhold\b/gi, 'haud'],
  [/\btold\b/gi, 'tellt'],
  [/\bsold\b/gi, 'selt'],
  [/\bhome\b/gi, 'hame'],
  [/\bstone\b/gi, 'stane'],
  [/\bbone\b/gi, 'bane'],
  [/\balone\b/gi, 'alane'],
  [/\bknow\b/gi, 'ken'],
  [/\bknows\b/gi, 'kens'],
  [/\bknew\b/gi, 'kent'],
  [/\bknowing\b/gi, 'kennin'],
  [/\bgood\b/gi, 'guid'],
  [/\bblood\b/gi, 'bluid'],
  [/\bfood\b/gi, 'fuid'],
  [/\bmood\b/gi, 'muid'],
  [/\bwood\b/gi, 'wuid'],
  [/\bwould\b/gi, 'wad'],
  [/\bshould\b/gi, 'shuid'],
  [/\bcould\b/gi, 'cuid'],
  [/\bmore\b/gi, 'mair'],
  [/\bbefore\b/gi, 'afore'],
  [/\bover\b/gi, 'ower'],
  [/\bunder\b/gi, 'unner'],
  [/\btogether\b/gi, 'thegither'],
  [/\bmother\b/gi, 'mither'],
  [/\bfather\b/gi, 'faither'],
  [/\bbrother\b/gi, 'brither'],
  [/\bother\b/gi, 'ither'],
  [/\bwater\b/gi, 'watter'],
  [/\bnever\b/gi, 'never'],
  [/\bever\b/gi, 'ever'],
  [/\bevery\b/gi, 'ilka'],
  [/\beveryone\b/gi, 'aabody'],
  [/\beverything\b/gi, 'aathing'],
  [/\bnothing\b/gi, 'naethin'],
  [/\banything\b/gi, 'onyethin'],
  [/\bsomething\b/gi, 'somethin'],
  [/\bsomeone\b/gi, 'somebody'],
  [/\banyone\b/gi, 'onybody'],
  [/\bno one\b/gi, 'naebody'],
  [/\bnobody\b/gi, 'naebody'],
  [/\blittle\b/gi, 'wee'],
  [/\bsmall\b/gi, 'wee'],
  [/\bbig\b/gi, 'muckle'],
  [/\bgreat\b/gi, 'braw'],
  [/\bgirl\b/gi, 'lass'],
  [/\bboy\b/gi, 'lad'],
  [/\bwoman\b/gi, 'wumman'],
  [/\bman\b(?!'s)/gi, 'man'],
  [/\bchild\b/gi, 'bairn'],
  [/\bchildren\b/gi, 'bairns'],
  [/\bfriend\b/gi, 'freend'],
  [/\bhave\b/gi, 'hae'],
  [/\bhas\b/gi, 'haes'],
  [/\bhad\b/gi, 'haed'],
  [/\bgive\b/gi, 'gie'],
  [/\bgives\b/gi, 'gies'],
  [/\bgiven\b/gi, 'gien'],
  [/\bgave\b/gi, 'gied'],
  [/\bgo\b/gi, 'gang'],
  [/\bgoes\b/gi, 'gangs'],
  [/\bgoing\b/gi, 'gaun'],
  [/\bcome\b/gi, 'come'],
  [/\bask\b/gi, 'speir'],
  [/\basks\b/gi, 'speirs'],
  [/\bcall\b/gi, 'cry'],
  [/\bcalled\b/gi, 'cried'],
  [/\bsay\b/gi, 'say'],
  [/\bsaid\b/gi, 'said'],
  [/\btell\b/gi, 'tell'],
  [/\btold\b/gi, 'tellt'],
  [/\bthink\b/gi, 'think'],
  [/\bthought\b/gi, 'thocht'],
  [/\bthinking\b/gi, 'thinkin'],
  [/\bmust\b/gi, 'maun'],
  [/\bnow\b/gi, 'noo'],
  [/\bnot\b/gi, 'nae'],
  [/\bno\b/gi, 'nae'],
  [/\byes\b/gi, 'aye'],
  [/\bright\b/gi, 'richt'],
  [/\bright\b/gi, 'richt'],
  [/\bright\b/gi, 'richt'],
  [/\blight\b/gi, 'licht'],
  [/\bright\b/gi, 'richt'],
  [/\bnight\b/gi, 'nicht'],
  [/\bfight\b/gi, 'fecht'],
  [/\bfought\b/gi, 'focht'],
  [/\bright\b/gi, 'richt'],
  [/\bsight\b/gi, 'sicht'],
  [/\bmight\b/gi, 'micht'],
  // -ing → -in' (gerunds)
  [/ing\b/gi, "in'"],
  // -'s possessives / contractions - leave as is
]

function convertToScots(text) {
  let result = text
  for (const [pattern, replacement] of SCOTS_RULES) {
    result = result.replace(pattern, replacement)
  }
  // Capitalise first letter of sentences
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase())
  return result
}

function ScotsConverter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState('silvia') // 'silvia' | 'elizabeth'

  function convert() {
    if (!input.trim()) return
    setOutput(convertToScots(input))
  }

  return (
    <div>
      <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Converts standard English dialogue into Scots dialect for{' '}
        <span style={{ color: 'var(--cwr)', fontWeight: 600 }}>Silvia MacLeod</span> and{' '}
        <span style={{ color: 'var(--cwr)', fontWeight: 600 }}>Elizabeth MacLeod</span>.
        Output is a rough guide — review and adjust to taste.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[['silvia','Silvia MacLeod'],['elizabeth','Elizabeth MacLeod']].map(([v,l]) => (
          <button key={v}
            onClick={() => setMode(v)}
            style={{ fontSize: '0.8em', padding: '3px 12px', borderRadius: 12, cursor: 'pointer',
              background: mode === v ? 'var(--cwr)' : 'none',
              color: mode === v ? '#000' : 'var(--cwr)',
              border: '1px solid var(--cwr)' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>English dialogue</label>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type or paste dialogue here…"
            style={{ minHeight: 120, resize: 'vertical', width: '100%' }} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Scots output</label>
          <textarea value={output} readOnly
            placeholder="Converted dialogue appears here…"
            style={{ minHeight: 120, resize: 'vertical', width: '100%', background: 'var(--chi)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--cwr)', color: '#000' }}
          onClick={convert}>Convert</button>
        <button className="btn btn-outline btn-sm"
          onClick={() => navigator.clipboard?.writeText(output)}
          disabled={!output}>Copy output</button>
        <button className="btn btn-outline btn-sm"
          onClick={() => { setInput(''); setOutput('') }}>Clear</button>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: '0.8em', color: 'var(--dim)', cursor: 'pointer', userSelect: 'none' }}>
          📖 Common Scots substitutions
        </summary>
        <div style={{ marginTop: 6, padding: 8, background: 'var(--card)', borderRadius: 'var(--r)', fontSize: '0.78em', lineHeight: 1.9 }}>
          {[["I / I'm","Ah / Ah'm"],["you","ye"],["your","yer"],["know","ken"],
            ["little / small","wee"],["big / great","muckle / braw"],["child","bairn"],
            ["don't","dinnae"],["can't","cannae"],["won't","willnae"],["isn't","isnae"],
            ["wasn't","wasnae"],["should","shuid"],["would","wad"],["must","maun"],
            ["now","noo"],["what","whit"],["where","whaur"],["yes","aye"],["no / not","nae"],
            ["night","nicht"],["right","richt"],["light","licht"],["old","auld"],["cold","cauld"],
            ["home","hame"],["stone","stane"],["good","guid"],["more","mair"],
            ["-ing","-in'"]].map(([en,sc]) => (
            <div key={en} style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--dim)', minWidth: 130 }}>{en}</span>
              <span style={{ color: 'var(--cwr)', fontWeight: 600 }}>{sc}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

// ── BackfillTool ─────────────────────────────────────────────────
function BackfillTool({ db }) {
  const [result, setResult] = useState(null)

  function run() {
    const chars = db.db.characters || []
    const timeline = db.db.timeline || []
    let added = 0
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7) + added

    chars.forEach(ch => {
      if (!ch.birthday_lajen || ch.birthday_lajen === 'n/a (born in Mnaerah)' || ch.birthday_lajen === 'pending_math') return
      const name = ch.display_name || ch.name
      const existing = timeline.find(t => t.name === 'Birthday: ' + name)
      if (existing) return
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
      <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Auto-creates a timeline entry for every character who has a Lajen birthday set,
        but doesn't yet have a matching "Birthday: [Name]" event in the timeline.
        Safe to run multiple times — won't create duplicates.
      </div>
      <button className="btn btn-primary btn-sm" style={{ background: 'var(--cfl)' }} onClick={run}>
        Run Backfill
      </button>
      {result !== null && (
        <div style={{ marginTop: 8, fontSize: '0.85em', color: result > 0 ? 'var(--sl)' : 'var(--dim)' }}>
          {result > 0
            ? `✓ Created ${result} birthday event${result !== 1 ? 's' : ''}.`
            : '✓ All birthdays already have timeline entries — nothing to add.'}
        </div>
      )}
    </div>
  )
}

// ── Main Tools component ─────────────────────────────────────────
export default function Tools({ db }) {
  // Column width setting
  const [colWidth, setColWidth] = useState(() => {
    return db.settings?.tools_colwidth || db.getSetting?.('tools_colwidth') || 'md'
  })

  useEffect(() => {
    if (db.settings?.tools_colwidth) setColWidth(db.settings.tools_colwidth)
  }, [db.settings])

  function saveColWidth(w) {
    setColWidth(w)
    db.saveSetting('tools_colwidth', w)
  }

  const minWidths = { xs: 260, sm: 300, md: 360, lg: 440, xl: 560 }
  const minW = minWidths[colWidth] || 360

  // Calendar state
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
    if (eEv1) { const ev = events.find(e => e.id === eEv1); if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y1 = parseFloat(m[0]) } }
    if (eEv2) { const ev = events.find(e => e.id === eEv2); if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y2 = parseFloat(m[0]) } }
    const mY1 = eC1==='mnaerah' ? y1 : (y1/RATIO)+1516.5
    const mY2 = eC2==='mnaerah' ? y2 : (y2/RATIO)+1516.5
    const mElapsed = Math.abs(mY2-mY1)
    setElapResult({ mElapsed, lElapsed: mElapsed*RATIO })
  }

  function calcAge() {
    let by = parseFloat(aBY), ey = parseFloat(aEY)
    if (aCH) { const ch = chars.find(c => c.id === aCH); if (ch && ch.birthday) { const m = ch.birthday.match(/-?\d{4}/); if (m) by = parseFloat(m[0]) } }
    if (aEV) { const ev = events.find(e => e.id === aEV); if (ev) { const m = (ev.date_mnaerah||'').match(/-?\d+/)||[]; if (m[0]) ey = parseFloat(m[0]) } }
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

  return (
    <div>
      {/* ── Header with column picker ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1em', color: 'var(--ctl)' }}>🔧 Tools</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75em', color: 'var(--mut)', marginRight: 2 }}>Width:</span>
          {['xs','sm','md','lg','xl'].map(w => (
            <button key={w}
              onClick={() => saveColWidth(w)}
              style={{ fontSize: '0.7em', padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                background: colWidth === w ? 'var(--ctl)' : 'none',
                color: colWidth === w ? '#000' : 'var(--dim)',
                border: `1px solid ${colWidth === w ? 'var(--ctl)' : 'var(--brd)'}` }}>
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Accordion grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap: 0, alignItems: 'start' }}>

        {toolOrder.map(sectionId => {
          const groupStyle = {
            cursor: 'default',
            padding: '0 0 4px 0',
          }
          const handleStyle = {
            fontSize: '0.7em', color: 'var(--dim)', textTransform: 'uppercase',
            letterSpacing: '.06em', marginBottom: 5, padding: '0 2px',
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'grab',
            userSelect: 'none',
          }
          if (sectionId === 'datetime') { return (
          <div key="datetime" style={groupStyle}
            draggable
            onDragStart={() => startToolDrag('datetime')}
            onDragOver={e => { e.preventDefault(); overToolDrag('datetime') }}
            onDrop={dropTool}
          >
          <div style={handleStyle}>
            <span style={{ fontSize: 'var(--fs-sm)', opacity: .5 }}>⠿</span>
            📅 Date &amp; Time
          </div>
        {/* Date & Time group */}

          <Accordion id="l2m" title="Lajen → Mnaerah" emoji="🌍" color="var(--cca)" defaultOpen>
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
          </Accordion>

          <Accordion id="m2l" title="Mnaerah → Lajen" emoji="🌙" color="var(--ct)">
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
          </Accordion>

          <Accordion id="elapsed" title="Time Elapsed" emoji="⏱" color="var(--cq)">
            <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 8 }}>Pick events from the dropdown or enter years manually.</div>
            <div style={{ fontSize: '0.8em', color: 'var(--cca)', marginBottom: 4, fontWeight: 600 }}>START</div>
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
            <div style={{ fontSize: '0.8em', color: 'var(--cca)', marginBottom: 4, fontWeight: 600, marginTop: 8 }}>END</div>
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
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--cq)' }} onClick={calcElapsed}>Calculate</button>
            {elapResult && (
              <div className="calc-result" style={{ marginTop: 8 }}>
                <Row label="Mnaerah time elapsed" value={`~${elapResult.mElapsed.toFixed(2)} years (~${Math.round(elapResult.mElapsed*MDAYS).toLocaleString()} days)`} />
                <Row label="Lajen time elapsed" value={`~${elapResult.lElapsed.toFixed(2)} years (~${Math.round(elapResult.lElapsed*LDAYS).toLocaleString()} days)`} />
                <Row label="Ratio" value={`1 Mnaerah year = ${RATIO} Lajen years`} />
              </div>
            )}
          </Accordion>

          <Accordion id="age" title="Character Age at Event" emoji="🎂" color="var(--cc)">
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
              <div style={{ fontSize: '0.85em', color: 'var(--mut)', marginTop: 6 }}>Pick character + event, or enter years manually.</div>
            )}
          </Accordion>

          <Accordion id="units" title="Generic Time Unit Converter" emoji="📐" color="var(--csp)">
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
          </Accordion>

          <Accordion id="backfill" title="Birthday Backfill" emoji="🗓" color="var(--cfl)">
            <BackfillTool db={db} />
          </Accordion>
        </div>
          ); } // end datetime
          if (sectionId === 'nameslang') { return (
          <div key="nameslang" style={groupStyle}
            draggable
            onDragStart={() => startToolDrag('nameslang')}
            onDragOver={e => { e.preventDefault(); overToolDrag('nameslang') }}
            onDrop={dropTool}
          >
          <div style={handleStyle}>
            <span style={{ fontSize: 'var(--fs-sm)', opacity: .5 }}>⠿</span>
            ✦ Names &amp; Languages
          </div>

          <Accordion id="ixcitlatl" title="Ix'Citlatl Name Converter" emoji="✦" color="var(--cl)" defaultOpen>
            <IxCitlatlTool db={db} />
          </Accordion>

          <Accordion id="pronun" title="Pronunciation & Translation" emoji="🔊" color="var(--cwr)">
            <PronunciationTool />
          </Accordion>

          <Accordion id="scots" title="Scots Dialogue Converter" emoji="🏴󠁧󠁢󠁳󠁣󠁴󠁿" color="var(--cwr)">
            <ScotsConverter />
          </Accordion>
        </div>
          ); } // end nameslang
          return null
        })}

      </div>
    </div>
  )
}
