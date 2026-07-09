import { useState, useMemo, useEffect } from 'react'
import { DEFAULT_LEXICON } from '../data/lajenLexicon'
import { langLabel } from '../data/langRegistry'
import { generate, BUILTIN_AFFIXES, ttsLocaleFor } from '../utils/nameForge'
import { listVoices, onVoices, speakText, speakableFromRespell } from '../utils/speech'
import { PALETTES, PAL_BY_ID } from '../tabs/Tools'

// ── Semantic Word Forge (PATCH7A · voice+freetext PATCH7B) ────────
// Starts from REAL words that MEAN what you typed, then blends/reshapes.
// Outputs are SUGGESTIONS ONLY — nothing is canon until Melissa says so.

const inputStyle = { fontSize: '0.85em', padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }
const chip = on => ({ fontSize: '0.74em', padding: '3px 9px', borderRadius: 12, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--cl)' : 'var(--brd)'), background: on ? 'rgba(170,102,255,.15)' : 'transparent', color: on ? 'var(--cl)' : 'var(--dim)' })
const tagColor = { attested: 'var(--cfl)', near: 'var(--cca)', approx: 'var(--cq)', guessed: 'var(--cwr)', none: 'var(--mut)' }
const LANG_LABEL = new Proxy({}, { get: (_, k) => langLabel(k) }) // registry-backed labels for all 72

export default function SemanticForge({ db }) {
  // ad-hoc free-text concepts (typed words with no lexicon match — sound-only)
  const [freeforms, setFreeforms] = useState({})
  // merged lexicon: bundled base + runtime 'lexicon_seeds' + free-text.
  // NOTE: seed words MERGE onto a concept's existing words (word-level),
  // so importing an added-columns batch (e.g. the 62 new langs) never
  // strips the original 10 from a concept it patches.
  const lexicon = useMemo(() => {
    const merged = { ...DEFAULT_LEXICON }
    for (const e of db.db.lexicon_seeds || []) {
      if (e?.concept && e?.words) {
        const base = merged[e.concept]
        merged[e.concept] = {
          meaning: e.meaning || base?.meaning || '',
          group: e.group || base?.group || 'imported',
          batch: e.batch || base?.batch || 'import',
          words: { ...(base?.words || {}), ...e.words },
        }
      }
    }
    return { ...merged, ...freeforms }
  }, [db.db.lexicon_seeds, freeforms])

  const [concepts, setConcepts] = useState(['star'])
  const [conceptQ, setConceptQ] = useState('')
  const [weights, setWeights] = useState({ nahuatl: 60, latin: 40 })
  const [softness, setSoftness] = useState(50)
  const [paletteId, setPaletteId] = useState('')
  const [blendMode, setBlendMode] = useState('portmanteau')
  const [useAffix, setUseAffix] = useState(false)
  const [affixes, setAffixes] = useState([])
  const [customAffix, setCustomAffix] = useState('')
  const [customPos, setCustomPos] = useState('prefix')
  const [savedAffixes, setSavedAffixes] = useState(() => { try { return JSON.parse(db.getSetting?.('semforge_affixes') || '[]') } catch { return [] } })
  const [count, setCount] = useState(10)
  const [showIPA, setShowIPA] = useState(() => db.getSetting?.('semforge_ipa') === '1')
  const [results, setResults] = useState([])
  const [history, setHistory] = useState(() => { try { return JSON.parse(db.getSetting?.('semforge_history') || '[]') } catch { return [] } })
  const [saveFor, setSaveFor] = useState(null) // candidate being saved
  const [saveForm, setSaveForm] = useState({ label: '', type: 'concept', language_form: '', tags: '', notes: '' })
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [notice, setNotice] = useState('')
  const [voiceURI, setVoiceURI] = useState(() => db.getSetting?.('semforge_voice') || '')
  const [voices, setVoices] = useState(() => listVoices())
  const [freeText, setFreeText] = useState('')

  // voices load async in most browsers — refresh when they arrive
  useEffect(() => onVoices(v => setVoices([...v])), [])

  // speak a candidate: its phonetic respelling, read by the chosen voice
  function say(c) {
    const tts = ttsLocaleFor(c.spineLang)
    speakText(speakableFromRespell(c.respelling, c.word), { voiceURI, bcp: tts.bcp })
  }

  // free-text: real roots when the word matches the lexicon, honest
  // sound-only fallback (clearly flagged) when it doesn't
  function addFreeText() {
    const raw = freeText.trim()
    if (!raw) return
    const norm = raw.toLowerCase()
    const match = conceptList.find(c => c === norm)
      || conceptList.find(c => c.includes(norm))
      || conceptList.find(c => (lexicon[c]?.meaning || '').toLowerCase().includes(norm))
    if (match) {
      setConcepts(p => p.includes(match) ? p : [...p, match])
      setNotice(`"${raw}" → using real roots from concept “${match}”.`)
    } else {
      const key = '✎ ' + raw
      const clean = raw.replace(/[^a-zA-Z'’\- ]/g, '').replace(/\s+/g, '')
      setFreeforms(f => ({ ...f, [key]: { meaning: raw + ' — free text (no real translation; sound-only)', group: 'freeform', batch: 'freeform', words: { freeform: { w: clean || raw, tag: 'none' } } } }))
      setConcepts(p => p.includes(key) ? p : [...p, key])
      setWeights(w => ({ ...w, freeform: Math.max(60, w.freeform || 0) }))
      setNotice(`"${raw}" isn’t in the lexicon — forging from its SOUND only (no real etymology behind it).`)
    }
    setFreeText('')
  }

  // pick up a recipe sent over from the Lexicon bucket (Journal tab)
  useEffect(() => {
    try {
      const pending = db.getSetting?.('semforge_pending_recipe')
      if (pending) { applyRecipe(JSON.parse(pending)); db.saveSetting?.('semforge_pending_recipe', ''); setNotice('Loaded settings from a saved word.') }
    } catch {}
  }, []) // eslint-disable-line

  const langsAvailable = useMemo(() => {
    const s = new Set()
    concepts.forEach(c => Object.keys(lexicon[c]?.words || {}).forEach(l => s.add(l)))
    return [...s].sort((a, b) => langLabel(a).localeCompare(langLabel(b)))
  }, [concepts, lexicon])

  const conceptList = useMemo(() => Object.keys(lexicon).sort(), [lexicon])
  const filteredConcepts = conceptList.filter(c => !conceptQ || c.includes(conceptQ.toLowerCase()))

  function toggleConcept(c) { setConcepts(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]) }
  function setW(l, v) { setWeights(p => ({ ...p, [l]: +v })) }

  function applyRecipe(r) {
    if (!r) return
    setConcepts(r.concepts || [])
    setWeights(Object.fromEntries(Object.entries(r.languageWeights || {}).map(([l, w]) => [l, Math.round(w * 100)])))
    setSoftness(Math.round((r.softness ?? 0.5) * 100))
    setPaletteId(r.palette || '')
    setAffixes(r.affixes || []); setUseAffix((r.affixes || []).length > 0)
    setBlendMode(r.blendMode || 'portmanteau')
  }

  function run() {
    const lw = {}; langsAvailable.forEach(l => { if (weights[l] > 0) lw[l] = weights[l] })
    const res = generate({
      lexicon, concepts, languageWeights: lw, softness: softness / 100,
      palette: paletteId ? PAL_BY_ID[paletteId] : null,
      affixes: useAffix ? affixes : [], blendMode, count,
    })
    setNotice(res.error || '')
    setResults(res.candidates || [])
    if (res.candidates?.length) {
      const h = [{ t: Date.now(), word: res.candidates[0].word, n: res.candidates.length, recipe: res.candidates[0].recipe }, ...history].slice(0, 60)
      setHistory(h); db.saveSetting?.('semforge_history', JSON.stringify(h))
    }
  }

  function startSave(c) { setSaveFor(c); setSaveForm({ label: c.word, type: 'concept', language_form: '', tags: '', notes: (c.derivation || []).map(d => `${d.word} (${LANG_LABEL[d.language] || d.language}: ${d.meaning})`).join(' + ') }) }
  function confirmSave() {
    const c = saveFor; if (!c) return
    db.upsertEntry?.('lexicon_saved', {
      id: 'lex_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      word: c.word, respelling: c.respelling, ipa: c.ipa, spineLang: c.spineLang,
      derivation: c.derivation, recipe: c.recipe,
      label: saveForm.label.trim() || c.word, type: saveForm.type,
      language_form: saveForm.language_form.trim(), notes: saveForm.notes,
      tags: saveForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(), source: 'Language Workshop (semantic)',
    })
    setSaveFor(null); setNotice(`Saved "${c.word}" → Lexicon bucket (Notes tab → 🗣 Lexicon).`)
  }

  function addCustomAffix() {
    const v = customAffix.trim(); if (!v) return
    const a = { value: v, position: customPos, gloss: 'custom' }
    setAffixes(p => [...p, a])
    const next = [...savedAffixes.filter(x => x.value !== v || x.position !== customPos), a]
    setSavedAffixes(next); db.saveSetting?.('semforge_affixes', JSON.stringify(next)); setCustomAffix('')
  }
  const allAffixChoices = [...BUILTIN_AFFIXES, ...savedAffixes.filter(s => !BUILTIN_AFFIXES.some(b => b.value === s.value && b.position === s.position))]

  function runImport(text, sourceLabel) {
    try {
      const d = JSON.parse(text)
      const cs = d.concepts || d
      let n = 0
      for (const [name, obj] of Object.entries(cs)) {
        if (!obj?.words) continue
        db.upsertEntry?.('lexicon_seeds', { id: 'seed_' + name, concept: name, meaning: obj.meaning || '', group: obj.group || 'imported', batch: String(d.meta?.batch || 'import'), words: obj.words }, { silent: true })
        n++
      }
      setNotice(`Imported ${n} concept${n === 1 ? '' : 's'}${sourceLabel ? ' from ' + sourceLabel : ''} into the seed lexicon — no deploy needed.`)
      setShowImport(false); setImportText('')
    } catch { setNotice('Import failed — not valid batch JSON.') }
  }
  function importBatch() { runImport(importText) }
  function importFromFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNotice(`Reading ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`)
    const r = new FileReader()
    r.onload = () => runImport(String(r.result || ''), file.name)
    r.onerror = () => setNotice('Could not read that file.')
    r.readAsText(file)
    e.target.value = '' // allow re-selecting the same file
  }

  return (
    <div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>
        Semantic forge — starts from real words that <i>mean</i> what you pick, then blends & reshapes. Every result shows its derivation. Suggestions only — never auto-canon. Pronunciations are approximate and editable on save.
      </div>

      {/* Concepts */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 4 }}>Concepts ({Object.keys(lexicon).length} available) — meaning seeds</div>
        <input value={conceptQ} onChange={e => setConceptQ(e.target.value)} placeholder="search concepts…" style={{ ...inputStyle, width: 180, marginBottom: 5 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 92, overflowY: 'auto', padding: 2 }}>
          {filteredConcepts.map(c => <span key={c} style={chip(concepts.includes(c))} onClick={() => toggleConcept(c)}>{c}</span>)}
        </div>
        {/* Free-text: type ANY word — real roots if it's in the lexicon, honest sound-only if not */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <input value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFreeText() }} placeholder="…or type any word (real roots if known, else sound-only)" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <button className="btn btn-sm btn-outline" onClick={addFreeText}>+ use word</button>
        </div>
      </div>

      {/* Language weights */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 4 }}>Language weights — highest = spine (dominant root)</div>
        {langsAvailable.map(l => (
          <div key={l} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: '0.74em', width: 96, color: 'var(--tx)' }}>{LANG_LABEL[l] || l}</span>
            <input type="range" min="0" max="100" value={weights[l] || 0} onChange={e => setW(l, e.target.value)} style={{ flex: 1, minWidth: 100 }} />
            <span style={{ fontSize: '0.72em', width: 30, color: 'var(--dim)' }}>{weights[l] || 0}</span>
          </div>
        ))}
      </div>

      {/* Mode / softness / palette / count */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <select value={blendMode} onChange={e => setBlendMode(e.target.value)} style={inputStyle}>
          <option value="portmanteau">blend: portmanteau</option>
          <option value="alternating">blend: alternating</option>
          <option value="root">blend: root + affix</option>
        </select>
        <span style={{ fontSize: '0.72em', color: 'var(--dim)' }}>Soft</span>
        <input type="range" min="0" max="100" value={softness} onChange={e => setSoftness(+e.target.value)} style={{ flex: 1, minWidth: 110 }} />
        <span style={{ fontSize: '0.72em', color: 'var(--dim)' }}>Hard · {softness}</span>
        <select value={paletteId} onChange={e => setPaletteId(e.target.value)} style={{ ...inputStyle, maxWidth: 190 }}>
          <option value="">palette: none (seeds' own sound)</option>
          {PALETTES.map(p => <option key={p.id} value={p.id}>{p.l}</option>)}
        </select>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)' }}>results <input type="number" min="1" max="50" value={count} onChange={e => setCount(Math.max(1, Math.min(50, +e.target.value || 1)))} style={{ ...inputStyle, width: 54 }} /></label>
      </div>

      {/* Affixes */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '0.74em', color: 'var(--tx)', cursor: 'pointer' }}>
          <input type="checkbox" checked={useAffix} onChange={e => setUseAffix(e.target.checked)} /> Use affixes
        </label>
        {useAffix && (
          <div style={{ marginTop: 5 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
              {allAffixChoices.map((a, i) => {
                const on = affixes.some(x => x.value === a.value && x.position === a.position)
                return <span key={i} style={chip(on)} title={a.gloss} onClick={() => setAffixes(p => on ? p.filter(x => !(x.value === a.value && x.position === a.position)) : [...p, { value: a.value, position: a.position }])}>{a.position === 'prefix' ? a.value + '·' : '·' + a.value}</span>
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={customAffix} onChange={e => setCustomAffix(e.target.value)} placeholder="custom affix…" style={{ ...inputStyle, width: 120 }} />
              <select value={customPos} onChange={e => setCustomPos(e.target.value)} style={inputStyle}><option value="prefix">prefix</option><option value="suffix">suffix</option></select>
              <button className="btn btn-sm btn-outline" onClick={addCustomAffix}>+ add</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button className="btn btn-sm" onClick={run}>⚒ Forge</button>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)', cursor: 'pointer' }}><input type="checkbox" checked={showIPA} onChange={e => { setShowIPA(e.target.checked); db.saveSetting?.('semforge_ipa', e.target.checked ? '1' : '0') }} /> IPA</label>
        {/* Voice picker — any installed voice reads the phonetic respelling */}
        <label style={{ fontSize: '0.72em', color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 4 }}>🗣
          <select value={voiceURI} onChange={e => { setVoiceURI(e.target.value); db.saveSetting?.('semforge_voice', e.target.value) }} style={{ ...inputStyle, maxWidth: 200 }} title="Voice used for 🔊 across the Word Forge & Lexicon bucket. Reads the phonetic respelling, so it approximates any language.">
            <option value="">voice: auto (per-language default)</option>
            {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        </label>
        <button className="btn btn-sm btn-outline" onClick={() => setShowImport(s => !s)}>📥 Import concept batch</button>
        {notice && <span style={{ fontSize: '0.72em', color: 'var(--cfl)' }}>{notice}</span>}
      </div>

      {showImport && (
        <div style={{ marginBottom: 10 }}>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder='Paste a batch JSON ({"meta":…,"concepts":{…}}) — e.g. Aster batches 5B+. Adds concepts with zero deploys.' style={{ ...inputStyle, width: '100%', minHeight: 80, boxSizing: 'border-box', fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={importBatch}>Import pasted</button>
            <span style={{ fontSize: '0.7em', color: 'var(--mut)' }}>or</span>
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
              📁 Load from file…
              <input type="file" accept=".json,application/json" onChange={importFromFile} style={{ display: 'none' }} />
            </label>
            <span style={{ fontSize: '0.68em', color: 'var(--dim)' }}>(use the file loader for large batches — pasting big files can freeze the browser)</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.map((c, i) => {
        const tts = ttsLocaleFor(c.spineLang)
        return (
          <div key={i} style={{ padding: '8px 12px', background: 'var(--card)', borderRadius: 8, marginBottom: 6, border: '1px solid var(--brd)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b style={{ fontSize: '1.08em', color: 'var(--cl)' }}>{c.word}</b>
              <button onClick={() => say(c)} title={voiceURI ? 'chosen voice reads the respelling' : (tts.proxy ? `voice: ${tts.bcp} (closest proxy)` : `voice: ${tts.bcp}`)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🔊</button>
              <span style={{ fontSize: '0.77em', color: 'var(--dim)' }}>{c.respelling}</span>
              {showIPA && <span style={{ fontSize: '0.74em', color: 'var(--mut)' }}>/{c.ipa}/</span>}
              <span style={{ flex: 1 }} />
              <button className="btn btn-sm btn-outline" onClick={() => startSave(c)}>💾 Save</button>
              <button className="btn btn-sm btn-outline" onClick={() => applyRecipe(c.recipe)} title="Set every control back to the recipe that made this word">↺ Load settings</button>
              <button className="btn btn-sm btn-outline" onClick={() => { try { navigator.clipboard.writeText(c.word) } catch {} }}>📋</button>
            </div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(c.derivation || []).map((d, j) => (
                <span key={j} title={`${d.tag} — ${d.meaning}`}>
                  <span style={{ color: 'var(--dim)' }}>{LANG_LABEL[d.language] || d.language}:</span> <i>{d.word}</i> “{d.meaning}” <span style={{ color: tagColor[d.tag] || 'var(--mut)' }}>[{d.tag}]</span>
                </span>
              ))}
              <span style={{ color: 'var(--mut)' }}>· seed #{c.recipe.seedIndex}</span>
            </div>
            {saveFor === c && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={saveForm.label} onChange={e => setSaveForm(f => ({ ...f, label: e.target.value }))} placeholder="label" style={{ ...inputStyle, width: 130 }} />
                <select value={saveForm.type} onChange={e => setSaveForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                  {['person', 'place', 'thing', 'concept', 'ability', 'other'].map(t => <option key={t}>{t}</option>)}
                </select>
                <input value={saveForm.language_form} onChange={e => setSaveForm(f => ({ ...f, language_form: e.target.value }))} placeholder="language/form (e.g. Murvetian)" style={{ ...inputStyle, width: 170 }} />
                <input value={saveForm.tags} onChange={e => setSaveForm(f => ({ ...f, tags: e.target.value }))} placeholder="tags, comma-separated" style={{ ...inputStyle, width: 160 }} />
                <button className="btn btn-sm" onClick={confirmSave}>Save ✓</button>
                <button className="btn btn-sm btn-outline" onClick={() => setSaveFor(null)}>✕</button>
              </div>
            )}
          </div>
        )
      })}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 4 }}>History (this device · last {history.length})</div>
          <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--brd)', borderRadius: 8, padding: '4px 8px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.74em', padding: '3px 0', borderBottom: i < history.length - 1 ? '1px solid var(--brd)' : 'none' }}>
                <span style={{ color: 'var(--tx)' }}>{h.word}</span>
                <span style={{ color: 'var(--mut)' }}>+{h.n - 1} · {new Date(h.t).toLocaleDateString()} {new Date(h.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-sm btn-outline" onClick={() => applyRecipe(h.recipe)}>↺ Load</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
