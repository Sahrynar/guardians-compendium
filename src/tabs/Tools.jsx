import { useState, useCallback, useRef } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

// ── Tool definitions for nav ─────────────────────────────────────
const TOOLS = [
  { id: 'l2m',       label: 'Lajen → Mnaerah',        emoji: '🌍', color: 'var(--cca)' },
  { id: 'm2l',       label: 'Mnaerah → Lajen',         emoji: '🌙', color: 'var(--ct)'  },
  { id: 'elapsed',   label: 'Time Elapsed',            emoji: '⏱', color: 'var(--ct)'  },
  { id: 'age',       label: 'Character Age at Event',  emoji: '🎂', color: 'var(--cc)'  },
  { id: 'units',     label: 'Unit Converter',          emoji: '📐', color: 'var(--cl)'  },
  { id: 'ixcitlatl', label: "Ix'Citlatl Converter",   emoji: '✦',  color: 'var(--cl)'  },
  { id: 'backfill',  label: 'Backfill Birthdays',    emoji: '🎂', color: 'var(--cc)'  },
]

function Row({ label, value }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <span className="calc-val">{value}</span>
    </div>
  )
}

// ── Ix'Citlatl converter ─────────────────────────────────────────
const DIGRAPHS = [['th','t'],['ph','p'],['sh','x'],['ch','ch'],['ll','l'],['wh','w']]
const CHAR_MAP = {
  b:'p', f:'p', g:'k', d:'t', r:'l', v:'w', j:'x', z:'s', q:'k',
  a:'a', e:'e', i:'i', o:'o', u:'u',
  k:"k'", c:'k', l:'l', m:'m', n:'n', p:'p', s:'s', t:'t',
  w:'w', x:'x', y:'y', h:'h',
}
function toIxCitlatl(name, gender) {
  if (!name.trim()) return ''
  let n = name.toLowerCase().trim()
  DIGRAPHS.forEach(([f, t]) => { n = n.split(f).join(t) })
  let result = ''
  for (const ch of n) {
    if (CHAR_MAP[ch] !== undefined) result += CHAR_MAP[ch]
    else if (" -'".includes(ch)) result += ch
    else result += ch
  }
  const vowels = new Set(['a','e','i','o','u'])
  if (result.length > 0 && !vowels.has(result[result.length-1]) && result[result.length-1] !== "'")
    result += 'a'
  result = result.charAt(0).toUpperCase() + result.slice(1)
  return (gender === 'female' ? "Ix'" : 'Ah') + result
}

function IxCitlatlTool() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [history, setHistory] = useState([])

  function convert() {
    if (!name.trim()) return
    const converted = toIxCitlatl(name, gender)
    setHistory(prev => [{ original: name, converted, gender, id: Date.now() }, ...prev.slice(0, 19)])
    setName('')
  }

  return (
    <div className="tool-card" id="tool-ixcitlatl">
      <h3 style={{ color: 'var(--cl)' }}>✦ Ix'Citlatl Name Converter</h3>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
        Converts any name into its Fiher (Ix'Citlatl) equivalent using Nahuatl/Maya phonology.
        Female private names begin with <strong style={{color:'var(--cl)'}}>Ix'</strong> (pronounced "eesh"),
        male with <strong style={{color:'var(--cca)'}}>Ah</strong>.
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:10 }}>
        <div className="field" style={{ flex:1, minWidth:160, margin:0 }}>
          <label>Name to convert</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key==='Enter' && convert()}
            placeholder="e.g. Gillison, Thomas, Rose…" />
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Prefix</label>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="female">Female — Ix'</option>
            <option value="male">Male — Ah</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm"
          style={{ background:'var(--cl)', color:'#000', alignSelf:'flex-end' }}
          onClick={convert}>Convert</button>
      </div>

      {history.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Results</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {history.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 8px',
                background:'var(--sf)', borderRadius:'var(--r)', border:'1px solid var(--brd)' }}>
                <span style={{ fontSize:10, color:'var(--dim)', minWidth:80 }}>{r.original}</span>
                <span style={{ fontSize:10, color:'var(--dim)' }}>→</span>
                <span style={{ fontSize:13, fontFamily:"'Cinzel',serif",
                  color: r.gender==='female' ? 'var(--cl)' : 'var(--cca)', fontWeight:700 }}>
                  {r.converted}
                </span>
                <button style={{ marginLeft:'auto', background:'none', border:'none',
                  color:'var(--dim)', cursor:'pointer', fontSize:10, padding:'1px 4px' }}
                  onClick={() => navigator.clipboard?.writeText(r.converted)}
                  title="Copy to clipboard">📋</button>
              </div>
            ))}
          </div>
          <button style={{ fontSize:9, color:'var(--mut)', background:'none', border:'none',
            cursor:'pointer', marginTop:6, padding:0 }}
            onClick={() => setHistory([])}>Clear history</button>
        </div>
      )}
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
      {/* ── Quick-nav bar ── */}
      <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:'var(--ctl)', marginBottom:10 }}>🔧 Tools</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16, padding:'8px 10px',
        background:'var(--card)', border:'1px solid var(--brd)', borderRadius:'var(--rl)' }}>
        <span style={{ fontSize:9, color:'var(--dim)', alignSelf:'center', marginRight:4, textTransform:'uppercase', letterSpacing:'.04em' }}>Jump to:</span>
        {TOOLS.map(t => (
          <button key={t.id}
            style={{ fontSize:10, padding:'3px 10px', borderRadius:12, background:'none',
              border:`1px solid ${t.color}44`, color:t.color, cursor:'pointer', whiteSpace:'nowrap' }}
            onClick={() => scrollTo(t.id)}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Lajen → Mnaerah ── */}
      <div className="tool-card" id="tool-l2m">
        <h3 style={{ color:'var(--cca)' }}>🌍 Lajen → Mnaerah Converter</h3>
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
        <h3 style={{ color:'var(--ct)' }}>🌙 Mnaerah → Lajen Converter</h3>
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
        <h3 style={{ color:'var(--ct)' }}>⏱ Time Elapsed Between Two Dates</h3>
        <div style={{ fontSize:10, color:'var(--dim)', marginBottom:8 }}>Pick events from the dropdown or enter years manually.</div>

        <div style={{ fontSize:10, color:'var(--cca)', marginBottom:4, fontWeight:600 }}>START</div>
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

        <div style={{ fontSize:10, color:'var(--cca)', marginBottom:4, fontWeight:600, marginTop:8 }}>END</div>
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

        <button className="btn btn-primary btn-sm" style={{ background:'var(--ct)' }} onClick={calcElapsed}>Calculate</button>
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
          <div style={{ fontSize:10, color:'var(--mut)', marginTop:6 }}>Pick character + event, or enter years manually.</div>
        )}
      </div>

      {/* ── Unit Converter ── */}
      <div className="tool-card" id="tool-units">
        <h3 style={{ color:'var(--cl)' }}>📐 Generic Time Unit Converter</h3>
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

      {/* ── Ix'Citlatl Converter ── */}
      <IxCitlatlTool />

      {/* ── Birthday Backfill ── */}
      <div className="tool-card" id="tool-backfill">
        <h3 style={{ color:'var(--cc)' }}>🎂 Backfill Birthday Timeline Entries</h3>
        <div style={{ fontSize:10, color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
          Auto-creates a timeline entry for every character who has a Lajen birthday set,
          but doesn't yet have a matching "Birthday: [Name]" event in the timeline.
          Safe to run multiple times — won't create duplicates.
        </div>
        <BackfillTool db={db} />
      </div>
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
      <button className="btn btn-primary btn-sm" style={{ background:'var(--cc)' }} onClick={run}>
        Run Backfill
      </button>
      {result !== null && (
        <div style={{ marginTop:8, fontSize:11,
          color: result > 0 ? 'var(--sl)' : 'var(--dim)' }}>
          {result > 0
            ? `✓ Created ${result} birthday event${result !== 1 ? 's' : ''}.`
            : '✓ All birthdays already have timeline entries — nothing to add.'}
        </div>
      )}
    </div>
  )
}
