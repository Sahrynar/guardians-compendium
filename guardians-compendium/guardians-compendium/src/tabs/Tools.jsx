import { useState, useCallback } from 'react'
import { RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

function Row({ label, value }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <span className="calc-val">{value}</span>
    </div>
  )
}

export default function Tools({ db }) {
  // Lajen → Mnaerah
  const [lYear, setLYear] = useState(320)
  const [lMonth, setLMonth] = useState(1)
  const [lDay, setLDay] = useState(1)

  // Mnaerah → Lajen
  const [mYear, setMYear] = useState('')

  // Elapsed
  const [eC1, setEC1] = useState('lajen')
  const [eY1, setEY1] = useState(1)
  const [eC2, setEC2] = useState('mnaerah')
  const [eY2, setEY2] = useState(1550)
  const [eEv1, setEEv1] = useState('')
  const [eEv2, setEEv2] = useState('')
  const [elapResult, setElapResult] = useState(null)

  // Age at event
  const [aCH, setACH] = useState('')
  const [aEV, setAEV] = useState('')
  const [aBY, setABY] = useState('')
  const [aEY, setAEY] = useState('')

  // Unit converter
  const [tuAmt, setTuAmt] = useState(1)
  const [tuFrom, setTuFrom] = useState('days')

  const events = db.db.timeline || []
  const chars = db.db.characters || []

  // ── Lajen → Mnaerah ─────────────────────────────────────────
  const l2m = useCallback(() => {
    const totalLDays = (lYear - 1) * LDAYS + (lMonth - 1) * LDPM + (lDay - 1)
    const mYearsFromHC1 = totalLDays / (RATIO * LDAYS)
    const mYear = Math.round(1516.5 + mYearsFromHC1)
    return { totalLDays, mYearsFromHC1, mYear, month: MONTHS[lMonth - 1] }
  }, [lYear, lMonth, lDay])

  // ── Mnaerah → Lajen ─────────────────────────────────────────
  const m2l = useCallback(() => {
    const my = parseFloat(mYear)
    if (isNaN(my)) return null
    const mYearsFromHC = my - 1516.5
    const lYears = mYearsFromHC * RATIO
    const lYear = Math.round(lYears)
    const totalLDays = Math.round(lYears * LDAYS)
    const lMonthIdx = Math.floor((Math.abs(totalLDays) % LDAYS) / LDPM)
    const monthName = MONTHS[Math.abs(lMonthIdx) % 12] || MONTHS[0]
    return { mYearsFromHC, lYear, totalLDays, monthName, my }
  }, [mYear])

  // ── Elapsed ──────────────────────────────────────────────────
  function calcElapsed() {
    let y1 = parseFloat(eY1), y2 = parseFloat(eY2)
    // Override with event dropdowns if selected
    if (eEv1) {
      const ev = events.find(e => e.id === eEv1)
      if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y1 = parseFloat(m[0]) }
    }
    if (eEv2) {
      const ev = events.find(e => e.id === eEv2)
      if (ev) { const m = (ev.date_mnaerah||ev.date_hc||'').match(/-?\d+(\.\d+)?/); if (m) y2 = parseFloat(m[0]) }
    }
    let mY1 = eC1==='mnaerah' ? y1 : (y1/RATIO)+1516.5
    let mY2 = eC2==='mnaerah' ? y2 : (y2/RATIO)+1516.5
    const mElapsed = Math.abs(mY2-mY1)
    const lElapsed = mElapsed*RATIO
    setElapResult({ mElapsed, lElapsed })
  }

  // ── Age at event ─────────────────────────────────────────────
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
  const ageResult = calcAge()

  // ── Unit converter ───────────────────────────────────────────
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
    ['Minutes', mins], ['Hours', mins/60], ['Days', mins/1440], ['Weeks', mins/10080],
    ['Months (30-day)', mins/43200], ['Years (Lajen / 360-day)', mins/518400],
    ['Years (Mnaerah / 365.25-day)', mins/525960], ['Decades', mins/5259600], ['Centuries', mins/52596000]
  ]

  const l2mResult = l2m()

  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ctl)', marginBottom: 10 }}>🔧 Tools</div>

      {/* Lajen → Mnaerah */}
      <div className="tool-card">
        <h3 style={{ color: 'var(--cca)' }}>Lajen → Mnaerah Converter</h3>
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

      {/* Mnaerah → Lajen */}
      <div className="tool-card">
        <h3 style={{ color: 'var(--ct)' }}>Mnaerah → Lajen Converter</h3>
        <div className="field"><label>Mnaerah Year (AD, negative for BC)</label>
          <input type="number" value={mYear} placeholder="e.g. 1554 or -2500" onChange={e => setMYear(e.target.value)} />
        </div>
        {m2l() && (
          <div className="calc-result">
            <Row label="Mnaerah Year" value={m2l().my <= 0 ? Math.abs(m2l().my)+' BC' : m2l().my+' AD'} />
            <Row label="Lajen Year (HC)" value={m2l().lYear > 0 ? `Year ${m2l().lYear} HC` : `Year ${Math.abs(m2l().lYear)} before HC 1`} />
            <Row label="Approximate Lajen Month" value={`${m2l().monthName.n} (${m2l().monthName.ssn})`} />
          </div>
        )}
      </div>

      {/* Time Elapsed */}
      <div className="tool-card">
        <h3 style={{ color: 'var(--ct)' }}>Time Elapsed Between Two Dates</h3>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>Pick events from the dropdown or enter years manually.</div>

        {/* Start */}
        <div style={{ fontSize: 10, color: 'var(--cca)', marginBottom: 4, fontWeight: 600 }}>START</div>
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

        {/* End */}
        <div style={{ fontSize: 10, color: 'var(--cca)', marginBottom: 4, fontWeight: 600, marginTop: 8 }}>END</div>
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

        <button className="btn btn-primary btn-sm" style={{ background: 'var(--ct)' }} onClick={calcElapsed}>Calculate</button>
        {elapResult && (
          <div className="calc-result" style={{ marginTop: 8 }}>
            <Row label="Mnaerah time elapsed" value={`~${elapResult.mElapsed.toFixed(2)} years (~${Math.round(elapResult.mElapsed*MDAYS).toLocaleString()} days)`} />
            <Row label="Lajen time elapsed" value={`~${elapResult.lElapsed.toFixed(2)} years (~${Math.round(elapResult.lElapsed*LDAYS).toLocaleString()} days)`} />
            <Row label="Ratio" value={`1 Mnaerah year = ${RATIO} Lajen years`} />
          </div>
        )}
      </div>

      {/* Character Age at Event */}
      <div className="tool-card">
        <h3 style={{ color: 'var(--cc)' }}>Character Age at Event</h3>
        <div className="field"><label>Character</label>
          <select value={aCH} onChange={e => setACH(e.target.value)}>
            <option value="">— Pick character —</option>
            {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div style={{ fontSize: 10, color: 'var(--mut)', marginTop: 6 }}>Pick character + event, or enter years manually.</div>
        )}
      </div>

      {/* Generic time unit converter */}
      <div className="tool-card">
        <h3 style={{ color: 'var(--cl)' }}>Generic Time Unit Converter</h3>
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
    </div>
  )
}
