import { useState, useEffect } from 'react'
import { BKS, STS, SL, uid } from '../../constants'

export default function EntryForm({
  fields, entry = {}, onSave, onCancel,
  color = 'var(--cc)', label = 'Entry',
  db
}) {
  const [form, setForm] = useState(() => {
    const base = { status: '', books: [], notes: '', ...entry }
    return base
  })

  useEffect(() => {
    setForm({ status: '', books: [], notes: '', ...entry })
  }, [entry])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function toggleBook(b) {
    setForm(prev => {
      const books = prev.books || []
      return { ...prev, books: books.includes(b) ? books.filter(x => x !== b) : [...books, b] }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const result = { ...form, id: form.id || uid(), updated: new Date().toISOString() }
    if (!form.id) result.created = result.updated
    onSave(result)
  }

  function renderField(f) {
    const val = form[f.k] || ''
    switch (f.t) {
      case 'ta':
        return (
          <div className="field" key={f.k}>
            <label>{f.l}{f.r ? ' *' : ''}</label>
            <textarea
              value={val}
              placeholder={f.p || ''}
              onChange={e => set(f.k, e.target.value)}
            />
          </div>
        )
      case 'sel':
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <select value={val} onChange={e => set(f.k, e.target.value)}>
              {(f.o || []).map(o => <option key={o} value={o}>{o || '—'}</option>)}
            </select>
          </div>
        )
      case 'color':
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={val || '#888888'}
                onChange={e => set(f.k, e.target.value)}
                style={{ width: 40, height: 30, padding: 0, border: '1px solid var(--brd)', borderRadius: 4, background: 'var(--card)', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={val}
                placeholder="#hex or name"
                style={{ flex: 1 }}
                onChange={e => set(f.k, e.target.value)}
              />
            </div>
          </div>
        )
      case 'charsel':
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <select value={val} onChange={e => set(f.k, e.target.value)}>
              <option value="">—</option>
              {(db?.db?.characters || []).map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        )
      case 'locsel':
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <select value={val} onChange={e => set(f.k, e.target.value)}>
              <option value="">— None —</option>
              {(db?.db?.locations || []).map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )
      case 'charpick': {
        const cur = (val || '').split(',').map(s => s.trim()).filter(Boolean)
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <input
              type="text"
              value={val}
              placeholder="Click names below or type"
              onChange={e => set(f.k, e.target.value)}
            />
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
              {(db?.db?.characters || []).map(ch => {
                const sel = cur.some(c => c.toLowerCase() === ch.name.toLowerCase())
                return (
                  <span
                    key={ch.id}
                    onClick={() => {
                      const next = sel ? cur.filter(c => c.toLowerCase() !== ch.name.toLowerCase()) : [...cur, ch.name]
                      set(f.k, next.join(', '))
                    }}
                    style={{
                      padding: '2px 7px', borderRadius: 10, fontSize: 9, cursor: 'pointer',
                      border: `1px solid ${sel ? 'var(--cc)' : 'var(--brd)'}`,
                      color: sel ? 'var(--cc)' : 'var(--dim)',
                      background: sel ? 'rgba(201,102,255,.1)' : 'transparent'
                    }}
                  >
                    {ch.display_name || ch.name}
                  </span>
                )
              })}
            </div>
          </div>
        )
      }
      case 'itempick': {
        const cur = (val || '').split(',').map(s => s.trim()).filter(Boolean)
        return (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            <input
              type="text"
              value={val}
              placeholder="Click items below or type"
              onChange={e => set(f.k, e.target.value)}
            />
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
              {(db?.db?.items || []).map(it => {
                const sel = cur.some(c => c.toLowerCase() === it.name.toLowerCase())
                return (
                  <span
                    key={it.id}
                    onClick={() => {
                      const next = sel ? cur.filter(c => c.toLowerCase() !== it.name.toLowerCase()) : [...cur, it.name]
                      set(f.k, next.join(', '))
                    }}
                    style={{
                      padding: '2px 7px', borderRadius: 10, fontSize: 9, cursor: 'pointer',
                      border: `1px solid ${sel ? 'var(--ci)' : 'var(--brd)'}`,
                      color: sel ? 'var(--ci)' : 'var(--dim)',
                      background: sel ? 'rgba(255,112,64,.1)' : 'transparent'
                    }}
                  >
                    {it.name}
                  </span>
                )
              })}
            </div>
          </div>
        )
      }
      default:
        return (
          <div className="field" key={f.k}>
            <label>{f.l}{f.r ? ' *' : ''}</label>
            <input
              type="text"
              value={val}
              placeholder={f.p || ''}
              required={f.r}
              onChange={e => set(f.k, e.target.value)}
            />
          </div>
        )
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map(renderField)}

      {/* Status + Books */}
      <div className="field-row">
        <div className="field">
          <label>Status</label>
          <select value={form.status || ''} onChange={e => set('status', e.target.value)}>
            <option value="">—</option>
            {STS.map(s => <option key={s} value={s}>{SL[s]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Books</label>
          <div className="check-group">
            {BKS.map(b => (
              <label key={b}>
                <input
                  type="checkbox"
                  checked={(form.books || []).includes(b)}
                  onChange={() => toggleBook(b)}
                />
                {b}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ background: color }}
        >
          {form.id && entry.id ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  )
}
