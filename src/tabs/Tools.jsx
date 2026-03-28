import { useState, useCallback, useMemo } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'
import Lightbox from '../components/common/Lightbox'

// ── CSS vars used ────────────────────────────────────────────────
// var(--cca) amber/calendar  var(--ct) teal/timeline  var(--cq) purple/questions
// var(--cc) blue/characters  var(--csp) spellings      var(--cl) locations green
// var(--cwr) wardrobe pink   var(--cfl) flags orange   var(--ci) items

// ── TOOL NAV ─────────────────────────────────────────────────────
const TOOLS = [
  { id:'dates',      label:'Date & Time',         emoji:'🌍', color:'var(--cca)' },
  { id:'units',      label:'Unit Converter',      emoji:'📐', color:'var(--csp)' },
  { id:'ixcitlatl',  label:"Ix'Citlatl Names",    emoji:'✦',  color:'var(--cl)'  },
  { id:'pronun',     label:'Pronunciation',        emoji:'🔊', color:'var(--cwr)' },
  { id:'scots',      label:'Scots Dialogue',       emoji:'🏴', color:'var(--ct)'  },
  { id:'backfill',   label:'Birthday Backfill',    emoji:'🗓', color:'var(--cfl)' },
  { id:'images',     label:'Image Library',        emoji:'🖼', color:'var(--cwr)' },
]

function Row({ label, value, color }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <span className="calc-val" style={color ? { color } : {}}>{value}</span>
    </div>
  )
}

// ── Speak with language tag ───────────────────────────────────────
function speakWithLang(text, langCode) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  if (langCode) u.lang = langCode
  u.rate = 0.8
  window.speechSynthesis.speak(u)
}

// ── Date formatting helpers ───────────────────────────────────────
function fmtLajenDate(year, monthIdx, day) {
  const m = MONTHS[monthIdx] || MONTHS[0]
  const y = year > 0 ? `HC ${year}` : year === 0 ? 'HC 0' : `${Math.abs(year)} before HC 1`
  return `${y}, ${m.n} Day ${day}`
}

function fmtMnaerahDate(yearAD, approx) {
  const prefix = approx ? '~' : ''
  if (yearAD > 0) return `${prefix}${Math.round(yearAD)} AD`
  return `${prefix}${Math.abs(Math.round(yearAD))} BC`
}

// Converts HC lajen date to Mnaerah AD year
function lajenToMnaerah(hcYear, monthIdx = 0, day = 1) {
  const totalLDays = (hcYear - 1) * LDAYS + monthIdx * LDPM + (day - 1)
  const mYearsFromHC1 = totalLDays / (RATIO * LDAYS)
  return 1516.5 + mYearsFromHC1
}

// Converts Mnaerah AD year to HC lajen
function mnaerahToLajen(mYearAD) {
  const mYearsFromHC = mYearAD - 1516.5
  const lYears = mYearsFromHC * RATIO
  const lYr = Math.round(lYears)
  const totalLDays = Math.round(lYears * LDAYS)
  const lMonthIdx = Math.floor((Math.abs(totalLDays) % LDAYS) / LDPM)
  const lDay = Math.max(1, Math.abs(totalLDays) % LDPM)
  return { lYear: lYr, lMonthIdx: Math.abs(lMonthIdx) % 12, lDay }
}

// ════════════════════════════════════════════════════════════════
// DATE & TIME TOOL
// ════════════════════════════════════════════════════════════════
function DateTimeTool({ chars, events }) {
  // --- Converter state ---
  const [direction, setDirection] = useState('l2m') // 'l2m' | 'm2l'
  const [lYear, setLYear] = useState(320)
  const [lMonth, setLMonth] = useState(0)
  const [lDay, setLDay] = useState(1)
  const [mYear, setMYear] = useState(1554)
  const [mMonth, setMMonth] = useState(6) // 1-12
  const [mDay, setMDay] = useState(21)
  const [fuzzy, setFuzzy] = useState(false)

  // --- Time Elapsed ---
  const [seg1Cal, setSeg1Cal] = useState('mnaerah')
  const [seg1Y, setSeg1Y] = useState('')
  const [seg1M, setSeg1M] = useState('')
  const [seg1D, setSeg1D] = useState('')
  const [seg2Cal, setSeg2Cal] = useState('mnaerah')
  const [seg2Y, setSeg2Y] = useState('')
  const [seg2M, setSeg2M] = useState('')
  const [seg2D, setSeg2D] = useState('')
  const [elapsedResult, setElapsedResult] = useState(null)
  const [seg1Ev, setSeg1Ev] = useState('')
  const [seg2Ev, setSeg2Ev] = useState('')

  // --- Crossed-world lifetime ---
  const [segments, setSegments] = useState([
    { cal: 'mnaerah', y: '', m: '', d: '', fuzzy: false, label: 'Born' },
    { cal: 'mnaerah', y: '', m: '', d: '', fuzzy: false, label: 'Died / Present' },
  ])
  const [lifetimeResult, setLifetimeResult] = useState(null)

  // --- Character Age ---
  const [ageCh, setAgeCh] = useState('')
  const [ageEv, setAgeEv] = useState('')
  const [ageY, setAgeY] = useState('')
  const [ageResult, setAgeResult] = useState(null)

  // --- Unit Converter (moved here) ---

  // Converter results
  const l2mResult = useMemo(() => {
    const mYearAD = lajenToMnaerah(lYear, lMonth, lDay)
    const mMonthApprox = Math.floor(((mYearAD % 1) * 12)) + 1
    const mDayApprox = Math.floor(((mYearAD % (1/12)) * 365)) + 1
    return {
      mYearAD,
      mMonthApprox: Math.min(mMonthApprox, 12),
      lajenDate: fmtLajenDate(lYear, lMonth, lDay),
      mnaerahDate: fmtMnaerahDate(mYearAD, true),
      season: MONTHS[lMonth].ssn,
      totalLDays: (lYear - 1) * LDAYS + lMonth * LDPM + (lDay - 1),
    }
  }, [lYear, lMonth, lDay])

  const m2lResult = useMemo(() => {
    const { lYear: ly, lMonthIdx, lDay: ld } = mnaerahToLajen(parseFloat(mYear) || 1554)
    return {
      lYear: ly, lMonthIdx, lDay: ld,
      lajenDate: fmtLajenDate(ly, lMonthIdx, ld),
      mnaerahDate: `${mYear} AD`,
      lMonthName: MONTHS[lMonthIdx]?.n || '',
      lSeason: MONTHS[lMonthIdx]?.ssn || '',
    }
  }, [mYear])

  // Convert a date segment to Mnaerah AD float for elapsed calc
  function segToMnaerah(cal, y, m, d) {
    const yf = parseFloat(y) || 0
    const mf = (parseFloat(m) || 1) - 1
    const df = (parseFloat(d) || 1) - 1
    if (cal === 'mnaerah') return yf + mf / 12 + df / 365
    return lajenToMnaerah(yf, mf, df)
  }

  function calcElapsed() {
    let t1, t2
    if (seg1Ev) {
      const ev = events.find(e => e.id === seg1Ev)
      if (ev) {
        const m = (ev.date_mnaerah || ev.date_hc || '').match(/-?\d+(\.\d+)?/)
        if (m) t1 = parseFloat(m[0])
        if (ev.date_hc && !ev.date_mnaerah) t1 = lajenToMnaerah(t1)
      }
    } else { t1 = segToMnaerah(seg1Cal, seg1Y, seg1M, seg1D) }
    if (seg2Ev) {
      const ev = events.find(e => e.id === seg2Ev)
      if (ev) {
        const m = (ev.date_mnaerah || ev.date_hc || '').match(/-?\d+(\.\d+)?/)
        if (m) t2 = parseFloat(m[0])
        if (ev.date_hc && !ev.date_mnaerah) t2 = lajenToMnaerah(t2)
      }
    } else { t2 = segToMnaerah(seg2Cal, seg2Y, seg2M, seg2D) }
    if (t1 === undefined || t2 === undefined) return
    const mElapsed = Math.abs(t2 - t1)
    setElapsedResult({ mElapsed, lElapsed: mElapsed * RATIO, days: Math.round(mElapsed * 365.25) })
  }

  function calcLifetime() {
    const filled = segments.filter(s => s.y)
    if (filled.length < 2) return
    let totalM = 0
    for (let i = 0; i < filled.length - 1; i++) {
      const t1 = segToMnaerah(filled[i].cal, filled[i].y, filled[i].m, filled[i].d)
      const t2 = segToMnaerah(filled[i + 1].cal, filled[i + 1].y, filled[i + 1].m, filled[i + 1].d)
      totalM += Math.abs(t2 - t1)
    }
    setLifetimeResult({ totalM, totalL: totalM * RATIO, days: Math.round(totalM * 365.25) })
  }

  function calcAge() {
    let bY
    if (ageCh) {
      const ch = chars.find(c => c.id === ageCh)
      if (ch?.birthday) { const m = ch.birthday.match(/-?\d{4}/); if (m) bY = parseFloat(m[0]) }
    }
    if (!bY && ageY) bY = parseFloat(ageY)
    let eY
    if (ageEv) {
      const ev = events.find(e => e.id === ageEv)
      if (ev) { const m = (ev.date_mnaerah || '').match(/-?\d+/); if (m) eY = parseFloat(m[0]) }
    }
    if (!eY) return
    if (!bY) return
    const age = eY - bY
    setAgeResult({ age, lAge: age * RATIO })
  }

  function addSegment() {
    setSegments(s => [...s, { cal: 'mnaerah', y: '', m: '', d: '', fuzzy: false, label: 'Crossing / Event' }])
  }
  function updateSeg(i, k, v) {
    setSegments(s => s.map((sg, idx) => idx === i ? { ...sg, [k]: v } : sg))
  }
  function removeSeg(i) {
    setSegments(s => s.filter((_, idx) => idx !== i))
  }

  const CalSel = ({ val, onChange }) => (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 10, padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', marginRight: 4 }}>
      <option value="mnaerah">Mnaerah (AD)</option>
      <option value="lajen">Lajen (HC)</option>
    </select>
  )

  const DateInput = ({ y, m, d, onY, onM, onD, fuzzy: fz, showFuzzy }) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="number" value={y} onChange={e => onY(e.target.value)} placeholder="Year"
        style={{ width: 70, fontSize: 11, padding: '4px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
      <input type="number" value={m} onChange={e => onM(e.target.value)} placeholder="Mo" min={1} max={12}
        style={{ width: 44, fontSize: 11, padding: '4px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
      <input type="number" value={d} onChange={e => onD(e.target.value)} placeholder="Day" min={1} max={30}
        style={{ width: 44, fontSize: 11, padding: '4px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
      {showFuzzy && <span style={{ fontSize: 9, color: 'var(--mut)' }}>~approx ok</span>}
    </div>
  )

  return (
    <div className="tool-card" id="tool-dates" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color: 'var(--cca)' }}>🌍 Date & Time</h3>

      {/* ── Bidirectional Converter ── */}
      <div style={{ borderBottom: '1px solid var(--brd)', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cca)', marginBottom: 10 }}>
          Calendar Converter
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--mut)', marginLeft: 8 }}>HC 320 = 1554 AD · 8.52 Lajen years = 1 Mnaerah year</span>
        </div>
        {/* Direction toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[['l2m','🌍 Lajen → Mnaerah'],['m2l','🌙 Mnaerah → Lajen']].map(([d,l]) => (
            <button key={d} onClick={() => setDirection(d)}
              style={{ fontSize: 10, padding: '4px 12px', borderRadius: 12,
                background: direction === d ? 'var(--cca)' : 'none',
                color: direction === d ? '#000' : 'var(--dim)',
                border: `1px solid ${direction === d ? 'var(--cca)' : 'var(--brd)'}`,
                cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {direction === 'l2m' && (
          <>
            <div className="field-row">
              <div className="field"><label>Lajen Year (HC)</label>
                <input type="number" value={lYear} onChange={e => setLYear(parseInt(e.target.value) || 0)} />
              </div>
              <div className="field"><label>Lajen Month</label>
                <select value={lMonth} onChange={e => setLMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m.num}. {m.n}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Lajen Day (1–30)</label>
              <input type="number" value={lDay} min={1} max={30} onChange={e => setLDay(parseInt(e.target.value) || 1)} />
            </div>
            <div className="calc-result">
              <Row label="Lajen Date" value={fmtLajenDate(lYear, lMonth, lDay)} />
              <Row label="Mnaerah Year (AD)" value={fmtMnaerahDate(l2mResult.mYearAD, true)} color="var(--cca)" />
              <Row label="Approx. Mnaerah Month" value={`Month ${l2mResult.mMonthApprox} of 12`} />
              <Row label="Lajen Season" value={l2mResult.season} />
              <Row label="Total Lajen Days from HC 1" value={l2mResult.totalLDays.toLocaleString()} />
            </div>
          </>
        )}

        {direction === 'm2l' && (
          <>
            <div className="field-row">
              <div className="field"><label>Mnaerah Year (AD, negative for BC)</label>
                <input type="number" value={mYear} placeholder="e.g. 1554 or -2500" onChange={e => setMYear(e.target.value)} />
              </div>
              <div className="field"><label>Mnaerah Month (1–12)</label>
                <input type="number" value={mMonth} min={1} max={12} onChange={e => setMMonth(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="field"><label>Mnaerah Day</label>
              <input type="number" value={mDay} min={1} max={31} onChange={e => setMDay(parseInt(e.target.value) || 1)} />
            </div>
            <div className="calc-result">
              <Row label="Mnaerah Date" value={`${mYear} AD, Month ${mMonth}, Day ${mDay}`} />
              <Row label="Lajen Year (HC)" value={m2lResult.lYear > 0 ? `HC ${m2lResult.lYear}` : `${Math.abs(m2lResult.lYear)} before HC 1`} color="var(--cca)" />
              <Row label="Lajen Month" value={`${m2lResult.lMonthName} (${m2lResult.lSeason})`} />
              <Row label="Approx. Lajen Day" value={m2lResult.lDay} />
            </div>
          </>
        )}
      </div>

      {/* ── Time Elapsed ── */}
      <div style={{ borderBottom: '1px solid var(--brd)', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cq)', marginBottom: 10 }}>⏱ Time Elapsed</div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Mix Lajen and Mnaerah dates freely — picks from events or manual entry.</div>
        {[['Start', seg1Cal, setSeg1Cal, seg1Y, setSeg1Y, seg1M, setSeg1M, seg1D, setSeg1D, seg1Ev, setSeg1Ev],
          ['End',   seg2Cal, setSeg2Cal, seg2Y, setSeg2Y, seg2M, setSeg2M, seg2D, setSeg2D, seg2Ev, setSeg2Ev]
        ].map(([lbl, cal, setCal, y, setY, m, setM, d, setD, ev, setEv]) => (
          <div key={lbl} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--cca)', fontWeight: 700, marginBottom: 4 }}>{lbl}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
              <CalSel val={cal} onChange={setCal} />
              <DateInput y={y} m={m} d={d} onY={setY} onM={setM} onD={setD} showFuzzy />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <select value={ev} onChange={e => setEv(e.target.value)}
                style={{ fontSize: 10, padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', width: '100%' }}>
                <option value="">— Or pick from timeline events —</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date_mnaerah || ev.date_hc || ''})</option>)}
              </select>
            </div>
          </div>
        ))}
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cq)' }} onClick={calcElapsed}>Calculate</button>
        {elapsedResult && (
          <div className="calc-result" style={{ marginTop: 8 }}>
            <Row label="Mnaerah time elapsed" value={`~${elapsedResult.mElapsed.toFixed(2)} years (~${elapsedResult.days.toLocaleString()} days)`} color="var(--cq)" />
            <Row label="Lajen time elapsed" value={`~${elapsedResult.lElapsed.toFixed(2)} years`} />
            <Row label="Ratio" value="1 Mnaerah year = 8.52 Lajen years" />
          </div>
        )}
      </div>

      {/* ── Crossed-World Lifetime ── */}
      <div style={{ borderBottom: '1px solid var(--brd)', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc)', marginBottom: 6 }}>🌐 Perceived Lifetime (Crossed Worlds)</div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 10 }}>
          Add as many crossing points as you need. Each segment is calculated in its own calendar, then totalled as perceived time.
        </div>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <input value={seg.label} onChange={e => updateSeg(i, 'label', e.target.value)}
              style={{ width: 100, fontSize: 10, padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}
              placeholder="Label (e.g. Born)" />
            <CalSel val={seg.cal} onChange={v => updateSeg(i, 'cal', v)} />
            <DateInput y={seg.y} m={seg.m} d={seg.d}
              onY={v => updateSeg(i, 'y', v)} onM={v => updateSeg(i, 'm', v)} onD={v => updateSeg(i, 'd', v)}
              showFuzzy />
            {i > 1 && (
              <button onClick={() => removeSeg(i)}
                style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', fontSize: 14 }}>✕</button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="btn btn-sm btn-outline" style={{ fontSize: 10 }} onClick={addSegment}>+ Add Crossing</button>
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={calcLifetime}>Calculate Lifetime</button>
        </div>
        {lifetimeResult && (
          <div className="calc-result" style={{ marginTop: 8 }}>
            <Row label="Total perceived time (Mnaerah years)" value={`~${lifetimeResult.totalM.toFixed(2)} years`} color="var(--cc)" />
            <Row label="Equivalent in Lajen years" value={`~${lifetimeResult.totalL.toFixed(2)} LY`} />
            <Row label="Approximate days" value={lifetimeResult.days.toLocaleString()} />
          </div>
        )}
      </div>

      {/* ── Character Age at Event ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc)', marginBottom: 10 }}>🎂 Character Age at Event</div>
        <div className="field"><label>Character (uses their birthday if set)</label>
          <select value={ageCh} onChange={e => { setAgeCh(e.target.value); setAgeResult(null) }}>
            <option value="">— Pick character —</option>
            {[...chars].sort((a,b) => (a.display_name||a.name||'').localeCompare(b.display_name||b.name||'')).map(c => (
              <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
            ))}
          </select>
        </div>
        <div className="field"><label>Or: Birth Year (Mnaerah AD)</label>
          <input type="number" value={ageY} placeholder="e.g. 1538" onChange={e => { setAgeY(e.target.value); setAgeResult(null) }} />
        </div>
        <div className="field"><label>Event</label>
          <select value={ageEv} onChange={e => { setAgeEv(e.target.value); setAgeResult(null) }}>
            <option value="">— Pick event —</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date_mnaerah || ev.date_hc || ''})</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={calcAge}>Calculate Age</button>
        {ageResult ? (
          <div className="calc-result" style={{ marginTop: 8 }}>
            <Row label="Age at event (Mnaerah years)" value={`${ageResult.age.toFixed(1)} years`} color="var(--cc)" />
            <Row label="Equivalent Lajen years" value={`${ageResult.lAge.toFixed(1)} LY`} />
          </div>
        ) : (ageCh || ageY) && ageEv ? (
          <div style={{ fontSize: 10, color: 'var(--sp)', marginTop: 6 }}>Could not calculate — check dates are set on character and event.</div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--mut)', marginTop: 6 }}>Pick character (or enter birth year) + event to calculate.</div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// UNIT CONVERTER
// ════════════════════════════════════════════════════════════════
function UnitTool() {
  const [amt, setAmt] = useState(1)
  const [from, setFrom] = useState('days')
  const toMin = { minutes:1, hours:60, days:1440, weeks:10080, months30:43200, months365:43829, years360:518400, years365:525960, decades:5259600, centuries:52596000 }
  const mins = amt * (toMin[from] || 1440)
  function fmtN(n) {
    if (n >= 1e9) return (n/1e9).toFixed(2)+' billion'
    if (n >= 1e6) return (n/1e6).toFixed(2)+' million'
    if (n >= 10000) return Math.round(n).toLocaleString()
    if (n >= 10) return n.toFixed(1)
    return n.toFixed(2)
  }
  const rows = [['Minutes',mins],['Hours',mins/60],['Days',mins/1440],['Weeks',mins/10080],
    ['Months (30-day)',mins/43200],['Years (Lajen/360-day)',mins/518400],
    ['Years (Mnaerah/365.25-day)',mins/525960],['Decades',mins/5259600],['Centuries',mins/52596000]]
  return (
    <div className="tool-card" id="tool-units" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color:'var(--csp)' }}>📐 Time Unit Converter</h3>
      <div className="field-row">
        <div className="field"><label>Amount</label>
          <input type="number" value={amt} onChange={e => setAmt(parseFloat(e.target.value)||0)} />
        </div>
        <div className="field"><label>From</label>
          <select value={from} onChange={e => setFrom(e.target.value)}>
            {Object.keys(toMin).map(k => <option key={k} value={k}>{k.replace(/([A-Z])/g,' $1').replace(/(\d+)/g,' $1')}</option>)}
          </select>
        </div>
      </div>
      <div className="calc-result">
        {rows.map(([l,v]) => <Row key={l} label={l} value={fmtN(v)} />)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// IX'CITLATL NAME CONVERTER
// ════════════════════════════════════════════════════════════════
const LANG_SYSTEMS = [
  { id:'nahuatl_strict', label:'Nahuatl (Strict)', prefix_f:'Ix', prefix_m:'Ah', note:'G→K, B/D/F/R/V mapped, no voiced stops',
    convert: n => { const D=[['th','t'],['ph','p'],['sh','x'],['ch','ch'],['ll','l'],['wh','w']]; const M={b:'p',f:'p',g:'k',d:'t',r:'l',v:'w',j:'x',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); D.forEach(([f,t])=>{s=s.split(f).join(t)}); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1])&&r[r.length-1]!=="'")r+='a'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'nahuatl_soft', label:'Nahuatl (Softened)', prefix_f:'Ix', prefix_m:'Ah', note:'Opening consonants dropped, vowel-forward',
    convert: n => { const M={b:'p',f:'p',g:'',d:'t',r:'l',v:'w',j:'x',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); let st=0; while(st<s.length&&!'aeiou'.includes(s[st])&&st<2)st++; s=s.slice(st); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1]))r+='a'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'yucatec', label:'Yucatec Maya', prefix_f:'Ix', prefix_m:'Ah', note:"Glottal stops, x=sh, -son→-'x endings",
    convert: n => { const M={b:"b'",f:'p',g:'',d:'t',r:'l',v:'w',j:'h',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); s=s.replace(/son$/,"'x"); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou x'.includes(r[r.length-1]))r+='ix'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'kiche', label:"K'iche' Maya", prefix_f:'Ix', prefix_m:'Ah', note:"Ejective pops (k', b', ch'), warrior-feel",
    convert: n => { const M={b:"b'",f:'p',g:"k'",d:'t',r:'l',v:'w',j:'h',z:'ts',q:"k'",a:'a',e:'e',i:'i',o:'o',u:'u',k:"k'",c:"k'",l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1]))r+='on'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'tzotzil', label:'Tzotzil Maya', prefix_f:'Ix', prefix_m:'Ah', note:'Softer Maya, j=h sound, flowing',
    convert: n => { const M={b:"b'",f:'p',g:'',d:'t',r:'l',v:'w',j:'j',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'j'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1]))r+='en'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'zapotec', label:'Zapotec', prefix_f:'Ix', prefix_m:'Ah', note:'Tonal, nasal, z-buzz, doubled final vowels',
    convert: n => { const M={b:'b',f:'p',g:'',d:'d',r:'l',v:'b',j:'h',z:'dz',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'z',t:'t',w:'w',x:'sh',y:'y',h:'h'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&'aeiou'.includes(r[r.length-1]))r+=r[r.length-1]; else r+='oo'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'mixtec', label:'Mixtec', prefix_f:'Ix', prefix_m:'Ah', note:'Tonal like Zapotec but softer, nasal -ni endings',
    convert: n => { const M={b:'v',f:'v',g:'',d:'t',r:'l',v:'v',j:'h',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'sh',y:'y',h:'h'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1]))r+='ini'; else r+='ni'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'purepecha', label:'Purépecha', prefix_f:'Ix', prefix_m:'Ah', note:'Language isolate — radical compression, crisp & alien',
    convert: n => { const M={b:'p',f:'p',g:'k',d:'ts',r:'',v:'p',j:'ts',z:'ts',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'ts',w:'w',x:'sh',y:'y',h:'h'}; let s=n.toLowerCase(); s=s.replace(/([aeiou])\1+/g,'$1'); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r.length>4)r=r.slice(0,5); if(r&&!'aeiou'.includes(r[r.length-1]))r+='i'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'totonac', label:'Totonac', prefix_f:'Ix', prefix_m:'Ah', note:'-tl endings like Nahuatl but with uvular stops',
    convert: n => { const M={b:'p',f:'p',g:'k',d:'t',r:'l',v:'w',j:'x',z:'s',q:'kw',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'sh',y:'y',h:'h'}; let s=n.toLowerCase(); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou'.includes(r[r.length-1]))r+='tl'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'zapotec_tonal', label:'Zapotec (Full Tonal)', prefix_f:'Ix', prefix_m:'Ah', note:'Full tonal doubling throughout',
    convert: n => { const M={b:'b',f:'p',g:'',d:'d',r:'l',v:'b',j:'h',z:'dz',q:'k',a:'aa',e:'ee',i:'ii',o:'oo',u:'uu',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'dz',t:'t',w:'w',x:'sh',y:'y',h:'h'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'blend_best', label:'✨ Best Mix Blend', prefix_f:'Ix', prefix_m:'Ah', note:'Mayan w-sound, melodic -on/-ien endings, balanced',
    convert: n => { const M={b:'w',f:'p',g:'',d:'t',r:'l',v:'w',j:'h',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); if(s.length>1&&!'aeiou'.includes(s[0]))s=s.slice(1); s=s.replace(/ison$/,'iwon').replace(/son$/,'won'); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou n'.includes(r[r.length-1]))r+='on'; return r.charAt(0).toUpperCase()+r.slice(1) }},
  { id:'canon_rules', label:'⭐ Ahilion-style Rules', prefix_f:'Ix', prefix_m:'Ah', note:'Opening consonant drops, -ison→-ilion, melodic Romance-Mayan blend',
    convert: n => { const M={b:'',f:'',g:'',d:'',r:'l',v:'w',j:'y',z:'s',q:'k',a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',c:'k',l:'l',m:'m',n:'n',p:'p',s:'s',t:'t',w:'w',x:'x',y:'y',h:'h'}; let s=n.toLowerCase(); let i=0; while(i<s.length&&!'aeiou'.includes(s[i])&&i<2)i++; s=s.slice(i); s=s.replace(/ison$/,'ilion').replace(/isen$/,'ilien').replace(/son$/,'lion'); let r=''; for(const ch of s) r+=M[ch]!==undefined?M[ch]:(" -'".includes(ch)?ch:ch); if(r&&!'aeiou n'.includes(r[r.length-1]))r+='on'; return r.charAt(0).toUpperCase()+r.slice(1) }},
]

// Real-world languages with proper BCP-47 codes for TTS
const REAL_LANGS = [
  { id:'japanese', label:'Japanese', code:'ja-JP', romanize: n => { const M={a:'a',e:'e',i:'i',o:'o',u:'u',k:'k',s:'s',t:'t',n:'n',h:'h',m:'m',y:'y',r:'r',w:'w',g:'g',z:'z',d:'d',b:'b',p:'p',f:'f',l:'r',v:'b',c:'k',q:'k',x:'s'}; let s=n.toLowerCase().replace(/[^a-z]/g,''); let r=''; for(const ch of s) r+=M[ch]||ch; return r.charAt(0).toUpperCase()+r.slice(1) }, note:'Romaji-style, r replaces l' },
  { id:'korean', label:'Korean', code:'ko-KR', romanize: n => { const M={a:'a',e:'e',i:'i',o:'o',u:'u',b:'b',d:'d',g:'g',j:'j',k:'k',l:'l',m:'m',n:'n',p:'p',r:'r',s:'s',t:'t',h:'h',y:'y',w:'w',f:'p',v:'b',z:'j',x:'s',c:'ch',q:'k'}; let s=n.toLowerCase().replace(/[^a-z]/g,''); let r=''; for(const ch of s) r+=M[ch]||ch; if(r&&!'aeiou'.includes(r[r.length-1]))r+='i'; return r.charAt(0).toUpperCase()+r.slice(1) }, note:'Romanization-style' },
  { id:'arabic', label:'Arabic', code:'ar-SA', romanize: n => { const M={a:'a',e:'a',i:'i',o:'u',u:'u',b:'b',d:'d',f:'f',g:'gh',h:'h',j:'j',k:'k',l:'l',m:'m',n:'n',p:'b',q:'q',r:'r',s:'s',t:'t',v:'w',w:'w',x:'kh',y:'y',z:'z',c:'k'}; let s=n.toLowerCase().replace(/[^a-z]/g,''); let r=''; for(const ch of s) r+=M[ch]||ch; return r.charAt(0).toUpperCase()+r.slice(1) }, note:'Arabic-inspired phonology' },
  { id:'welsh', label:'Welsh', code:'cy-GB', romanize: n => { return n.replace(/v/gi,'f').replace(/w(?=[aeiou])/gi,'gw').replace(/f$/i,'ff').charAt(0).toUpperCase()+n.slice(1).replace(/v/gi,'f').replace(/w(?=[aeiou])/gi,'gw') }, note:'Celtic/Welsh feel' },
  { id:'irish', label:'Irish/Celtic', code:'ga-IE', romanize: n => { return n.replace(/k/gi,'c').replace(/v/gi,'bh').replace(/w/gi,'mh') }, note:'Irish Gaelic phonology' },
  { id:'latin', label:'Latin', code:'la', romanize: n => { const M={j:'i',w:'v',k:'c',y:'i'}; let s=n.toLowerCase(); for(const [f,t] of Object.entries(M)) s=s.split(f).join(t); return s.charAt(0).toUpperCase()+s.slice(1)+'us' }, note:'Latinized form' },
  { id:'ancient_greek', label:'Ancient Greek', code:'el-GR', romanize: n => { return n.replace(/ch/gi,'kh').replace(/ph/gi,'ph').replace(/th/gi,'th').replace(/y/gi,'y').replace(/ck/gi,'k') }, note:'Hellenized phonology' },
  { id:'old_english', label:'Old English', code:'en-GB', romanize: n => { return n.replace(/v/gi,'f').replace(/j/gi,'g').replace(/k(?=[ei])/gi,'c') }, note:'Anglo-Saxon feel' },
  { id:'old_french', label:'Old French', code:'fr-FR', romanize: n => { return n.replace(/th/gi,'t').replace(/w/gi,'gu').replace(/k(?=[ei])/gi,'ch') }, note:'Medieval French phonology' },
  { id:'persian', label:'Persian/Farsi', code:'fa-IR', romanize: n => { const M={p:'p',b:'b',t:'t',d:'d',k:'k',g:'g',f:'f',v:'v',s:'s',z:'z',m:'m',n:'n',l:'l',r:'r',y:'y',a:'a',e:'e',i:'i',o:'o',u:'u',h:'h',w:'v',q:'gh',x:'kh',c:'ch'}; let s=n.toLowerCase().replace(/[^a-z]/g,''); let r=''; for(const ch of s) r+=M[ch]||ch; return r.charAt(0).toUpperCase()+r.slice(1) }, note:'Persian/Farsi-inspired' },
  { id:'sanskrit', label:'Sanskrit', code:'hi-IN', romanize: n => { return n.replace(/v/gi,'v').replace(/w/gi,'v').replace(/j(?=[aeiou])/gi,'jy').replace(/sh/gi,'ś').replace(/ch/gi,'ch').replace(/th/gi,'th') }, note:'Sanskrit-inspired' },
  { id:'sumerian', label:'Sumerian', code:'', romanize: n => { const M={f:'p',v:'b',j:'y',q:'k',x:'sh',z:'s',w:'u',c:'k'}; let s=n.toLowerCase().replace(/[^a-z]/g,''); for(const [f,t] of Object.entries(M)) s=s.split(f).join(t); if(s&&!'aeiou'.includes(s[s.length-1]))s+='um'; return s.charAt(0).toUpperCase()+s.slice(1) }, note:'Ancient Sumerian-inspired' },
  { id:'proto_indo', label:'Proto-Indo-European', code:'', romanize: n => { return '*'+n.toLowerCase().replace(/[^a-z]/g,'').replace(/[aeiou]{2,}/g, m=>m[0]) }, note:'PIE reconstruction style (prefix *)' },
]

// Old/Proto Lajen — placeholder systems pending phonology pass
const LAJEN_LANGS = [
  { id:'common', label:'Common Lajen', code:'en', confirmed:true, romanize: n=>n, note:'Standard Lajen — English base' },
  { id:'old_lajen', label:'Old Lajen', code:'', confirmed:false, romanize: n=>n+'ar', note:'⚠ Phonology TBD — adds -ar suffix as placeholder' },
  { id:'proto_lajen', label:'Proto-Lajen', code:'', confirmed:false, romanize: n=>'*'+n.toLowerCase(), note:'⚠ Phonology TBD — adds * prefix as placeholder' },
  { id:'xeradi', label:'Xeradi (Xerad)', code:'fa-IR', confirmed:false, romanize: n=>n, note:'⚠ Persian-adjacent — phonology pass needed' },
  { id:'hafari', label:'Hafari', code:'ar-SA', confirmed:false, romanize: n=>n, note:'⚠ Arabic-adjacent — phonology pass needed' },
  { id:'lurlish', label:'Lurlish/Lurlenian', code:'cy-GB', confirmed:false, romanize: n=>n, note:'⚠ Celtic/Welsh-adjacent — phonology pass needed' },
  { id:'thaeronic', label:'Thaeronic (Thaeron)', code:'el-GR', confirmed:false, romanize: n=>n, note:'⚠ Greek-adjacent — phonology pass needed' },
  { id:'dreslundic', label:'Dreslundic (Dreslund)', code:'de-DE', confirmed:false, romanize: n=>n, note:'⚠ Germanic-adjacent — phonology pass needed' },
  { id:'dakara', label:'Dakara (Pytem Dakar)', code:'hi-IN', confirmed:false, romanize: n=>n, note:'⚠ Sanskrit-adjacent — phonology pass needed' },
  { id:'kandori', label:'Kandorī (Khandria)', code:'ja-JP', confirmed:false, romanize: n=>n, note:'⚠ Japanese-adjacent — phonology pass needed' },
  { id:'murvetian', label:'Murvetian (Murvice)', code:'it-IT', confirmed:false, romanize: n=>n, note:'⚠ Italian-adjacent — phonology pass needed' },
  { id:'ixcitlatl_lajen', label:"Ix'Citlatl (Xitalar)", code:'', confirmed:true, romanize: n=>n, note:'See Ix\'Citlatl converter for full system' },
]

function IxCitlatlTool() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [activeSystems, setActiveSystems] = useState(new Set(LANG_SYSTEMS.map(s => s.id)))
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gcomp_ix_history') || '[]') } catch { return [] }
  })
  const [expanded, setExpanded] = useState(null)

  function toggleSystem(id) {
    setActiveSystems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function convert() {
    if (!name.trim()) return
    const prefix = gender === 'female' ? 'Ix' : 'Ah'
    const results = LANG_SYSTEMS
      .filter(s => activeSystems.has(s.id))
      .map(sys => ({
        system: sys.id, label: sys.label, note: sys.note,
        result: prefix + sys.convert(name.trim()),
      }))
    const entry = { id: Date.now(), original: name.trim(), gender, results }
    const next = [entry, ...history.slice(0, 19)]
    setHistory(next)
    try { localStorage.setItem('gcomp_ix_history', JSON.stringify(next)) } catch {}
    setName('')
    setExpanded(entry.id)
  }

  return (
    <div className="tool-card" id="tool-ixcitlatl" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color:'var(--cl)' }}>✦ Ix'Citlatl Name Converter</h3>
      <div style={{ fontSize:10, color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
        Converts any name across Mesoamerican language systems. Female names begin with <strong style={{ color:'var(--cl)' }}>Ix</strong>, male with <strong style={{ color:'var(--cca)' }}>Ah</strong>. Results are always computed — no overrides.
      </div>

      {/* System picker */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
          Show systems: <button style={{ fontSize:9, background:'none', border:'none', color:'var(--cl)', cursor:'pointer', padding:'0 4px' }} onClick={() => setActiveSystems(new Set(LANG_SYSTEMS.map(s=>s.id)))}>All</button>
          <button style={{ fontSize:9, background:'none', border:'none', color:'var(--mut)', cursor:'pointer', padding:'0 4px' }} onClick={() => setActiveSystems(new Set())}>None</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {LANG_SYSTEMS.map(s => (
            <button key={s.id} onClick={() => toggleSystem(s.id)}
              style={{ fontSize:9, padding:'2px 8px', borderRadius:10,
                background: activeSystems.has(s.id) ? 'var(--cl)' : 'none',
                color: activeSystems.has(s.id) ? '#000' : 'var(--dim)',
                border: `1px solid ${activeSystems.has(s.id) ? 'var(--cl)' : 'var(--brd)'}`,
                cursor:'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:12 }}>
        <div className="field" style={{ flex:1, minWidth:160, margin:0 }}>
          <label>Name to convert</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && convert()}
            placeholder="e.g. Thomas, Rose, Gillison…" />
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Prefix</label>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="female">Female — Ix</option>
            <option value="male">Male — Ah</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm" style={{ background:'var(--cl)', color:'#000', alignSelf:'flex-end' }}
          onClick={convert}>Convert All</button>
      </div>

      {history.length > 0 && (
        <div>
          {history.map(h => (
            <div key={h.id} style={{ marginBottom:8, border:'1px solid var(--brd)', borderRadius:8, overflow:'hidden' }}>
              {/* Collapsed header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 12px', background:'var(--card)', cursor:'pointer' }}
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:12, fontFamily:"'Cinzel',serif", color:'var(--cl)', fontWeight:700 }}>{h.original}</span>
                  <span style={{ fontSize:9, color:'var(--dim)' }}>{h.gender} · {h.results.length} systems</span>
                  {/* Show first 3 results as preview */}
                  {expanded !== h.id && h.results.slice(0,3).map(r => (
                    <span key={r.system} style={{ fontSize:10, color:'var(--cl)', fontFamily:"'Cinzel',serif" }}>{r.result}</span>
                  ))}
                  {expanded !== h.id && h.results.length > 3 && <span style={{ fontSize:9, color:'var(--mut)' }}>+{h.results.length-3} more</span>}
                </div>
                <span style={{ fontSize:10, color:'var(--mut)' }}>{expanded === h.id ? '▾' : '▸'}</span>
              </div>
              {/* Expanded table */}
              {expanded === h.id && (
                <div style={{ padding:'10px 12px', overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr>
                        {['System','Result','Notes',''].map(l => (
                          <th key={l} style={{ textAlign:l==='Result'?'left':'left', color:'var(--dim)', padding:'2px 8px 6px 0', fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {h.results.map((r, i) => (
                        <tr key={r.system} style={{ borderTop:'1px solid rgba(255,255,255,.04)', background:i%2?'rgba(255,255,255,.02)':'transparent' }}>
                          <td style={{ padding:'5px 8px 5px 0', color:'var(--dim)', whiteSpace:'nowrap' }}>{r.label}</td>
                          <td style={{ padding:'5px 8px 5px 0' }}>
                            <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700, color:h.gender==='female'?'var(--cl)':'var(--cca)' }}>{r.result}</span>
                          </td>
                          <td style={{ padding:'5px 8px 5px 0', color:'var(--mut)', fontSize:9, fontStyle:'italic' }}>{r.note}</td>
                          <td style={{ padding:'5px 0', whiteSpace:'nowrap' }}>
                            <button style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:10, padding:'0 3px' }}
                              onClick={() => navigator.clipboard?.writeText(r.result)} title="Copy">📋</button>
                            <button style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:10, padding:'0 3px' }}
                              onClick={() => speakWithLang(r.result, 'nah')} title="Hear">🔊</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          <button style={{ fontSize:9, color:'var(--mut)', background:'none', border:'none', cursor:'pointer', padding:0 }}
            onClick={() => { setHistory([]); try { localStorage.removeItem('gcomp_ix_history') } catch {} }}>Clear history</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PRONUNCIATION HELPER (three dropdowns)
// ════════════════════════════════════════════════════════════════
function PronunciationTool() {
  const [word, setWord] = useState('')
  const [tab, setTab] = useState('ixcitlatl') // 'ixcitlatl' | 'lajen' | 'realworld'
  // Ix'Citlatl mode
  const [ixSystem, setIxSystem] = useState('nahuatl_strict')
  // Lajen mode
  const [lajenLang, setLajenLang] = useState('common')
  // Real-world mode — multi-select
  const [rwSelected, setRwSelected] = useState(['japanese'])
  const [result, setResult] = useState(null)

  function toggleRw(id) {
    setRwSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function generate() {
    if (!word.trim()) return
    const w = word.trim()
    let results = []

    if (tab === 'ixcitlatl') {
      const sys = LANG_SYSTEMS.find(s => s.id === ixSystem)
      if (sys) {
        const rom = sys.convert(w)
        results = [{ label: sys.label, romanized: rom, code: 'nah', note: sys.note }]
      }
    } else if (tab === 'lajen') {
      const lang = LAJEN_LANGS.find(l => l.id === lajenLang)
      if (lang) {
        results = [{ label: lang.label, romanized: lang.romanize(w), code: lang.code, note: lang.note }]
      }
    } else {
      results = rwSelected.map(id => {
        const lang = REAL_LANGS.find(l => l.id === id)
        if (!lang) return null
        return { label: lang.label, romanized: lang.romanize(w), code: lang.code, note: lang.note }
      }).filter(Boolean)
    }
    setResult({ word: w, results })
  }

  const TABS = [
    { id:'ixcitlatl', label:"Ix'Citlatl", color:'var(--cl)' },
    { id:'lajen', label:'Lajen Languages', color:'var(--cca)' },
    { id:'realworld', label:'Real-World Languages', color:'var(--cwr)' },
  ]

  return (
    <div className="tool-card" id="tool-pronun" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color:'var(--cwr)' }}>🔊 Pronunciation Helper</h3>
      <div style={{ fontSize:10, color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
        Generate and hear how any name or word sounds. Systems marked ⚠ have phonology not yet confirmed.
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:4, marginBottom:12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null) }}
            style={{ fontSize:10, padding:'4px 12px', borderRadius:12,
              background: tab === t.id ? t.color : 'none',
              color: tab === t.id ? '#000' : 'var(--dim)',
              border: `1px solid ${tab === t.id ? t.color : 'var(--brd)'}`,
              cursor:'pointer' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:10 }}>
        <div className="field" style={{ flex:1, minWidth:160, margin:0 }}>
          <label>Word or name</label>
          <input value={word} onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Ixelaoien, Akatriel, Martyn…" />
        </div>
        <button className="btn btn-primary btn-sm" style={{ background:'var(--cwr)', color:'#000', alignSelf:'flex-end' }}
          onClick={generate}>Generate</button>
      </div>

      {/* Ix'Citlatl system picker */}
      {tab === 'ixcitlatl' && (
        <div className="field" style={{ marginBottom:8 }}>
          <label>Language system</label>
          <select value={ixSystem} onChange={e => { setIxSystem(e.target.value); setResult(null) }}>
            {LANG_SYSTEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Lajen language picker */}
      {tab === 'lajen' && (
        <div className="field" style={{ marginBottom:8 }}>
          <label>Lajen language</label>
          <select value={lajenLang} onChange={e => { setLajenLang(e.target.value); setResult(null) }}>
            {LAJEN_LANGS.map(l => <option key={l.id} value={l.id}>{l.confirmed ? '' : '⚠ '}{l.label}</option>)}
          </select>
        </div>
      )}

      {/* Real-world multi-select */}
      {tab === 'realworld' && (
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
            Select languages (pick any number):
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {REAL_LANGS.map(l => (
              <button key={l.id} onClick={() => toggleRw(l.id)}
                style={{ fontSize:9, padding:'2px 8px', borderRadius:10,
                  background: rwSelected.includes(l.id) ? 'var(--cwr)' : 'none',
                  color: rwSelected.includes(l.id) ? '#000' : 'var(--dim)',
                  border: `1px solid ${rwSelected.includes(l.id) ? 'var(--cwr)' : 'var(--brd)'}`,
                  cursor:'pointer' }}>{l.label}</button>
            ))}
          </div>
        </div>
      )}

      {result && result.results.length > 0 && (
        <div style={{ marginTop:8 }}>
          {result.results.map((r, i) => (
            <div key={i} style={{ padding:'8px 12px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:'var(--r)', marginBottom:6 }}>
              <div style={{ fontSize:9, color:'var(--mut)', marginBottom:4 }}>{r.label} · {r.note}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:16, fontFamily:"'Cinzel',serif", color:'var(--cwr)', fontWeight:700 }}>{r.romanized}</span>
                {r.code && (
                  <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:16 }}
                    onClick={() => speakWithLang(r.romanized, r.code)} title={`Hear in ${r.label}`}>🔊</button>
                )}
                <button style={{ background:'none', border:'1px solid var(--brd)', color:'var(--dim)', cursor:'pointer', fontSize:9, padding:'2px 6px', borderRadius:3 }}
                  onClick={() => navigator.clipboard?.writeText(r.romanized)}>Copy</button>
              </div>
              {!r.code && <div style={{ fontSize:9, color:'var(--mut)', marginTop:4 }}>Audio not available for this language system.</div>}
            </div>
          ))}
        </div>
      )}

      {/* Ix'Citlatl sound guide */}
      <details style={{ marginTop:10 }}>
        <summary style={{ fontSize:10, color:'var(--dim)', cursor:'pointer', userSelect:'none' }}>📖 Ix'Citlatl Sound Guide</summary>
        <div style={{ marginTop:6, padding:8, background:'var(--card)', borderRadius:'var(--r)', fontSize:10, lineHeight:1.8 }}>
          {[["Ix","eesh (prefix)"],["x","sh (as in 'shell')"],["tl","tl as one sound"],["tz","ts"],["hu","w"],["'","glottal stop"]].map(([sym,val]) => (
            <div key={sym} style={{ display:'flex', gap:8 }}>
              <span style={{ color:'var(--cl)', minWidth:80, fontFamily:"'Cinzel',serif" }}>{sym}</span>
              <span style={{ color:'var(--dim)' }}>{val}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SCOTS DIALOGUE CONVERTER
// ════════════════════════════════════════════════════════════════
const SCOTS_RULES = {
  silvia: {
    label: 'Silvia MacLeod', color: 'var(--ct)',
    note: 'Educated Edinburgh Scots — strong but not broad. Measured use of Scots markers.',
    rules: [
      [/\bdo not\b/gi, "dinnae"], [/\bdoes not\b/gi, "doesnae"], [/\bdid not\b/gi, "didnae"],
      [/\bwill not\b/gi, "willnae"], [/\bcannot\b/gi, "cannae"], [/\bcan not\b/gi, "cannae"],
      [/\bhave not\b/gi, "havenae"], [/\bwould not\b/gi, "wouldnae"], [/\bshould not\b/gi, "shouldnae"],
      [/\bis not\b/gi, "isnae"], [/\bwas not\b/gi, "wasnae"], [/\bare not\b/gi, "arnae"],
      [/\bI am\b/gi, "I'm"], [/\byes\b/gi, "aye"], [/\bno\b/gi, "nae"],
      [/\bchild\b/gi, "bairn"], [/\bchildren\b/gi, "bairns"], [/\bhome\b/gi, "hame"],
      [/\bgirl\b/gi, "lass"], [/\bboy\b/gi, "lad"], [/\bwoman\b/gi, "woman"],
      [/\bold\b/gi, "auld"], [/\bgood\b/gi, "guid"], [/\bknow\b/gi, "ken"],
      [/\bwhat\b/gi, "whit"], [/\bthat\b/gi, "thae"], [/\bthose\b/gi, "thae"],
      [/\bwhere\b/gi, "whaur"], [/\bwho\b/gi, "wha"], [/\bwhy\b/gi, "why"],
      [/\bhow\b/gi, "hoo"], [/\bthink\b/gi, "think"], [/\bwee\b/gi, "wee"],
      [/\bvery\b/gi, "gey"], [/\bmuch\b/gi, "muckle"], [/\blittle\b/gi, "wee"],
      [/\btowards?\b/gi, "tae"], [/\bfrom\b/gi, "frae"], [/\bover\b/gi, "ower"],
      [/\bthere\b/gi, "there"], [/\bthough\b/gi, "though"], [/\benough\b/gi, "eneugh"],
      [/ing\b/g, "in'"],
    ]
  },
  elizabeth: {
    label: 'Elizabeth MacLeod', color: 'var(--cca)',
    note: 'Younger, broader Scots than Silvia — more rural inflection, more casual.',
    rules: [
      [/\bdo not\b/gi, "dinnae"], [/\bdoes not\b/gi, "doesnae"], [/\bdid not\b/gi, "didnae"],
      [/\bwill not\b/gi, "willnae"], [/\bcannot\b/gi, "cannae"], [/\bcan not\b/gi, "cannae"],
      [/\bhave not\b/gi, "havenae"], [/\bwould not\b/gi, "widnae"], [/\bshould not\b/gi, "shouldnae"],
      [/\bis not\b/gi, "isnae"], [/\bwas not\b/gi, "wisnae"], [/\bare not\b/gi, "arnae"],
      [/\bI am\b/gi, "Ah'm"], [/\byes\b/gi, "aye"], [/\bno\b/gi, "naw"],
      [/\bchild\b/gi, "bairn"], [/\bchildren\b/gi, "weans"], [/\bhome\b/gi, "hame"],
      [/\bgirl\b/gi, "lassie"], [/\bboy\b/gi, "laddie"], [/\bwoman\b/gi, "wumman"],
      [/\bold\b/gi, "auld"], [/\bgood\b/gi, "guid"], [/\bknow\b/gi, "ken"],
      [/\bwhat\b/gi, "whit"], [/\bthat\b/gi, "that"], [/\bthose\b/gi, "thae"],
      [/\bwhere\b/gi, "whaur"], [/\bwho\b/gi, "wha"], [/\bwhy\b/gi, "how"],
      [/\bhow\b/gi, "hoo"], [/\bwee\b/gi, "wee"], [/\bvery\b/gi, "awfy"],
      [/\bmuch\b/gi, "awfy muckle"], [/\blittle\b/gi, "wee"],
      [/\btowards?\b/gi, "tae"], [/\bfrom\b/gi, "frae"], [/\bover\b/gi, "ower"],
      [/\benough\b/gi, "eneugh"], [/\bgot\b/gi, "goat"], [/\bget\b/gi, "get"],
      [/\byou\b/gi, "ye"], [/\byour\b/gi, "yer"], [/\byourself\b/gi, "yersel"],
      [/\bmyself\b/gi, "masel"], [/\bit is\b/gi, "it's"], [/\bthere is\b/gi, "there's"],
      [/ing\b/g, "in'"], [/\bwhat are you\b/gi, "whit are ye"], [/\bare you\b/gi, "are ye"],
    ]
  }
}

function ScotsTool() {
  const [input, setInput] = useState('')
  const [active, setActive] = useState(new Set(['silvia','elizabeth']))
  const [results, setResults] = useState(null)

  function toggleChar(id) {
    setActive(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function convert() {
    if (!input.trim()) return
    const out = {}
    for (const [id, cfg] of Object.entries(SCOTS_RULES)) {
      if (!active.has(id)) continue
      let text = input
      for (const [pattern, replacement] of cfg.rules) {
        text = text.replace(pattern, replacement)
      }
      out[id] = text
    }
    setResults(out)
  }

  return (
    <div className="tool-card" id="tool-scots" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color:'var(--ct)' }}>🏴 Scots Dialogue Converter</h3>
      <div style={{ fontSize:10, color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
        Type or paste plain English dialogue and see how Silvia and/or Elizabeth would say it.
        Rules are based on their established voice — Silvia: educated Edinburgh Scots; Elizabeth: younger, broader, more rural.
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {Object.entries(SCOTS_RULES).map(([id, cfg]) => (
          <button key={id} onClick={() => toggleChar(id)}
            style={{ fontSize:10, padding:'4px 12px', borderRadius:12,
              background: active.has(id) ? cfg.color : 'none',
              color: active.has(id) ? '#000' : 'var(--dim)',
              border: `1px solid ${active.has(id) ? cfg.color : 'var(--brd)'}`,
              cursor:'pointer' }}>
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label>Plain English dialogue</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder="e.g. I do not know where you have been, but you will not go there again."
          style={{ width:'100%', fontSize:11, padding:'8px 10px', background:'var(--sf)',
            border:'1px solid var(--brd)', borderRadius:8, color:'var(--tx)',
            resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }} />
      </div>

      <button className="btn btn-primary btn-sm" style={{ background:'var(--ct)', color:'#000', marginBottom:12 }}
        onClick={convert}>Convert</button>

      {results && Object.entries(results).map(([id, text]) => {
        const cfg = SCOTS_RULES[id]
        return (
          <div key={id} style={{ marginBottom:12, padding:'10px 14px', background:'var(--card)',
            border:`1px solid ${cfg.color}44`, borderLeft:`3px solid ${cfg.color}`, borderRadius:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:cfg.color, marginBottom:6 }}>{cfg.label}</div>
            <div style={{ fontSize:10, color:'var(--mut)', fontStyle:'italic', marginBottom:6 }}>{cfg.note}</div>
            <div style={{ fontSize:12, color:'var(--tx)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{text}</div>
            <button style={{ marginTop:8, fontSize:9, background:'none', border:'1px solid var(--brd)',
              color:'var(--dim)', borderRadius:4, padding:'2px 8px', cursor:'pointer' }}
              onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
          </div>
        )
      })}

      <details style={{ marginTop:8 }}>
        <summary style={{ fontSize:10, color:'var(--dim)', cursor:'pointer', userSelect:'none' }}>📖 Scots Reference — Key Rules</summary>
        <div style={{ marginTop:6, padding:8, background:'var(--card)', borderRadius:'var(--r)', fontSize:10, lineHeight:1.8 }}>
          <div style={{ fontWeight:700, color:'var(--ct)', marginBottom:4 }}>Shared rules:</div>
          {[["dinnae","do not"],["cannae","cannot"],["aye","yes"],["nae/naw","no"],["ken","know"],["wee","small/little"],["guid","good"],["auld","old"],["bairn","child"],["lass/lad","girl/boy"],["hame","home"],["tae","to/towards"],["frae","from"],["ower","over"],["gey","very"],["hoo","how"],["wha","who"],["whaur","where"]].map(([scots, eng]) => (
            <div key={scots} style={{ display:'flex', gap:8 }}>
              <span style={{ color:'var(--ct)', minWidth:80, fontFamily:"'Cinzel',serif" }}>{scots}</span>
              <span style={{ color:'var(--dim)' }}>{eng}</span>
            </div>
          ))}
          <div style={{ fontWeight:700, color:'var(--cca)', marginTop:8, marginBottom:4 }}>Elizabeth only (broader):</div>
          {[["Ah'm","I am"],["wisnae","was not"],["widnae","would not"],["ye/yer","you/your"],["wumman","woman"],["weans","children"],["awfy","very"],["goat","got"]].map(([scots, eng]) => (
            <div key={scots} style={{ display:'flex', gap:8 }}>
              <span style={{ color:'var(--cca)', minWidth:80, fontFamily:"'Cinzel',serif" }}>{scots}</span>
              <span style={{ color:'var(--dim)' }}>{eng}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// BIRTHDAY BACKFILL
// ════════════════════════════════════════════════════════════════
function BackfillTool({ db }) {
  const [status, setStatus] = useState('')
  const chars = db.db.characters || []
  const events = db.db.timeline || []

  function runBackfill() {
    let added = 0
    chars.forEach(ch => {
      if (!ch.birthday_lajen) return
      const evName = `Birthday: ${ch.display_name || ch.name}`
      const exists = events.find(e => e.name === evName)
      if (exists) return
      db.upsertEntry('timeline', {
        id: Math.random().toString(36).slice(2,10),
        name: evName,
        date_lajen: ch.birthday_lajen,
        date_mnaerah: ch.birthday,
        era: 'Pre-Series',
        detail: `Birthday of ${ch.display_name || ch.name}`,
        sort_order: '0',
      })
      added++
    })
    setStatus(added > 0 ? `✓ Added ${added} birthday event${added !== 1 ? 's' : ''}.` : 'No new birthdays to add — all already in timeline.')
  }

  return (
    <div className="tool-card" id="tool-backfill" style={{ breakInside:"avoid", marginBottom:12 }}>
      <h3 style={{ color:'var(--cfl)' }}>🗓 Birthday Backfill</h3>
      <div style={{ fontSize:10, color:'var(--dim)', marginBottom:10, lineHeight:1.5 }}>
        Auto-creates a timeline entry for every character who has a Lajen birthday set, but doesn't yet have a matching "Birthday: [Name]" event in the timeline. Safe to run multiple times — won't create duplicates.
      </div>
      <button className="btn btn-primary btn-sm" style={{ background:'var(--cfl)', color:'#000' }} onClick={runBackfill}>Run Backfill</button>
      {status && <div style={{ marginTop:8, fontSize:11, color:'var(--sl)' }}>{status}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// IMAGE LIBRARY (deduped)
// ════════════════════════════════════════════════════════════════
function ImageLibrary({ db, setLightbox }) {
  const [imgSearch, setImgSearch] = useState('')
  const [imgFilterCat, setImgFilterCat] = useState('all')
  const [imgSort, setImgSort] = useState('name')

  const IMG_CATS = [
    { key:'items',      label:'Items',      fields:['image'] },
    { key:'characters', label:'Characters', fields:['reference_image','portrait_canvas'] },
    { key:'locations',  label:'Locations',  fields:['image'] },
    { key:'wardrobe',   label:'Wardrobe',   fields:['image'] },
  ]

  const allImages = useMemo(() => {
    const seen = new Set()
    const imgs = []
    IMG_CATS.forEach(({ key, label, fields }) => {
      ;(db.db[key] || []).forEach(entry => {
        fields.forEach(field => {
          const url = entry[field]
          if (!url || (!url.startsWith('http') && !url.startsWith('data:'))) return
          // Deduplicate by url+entryId combination
          const dedupKey = `${key}-${entry.id}-${url}`
          if (seen.has(dedupKey)) return
          seen.add(dedupKey)
          imgs.push({ url, cat: key, catLabel: label, name: entry.display_name || entry.name || entry.id, entryId: entry.id })
        })
      })
    })
    return imgs
  }, [db.db])

  const filtered = useMemo(() => allImages
    .filter(img => {
      const mc = imgFilterCat === 'all' || img.cat === imgFilterCat
      const ms = !imgSearch || img.name.toLowerCase().includes(imgSearch.toLowerCase())
      return mc && ms
    })
    .sort((a,b) => imgSort === 'cat' ? a.catLabel.localeCompare(b.catLabel)||a.name.localeCompare(b.name) : a.name.localeCompare(b.name))
  , [allImages, imgFilterCat, imgSearch, imgSort])

  return (
    <div className="tool-card" id="tool-images" style={{ marginTop:10 }}>
      <h3 style={{ color:'var(--cwr)' }}>🖼 Image Library</h3>
      <p style={{ fontSize:11, color:'var(--dim)', marginBottom:12, lineHeight:1.5 }}>
        All images uploaded across the Compendium. Click to expand. Upload once, use anywhere.
      </p>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <input className="sx" style={{ flex:1, minWidth:120, fontSize:11 }}
          placeholder="Search by name…" value={imgSearch} onChange={e => setImgSearch(e.target.value)} />
        <select value={imgFilterCat} onChange={e => setImgFilterCat(e.target.value)}
          style={{ fontSize:10, padding:'4px 8px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:6, color:'var(--dim)' }}>
          <option value="all">All categories</option>
          {IMG_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={imgSort} onChange={e => setImgSort(e.target.value)}
          style={{ fontSize:10, padding:'4px 8px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:6, color:'var(--dim)' }}>
          <option value="name">A → Z</option>
          <option value="cat">By category</option>
        </select>
      </div>
      <div style={{ fontSize:10, color:'var(--mut)', marginBottom:8 }}>{filtered.length} of {allImages.length} image{allImages.length!==1?'s':''}</div>
      {allImages.length === 0 && <div style={{ textAlign:'center', padding:'20px 0', color:'var(--mut)', fontSize:11 }}>No images uploaded yet.</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
        {filtered.map((img, i) => (
          <div key={`${img.entryId}-${img.url.slice(-8)}-${i}`}
            style={{ background:'var(--card)', border:'1px solid var(--brd)', borderRadius:8, overflow:'hidden', cursor:'pointer' }}
            onClick={() => setLightbox(img.url)}>
            <img src={img.url} alt={img.name}
              style={{ width:'100%', height:80, objectFit:'cover', display:'block' }}
              onError={e => e.target.style.display='none'} />
            <div style={{ padding:'5px 7px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--tx)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{img.name}</div>
              <div style={{ fontSize:9, color:'var(--cwr)' }}>{img.catLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN TOOLS COMPONENT
// ════════════════════════════════════════════════════════════════
export default function Tools({ db }) {
  const [lightbox, setLightbox] = useState(null)
  const chars = db.db.characters || []
  const events = db.db.timeline || []

  function scrollTo(id) {
    const el = document.getElementById('tool-' + id)
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
  }

  return (
    <div>
      <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:'var(--ctl)', marginBottom:10 }}>🔧 Tools</div>

      {/* Quick-nav */}
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

      {/* Pinterest masonry — cards flow down each column */}
      <div style={{ columns: 2, columnGap: 12, columnRule: '1px solid var(--brd)' }}>
        <DateTimeTool chars={chars} events={events} />
        <UnitTool />
        <IxCitlatlTool />
        <PronunciationTool />
        <ScotsTool />
        <BackfillTool db={db} />
      </div>

      <ImageLibrary db={db} setLightbox={setLightbox} />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
