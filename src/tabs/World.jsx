import { useState } from 'react'
import GenericListTab from '../components/common/GenericListTab'

const WORLD_FIELDS = [
  { k: 'name',     l: 'Topic',    t: 'text', r: true },
  { k: 'subtopic', l: 'Subtopic', t: 'text' },
  { k: 'detail',   l: 'Detail',   t: 'ta' },
]

export default function World({ db, crossLink, clearCrossLink }) {
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('wr_cols') || '2'))
  const [dividers, setDividers] = useState(() => db.getSetting?.('wr_cols_div') !== 'off')
  function saveColCount(n) { setColCount(n); db.saveSetting?.('wr_cols', String(n)) }
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('wr_cols_div', next ? 'on' : 'off') }

  return (
    <div>
      <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0 8px', flexWrap:'wrap' }}>
        <span style={{ fontSize: '0.69em', color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.05em' }}>Columns:</span>
        {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
          <button key={l} onClick={() => saveColCount(n)}
            style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8,
              background: colCount===n ? 'var(--cw)' : 'none',
              color: colCount===n ? '#000' : 'var(--dim)',
              border: `1px solid ${colCount===n ? 'var(--cw)' : 'var(--brd)'}`,
              cursor:'pointer' }}>{l}</button>
        ))}
        <button onClick={toggleDividers}
          style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8, marginLeft:8,
            background: dividers ? 'rgba(255,255,255,.08)' : 'none',
            color: dividers ? 'var(--tx)' : 'var(--mut)',
            border:'1px solid var(--brd)', cursor:'pointer' }}>
          {dividers ? '┃ Dividers on' : '┃ Dividers off'}
        </button>
      </div>
      <GenericListTab
        catKey="world" color="var(--cw)" icon="🌐"
        label="World Entries" fields={WORLD_FIELDS} db={db}
        columns={colCount} columnRule={dividers ? '1px solid var(--brd)' : 'none'}
        crossLink={crossLink} clearCrossLink={clearCrossLink}
      />
    </div>
  )
}
