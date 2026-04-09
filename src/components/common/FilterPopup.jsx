import { useState, useRef, useEffect } from 'react'

/**
 * FilterPopup — compact multi-select filter button
 * 
 * Props:
 *   color: string — tab accent colour
 *   filters: Array<{ key, label, options: Array<{value, label}> }>
 *   values: { [key]: string[] } — currently selected values per filter key
 *   onChange: (key, values) => void
 */
export default function FilterPopup({ color, filters, values, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Count active filters
  const activeCount = Object.values(values).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  function toggle(key, value) {
    const current = values[key] || []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    onChange(key, next)
  }

  function selectAll(key, options) { onChange(key, options.map(o => o.value)) }
  function clearAll(key) { onChange(key, []) }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: '0.77em', padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${activeCount > 0 ? color : 'var(--brd)'}`,
          background: activeCount > 0 ? color + '22' : 'none',
          color: activeCount > 0 ? color : 'var(--dim)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ⊟ Filter{activeCount > 0 ? ` (${activeCount})` : ''} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          marginTop: 4, background: 'var(--sf)', border: '1px solid var(--brd)',
          borderRadius: 8, padding: 12, minWidth: 220,
          boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        }}>
          {filters.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: '0.69em', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {f.label}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => selectAll(f.key, f.options)}
                    style={{ fontSize: '0.62em', color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>All</button>
                  <button onClick={() => clearAll(f.key)}
                    style={{ fontSize: '0.62em', color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>None</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {f.options.map(opt => {
                  const selected = (values[f.key] || []).includes(opt.value)
                  return (
                    <button key={opt.value} onClick={() => toggle(f.key, opt.value)}
                      style={{
                        fontSize: '0.77em', padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${selected ? color : 'var(--brd)'}`,
                        background: selected ? color + '33' : 'none',
                        color: selected ? color : 'var(--dim)',
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--brd)', paddingTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { filters.forEach(f => clearAll(f.key)); setOpen(false) }}
              style={{ fontSize: '0.69em', color: 'var(--mut)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
