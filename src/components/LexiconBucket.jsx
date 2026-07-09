import { useState, useMemo } from 'react'
import { ttsLocaleFor } from '../utils/nameForge'
import { speakText, speakableFromRespell } from '../utils/speech'

// ── Lexicon bucket (PATCH7A · voice PATCH7B) ──────────────────────
// Journal sub-tab. Filter/sort/edit everything; select a word to hear it
// (with the voice chosen in the Word Forge, reading the respelling).

const inputStyle = { fontSize: '0.85em', padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }
const TYPES = ['all', 'person', 'place', 'thing', 'concept', 'ability', 'other']

export default function LexiconBucket({ db }) {
  const words = db.db.lexicon_saved || []
  const [q, setQ] = useState('')
  const [fType, setFType] = useState('all')
  const [fForm, setFForm] = useState('all')
  const [fTag, setFTag] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [openId, setOpenId] = useState(null)
  const [autoSpeak, setAutoSpeak] = useState(() => db.getSetting?.('lexbucket_autospeak') !== '0')
  const voiceURI = db.getSetting?.('semforge_voice') || ''
  const say = w => speakText(speakableFromRespell(w.respelling, w.word), { voiceURI, bcp: ttsLocaleFor(w.spineLang).bcp })

  const forms = useMemo(() => ['all', ...new Set(words.map(w => w.language_form).filter(Boolean))], [words])
  const tags = useMemo(() => ['all', ...new Set(words.flatMap(w => w.tags || []))], [words])

  const shown = useMemo(() => {
    let list = words.filter(w =>
      (fType === 'all' || w.type === fType) &&
      (fForm === 'all' || w.language_form === fForm) &&
      (fTag === 'all' || (w.tags || []).includes(fTag)) &&
      (!q || [w.word, w.label, w.notes, w.language_form, ...(w.tags || [])].join(' ').toLowerCase().includes(q.toLowerCase()))
    )
    const key = { date: w => w.created_at || '', word: w => (w.word || '').toLowerCase(), label: w => (w.label || '').toLowerCase(), type: w => w.type || '', form: w => w.language_form || '' }[sortBy]
    list.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
    if (sortDir === 'desc') list.reverse()
    return list
  }, [words, q, fType, fForm, fTag, sortBy, sortDir])

  function open(w) {
    const next = openId === w.id ? null : w.id
    setOpenId(next)
    if (next && autoSpeak) say(w)
  }
  function patch(w, field, value) {
    db.upsertEntry?.('lexicon_saved', { ...w, [field]: value }, { silent: true })
  }
  function remove(w) {
    if (!window.confirm(`Delete "${w.word}" from the lexicon bucket? (Archive rule: only do this for true junk.)`)) return
    db.deleteEntry?.('lexicon_saved', w.id)
    if (openId === w.id) setOpenId(null)
  }
  function loadSettings(w) {
    db.saveSetting?.('semforge_pending_recipe', JSON.stringify(w.recipe || {}))
    try { navigator.clipboard.writeText(JSON.stringify(w.recipe || {})) } catch {}
    alert('Recipe queued — open Tools → ✨ Word Forge (Semantic) and the controls will snap to this word\u2019s settings.')
  }

  return (
    <div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>
        Words saved from the Language Workshop, with their meanings and recipes. Select a word to hear it. Everything here is provisional — promote to Wiki/Glossary/Characters yourself when a word graduates.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search…" style={{ ...inputStyle, width: 150 }} />
        <select value={fType} onChange={e => setFType(e.target.value)} style={inputStyle}>{TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'type: all' : t}</option>)}</select>
        <select value={fForm} onChange={e => setFForm(e.target.value)} style={inputStyle}>{forms.map(f => <option key={f} value={f}>{f === 'all' ? 'language: all' : f}</option>)}</select>
        <select value={fTag} onChange={e => setFTag(e.target.value)} style={inputStyle}>{tags.map(t => <option key={t} value={t}>{t === 'all' ? 'tag: all' : t}</option>)}</select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
          <option value="date">sort: date</option><option value="word">sort: word</option><option value="label">sort: label</option><option value="type">sort: type</option><option value="form">sort: language</option>
        </select>
        <button className="btn btn-sm btn-outline" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? '↑' : '↓'}</button>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoSpeak} onChange={e => { setAutoSpeak(e.target.checked); db.saveSetting?.('lexbucket_autospeak', e.target.checked ? '1' : '0') }} /> speak on select
        </label>
        <span style={{ fontSize: '0.72em', color: 'var(--mut)' }}>{shown.length} / {words.length}</span>
      </div>

      {shown.length === 0 && <div style={{ fontSize: '0.8em', color: 'var(--mut)', padding: 12 }}>Nothing saved yet — forge words in Tools → ✨ Word Forge (Semantic) and hit 💾 Save.</div>}

      {shown.map(w => {
        const tts = ttsLocaleFor(w.spineLang)
        const openNow = openId === w.id
        return (
          <div key={w.id} style={{ background: 'var(--card)', border: '1px solid ' + (openNow ? 'var(--cl)' : 'var(--brd)'), borderRadius: 8, marginBottom: 6, padding: '7px 11px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => open(w)}>
              <b style={{ color: 'var(--cl)' }}>{w.word}</b>
              <span style={{ fontSize: '0.74em', color: 'var(--dim)' }}>{w.label !== w.word ? w.label : ''}</span>
              <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{w.type}{w.language_form ? ' · ' + w.language_form : ''}</span>
              {(w.tags || []).map(t => <span key={t} style={{ fontSize: '0.66em', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--brd)', color: 'var(--dim)' }}>{t}</span>)}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: '0.66em', color: 'var(--mut)' }}>{(w.created_at || '').slice(0, 10)}</span>
            </div>
            {openNow && (
              <div style={{ marginTop: 7, fontSize: '0.8em' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                  <button onClick={() => say(w)} title={tts.proxy ? `voice: ${tts.bcp} (closest proxy)` : `voice: ${tts.bcp}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em' }}>🔊</button>
                  <span style={{ color: 'var(--dim)' }}>{w.respelling}</span>
                  {w.ipa && <span style={{ color: 'var(--mut)' }}>/{w.ipa}/</span>}
                  {tts.proxy && <span style={{ fontSize: '0.82em', color: 'var(--mut)' }}>(proxy voice — install more system voices and 🔊 upgrades automatically)</span>}
                </div>
                {(w.derivation || []).length > 0 && (
                  <div style={{ color: 'var(--mut)', marginBottom: 5 }}>
                    from {(w.derivation).map((d, i) => <span key={i}><i>{d.word}</i> ({d.language}: “{d.meaning}”, {d.tag}){i < w.derivation.length - 1 ? ' + ' : ''}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5 }}>
                  <input defaultValue={w.label} onBlur={e => patch(w, 'label', e.target.value)} placeholder="label" style={{ ...inputStyle, width: 130 }} />
                  <select defaultValue={w.type} onChange={e => patch(w, 'type', e.target.value)} style={inputStyle}>{TYPES.slice(1).map(t => <option key={t}>{t}</option>)}</select>
                  <input defaultValue={w.language_form} onBlur={e => patch(w, 'language_form', e.target.value)} placeholder="language/form" style={{ ...inputStyle, width: 140 }} />
                  <input defaultValue={(w.tags || []).join(', ')} onBlur={e => patch(w, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="tags" style={{ ...inputStyle, width: 150 }} />
                  <input defaultValue={w.respelling} onBlur={e => patch(w, 'respelling', e.target.value)} placeholder="pronunciation (editable)" style={{ ...inputStyle, width: 170 }} />
                </div>
                <textarea defaultValue={w.notes} onBlur={e => patch(w, 'notes', e.target.value)} placeholder="notes / intended meaning" style={{ ...inputStyle, width: '100%', minHeight: 44, boxSizing: 'border-box', marginBottom: 5 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => loadSettings(w)}>↺ Load settings in Forge</button>
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-sm btn-outline" style={{ color: '#ff3355' }} onClick={() => remove(w)}>✕ Delete</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
