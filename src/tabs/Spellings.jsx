import { useState } from 'react'
import GenericListTab from '../components/common/GenericListTab'

const SP_FIELDS = [
  { k: 'name',       l: 'Term',       t: 'text', r: true },
  { k: 'working',    l: 'Working',    t: 'text' },
  { k: 'alternates', l: 'Alternates', t: 'text' },
  { k: 'detail',     l: 'Notes',      t: 'ta' },
]

export default function Spellings({ db, crossLink, clearCrossLink }) {
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('sp_cols') || '2'))
  const [dividers, setDividers] = useState(() => db.getSetting?.('sp_cols_div') !== 'off')
  function saveColCount(n) { setColCount(n); db.saveSetting?.('sp_cols', String(n)) }
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('sp_cols_div', next ? 'on' : 'off') }

  return (
    <div>
      <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0 8px', flexWrap:'wrap' }}>
        <span style={{ fontSize: '0.69em', color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.05em' }}>Columns:</span>
        {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
          <button key={l} onClick={() => saveColCount(n)}
            style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8,
              background: colCount===n ? 'var(--csp)' : 'none',
              color: colCount===n ? '#000' : 'var(--dim)',
              border: `1px solid ${colCount===n ? 'var(--csp)' : 'var(--brd)'}`,
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
        catKey="spellings" color="var(--csp)" icon="✍"
        label="Spellings" fields={SP_FIELDS} db={db}
        columns={colCount} columnRule={dividers ? '1px solid var(--brd)' : 'none'}
        crossLink={crossLink} clearCrossLink={clearCrossLink}
      />
    </div>
  )
}
