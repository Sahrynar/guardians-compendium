import { useEffect, useState } from 'react'
import Modal from '../../components/common/Modal'
import { DEFAULT_TAGS, STICKY_COLORS } from './stickyShared'

export default function StickyEditModal({ open, sticky, tags, onSave, onClose, showJournalUnpin = false, onUnarchive }) {
  const [form, setForm] = useState(sticky || null)

  useEffect(() => {
    setForm(sticky || null)
  }, [sticky])

  if (!open || !form) return null

  const tagList = tags?.length ? tags : DEFAULT_TAGS

  function patch(next) {
    setForm(prev => ({ ...prev, ...next }))
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Sticky" color="#ffcc00">
      <div className="field">
        <label>Text</label>
        <textarea
          value={form.text || ''}
          onChange={e => patch({ text: e.target.value })}
          style={{ minHeight: 150 }}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Tag</label>
          <select value={form.tag || 'unsorted'} onChange={e => patch({ tag: e.target.value })}>
            {tagList.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Preset Color</label>
          <select value={form.color || 'yellow'} onChange={e => patch({ color: e.target.value })}>
            {STICKY_COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Custom Background</label>
          <input type="color" value={form.customBg || '#fffde7'} onChange={e => patch({ customBg: e.target.value })} />
        </div>
        <div className="field">
          <label>Custom Text</label>
          <input type="color" value={form.customText || '#5d4037'} onChange={e => patch({ customText: e.target.value })} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Font Size</label>
          <select value={form.fontSize || '0.92em'} onChange={e => patch({ fontSize: e.target.value })}>
            <option value="0.69em">XS</option>
            <option value="0.77em">S</option>
            <option value="0.92em">M</option>
            <option value="1.08em">L</option>
            <option value="1.23em">XL</option>
          </select>
        </div>
        <div className="field">
          <label>Card Size</label>
          <select value={form.size || 'normal'} onChange={e => patch({ size: e.target.value })}>
            <option value="small">Small</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="xl">XL</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85em', color: 'var(--tx)' }}>
          <input type="checkbox" checked={!!form.pinned_stickies} onChange={e => patch({ pinned_stickies: e.target.checked })} />
          Pin to Stickies
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85em', color: 'var(--tx)' }}>
          <input type="checkbox" checked={!!form.pinned_journal} onChange={e => patch({ pinned_journal: e.target.checked })} />
          Also pin to Journal sidebar
        </label>
        {showJournalUnpin && (
          <button
            className="btn btn-sm btn-outline"
            style={{ justifySelf: 'flex-start' }}
            onClick={() => patch({ pinned_journal: false })}
          >
            Unpin from Journal
          </button>
        )}
        {form.archived && onUnarchive && (
          <button
            className="btn btn-sm btn-outline"
            style={{ justifySelf: 'flex-start' }}
            onClick={() => onUnarchive(form)}
          >
            Un-archive
          </button>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ background: '#ffcc00', color: '#000' }} onClick={() => onSave(form)}>
          Save Sticky
        </button>
      </div>
    </Modal>
  )
}
