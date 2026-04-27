import Modal from './Modal'

const FIELD_DISPLAY = {
  characters: ['display_name', 'name', 'role', 'notes', 'description'],
  locations: ['name', 'loc_type', 'region', 'notes', 'description'],
  items: ['name', 'category', 'significance', 'description'],
  scenes: ['summary', 'detail', 'book', 'chapter'],
  timeline: ['name', 'date', 'detail', 'date_hc', 'date_mnaerah', 'era'],
  wiki: ['title', 'category', 'summary'],
  world: ['name', 'category', 'detail'],
  glossary: ['term', 'title', 'definition', 'summary'],
  spellings: ['word', 'name', 'notes', 'detail'],
  canon: ['name', 'text'],
  flags: ['name', 'detail', 'priority', 'status'],
  questions: ['text', 'notes', 'priority', 'status'],
  notes: ['title', 'category', 'content'],
  inventory: ['name', 'category', 'character', 'significance', 'notes'],
}

function getTitleMeta(entry) {
  if (entry.display_name) return { title: entry.display_name, key: 'display_name' }
  if (entry.name) return { title: entry.name, key: 'name' }
  if (entry.title) return { title: entry.title, key: 'title' }
  if (entry.term) return { title: entry.term, key: 'term' }
  if (entry.word) return { title: entry.word, key: 'word' }
  if (entry.text) return { title: entry.text.slice(0, 60), key: null }
  return { title: '(untitled)', key: null }
}

export default function EntryPreviewModal({ open, onClose, entry, category, onEdit, onGoToEntry, color = '#fff' }) {
  if (!entry) return null

  const { title, key: titleKey } = getTitleMeta(entry)
  const fields = FIELD_DISPLAY[category] || Object.keys(entry).filter(k => !['id', 'created', 'updated', 'updated_at', 'auto_imported', 'source', 'source_sticky_id'].includes(k))

  return (
    <Modal open={open} onClose={onClose} title={title} color={color} maxWidth={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(f => {
          const val = entry[f]
          if (val === undefined || val === null || val === '') return null
          if (titleKey && f === titleKey) return null
          return (
            <div key={f}>
              <div style={{ fontSize: '0.77em', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                {f.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.95em', color: 'var(--tx)', whiteSpace: 'pre-wrap' }}>
                {String(val)}
              </div>
            </div>
          )
        })}
        {entry.auto_imported && (
          <div style={{ fontSize: '0.77em', color: '#ffcc00', padding: '6px 10px', borderRadius: 6, background: '#ffcc0011', border: '1px solid #ffcc0044' }}>
            ðŸ“¥ Auto-imported {entry.source ? `from ${entry.source}` : ''} - needs review
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--div)' }}>
          <button onClick={onClose} style={{ fontSize: '0.85em', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            Close
          </button>
          {onGoToEntry && (
            <button onClick={onGoToEntry} style={{ fontSize: '0.85em', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--tx)', cursor: 'pointer' }}>
              ↗ Go to entry
            </button>
          )}
          <button onClick={onEdit} style={{ fontSize: '0.85em', padding: '6px 14px', borderRadius: 6, border: `1px solid ${color}`, background: color, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
            âœŽ Edit
          </button>
        </div>
      </div>
    </Modal>
  )
}

