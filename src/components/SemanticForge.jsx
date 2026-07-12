import { useState, useMemo, useEffect } from 'react'
import { DEFAULT_LEXICON } from '../data/lajenLexicon'
import { langLabel } from '../data/langRegistry'
import { generate, BUILTIN_AFFIXES, ttsLocaleFor } from '../utils/nameForge'
import { listVoices, onVoices, speakText, speakableFromRespell } from '../utils/speech'
import { PALETTES, PAL_BY_ID } from '../tabs/Tools'

// ── Semantic Word Forge (PATCH7A · voice+freetext 7B · organize 7C) ──
// Starts from REAL words that MEAN what you typed, then blends/reshapes.
// Outputs are SUGGESTIONS ONLY — nothing is canon until Melissa says so.

const inputStyle = { fontSize: '0.85em', padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }
const chip = on => ({ fontSize: '0.74em', padding: '3px 9px', borderRadius: 12, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--cl)' : 'var(--brd)'), background: on ? 'rgba(170,102,255,.15)' : 'transparent', color: on ? 'var(--cl)' : 'var(--dim)' })
const tagColor = { attested: 'var(--cfl)', near: 'var(--cca)', approx: 'var(--cq)', guessed: 'var(--cwr)', none: 'var(--mut)' }
const LANG_LABEL = new Proxy({}, { get: (_, k) => langLabel(k) }) // registry-backed labels for all 72

export default function SemanticForge({ db }) {
  const [freeforms, setFreeforms] = useState({})
  // merged lexicon: bundled base + runtime seeds + free-text; seed words
  // MERGE onto a concept's words (word-level) so an added-columns import
  // never strips a concept's original languages.
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
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [weights, setWeights] = useState({ nahuatl: 60, latin: 40 })
  const [addLang, setAddLang] = useState('')
  const [softness, setSoftness] = useState(50)
  const [paletteId, setPaletteId] = useState('')
  const [blendMode, setBlendMode] = useState('portmanteau')
  const [useAffix, setUseAffix] = useState(false)
  const [affixes, setAffixes] = useState([])
  const [customAffix, setCustomAffix] = useState('')
  const [customPos, setCustomPos] = useState('prefix')
  const [savedAffixes, setSavedAffixes] = useState(() => { try { return JSON.parse(db.getSetting?.('semforge_affixes') || '[]') } catch { return [] } })
  const [count, setCount] = useState(10)
  const [salt, setSalt] = useState('')
  const [showIPA, setShowIPA] = useState(() => db.getSetting?.('semforge_ipa') === '1')
  const [cols, setCols] = useState(() => Math.max(1, Math.min(3, +(db.getSetting?.('semforge_cols') || 1))))
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [history, setHistory] = useState(() => { try { return JSON.parse(db.getSetting?.('semforge_history') || '[]') } catch { return [] } })
  const [showHistory, setShowHistory] = useState(false)
  const [saveFor, setSaveFor] = useState(null)
  const [saveForm, setSaveForm] = useState({ label: '', type: 'concept', language_form: '', tags: '', notes: '' })
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [notice, setNotice] = useState('')
  const [voiceURI, setVoiceURI] = useState(() => db.getSetting?.('semforge_voice') || '')
  const [voices, setVoices] = useState(() => listVoices())
  const [freeText, setFreeText] = useState('')
  // presets: named {weights, softness, paletteId, blendMode, affixes, useAffix}
  const [presets, setPresets] = useState(() => { try { return JSON.parse(db.getSetting?.('semforge_presets') || '[]') } catch { return [] } })
  const [presetName, setPresetName] = useState('')
  // add-your-own word
  const [showCustom, setShowCustom] = useState(false)
  const [cw, setCw] = useState({ word: '', meaning: '', respell: '', form: '', tag: 'attested', toGlossary: true })

  useEffect(() => onVoices(v => setVoices([...v])), [])

  function say(c) {
    const tts = ttsLocaleFor(c.spineLang)
    speakText(speakableFromRespell(c.respelling, c.word), { voiceURI, bcp: tts.bcp })
  }

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

  // only languages you've actually turned on show as sliders
  const activeLangs = useMemo(() => langsAvailable.filter(l => (weights[l] || 0) > 0), [langsAvailable, weights])
  const inactiveLangs = useMemo(() => langsAvailable.filter(l => !((weights[l] || 0) > 0)), [langsAvailable, weights])

  const conceptList = useMemo(() => Object.keys(lexicon).sort(), [lexicon])
  const filteredConcepts = conceptList.filter(c =>
    (!conceptQ || c.includes(conceptQ.toLowerCase())) && (!showSelectedOnly || concepts.includes(c)))

  // words you've already made — for the "already exists" warning
  const savedWords = useMemo(() => {
    const s = new Set()
    ;(db.db.lexicon_saved || []).forEach(x => { if (x.word) s.add(String(x.word).toLowerCase()); if (x.label) s.add(String(x.label).toLowerCase()) })
    ;(db.db.wiki || []).forEach(x => { if (x.is_glossary && x.title) s.add(String(x.title).toLowerCase()) })
    return s
  }, [db.db.lexicon_saved, db.db.wiki])

  function toggleConcept(c) { setConcepts(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]) }
  function setW(l, v) { setWeights(p => ({ ...p, [l]: +v })) }
  function addLanguage(l) { if (l) { setW(l, 50); setAddLang('') } }
  function removeLanguage(l) { setWeights(p => { const n = { ...p }; delete n[l]; return n }) }

  function applyRecipe(r) {
    if (!r) return
    setConcepts(r.concepts || [])
    setWeights(Object.fromEntries(Object.entries(r.languageWeights || {}).map(([l, w]) => [l, Math.round(w * 100)])))
    setSoftness(Math.round((r.softness ?? 0.5) * 100))
    setPaletteId(r.palette || '')
    setAffixes(r.affixes || []); setUseAffix((r.affixes || []).length > 0)
    setBlendMode(r.blendMode || 'portmanteau')
  }

  function resetForge() {
    setConcepts([]); setFreeforms({}); setWeights({ nahuatl: 60 }); setAddLang('')
    setAffixes([]); setUseAffix(false); setFreeText(''); setResults([]); setSelected(new Set())
    setSoftness(50); setPaletteId(''); setBlendMode('portmanteau'); setCount(10); setSalt('')
    setNotice('Forge reset to defaults.')
  }

  function run(saltArg) {
    const useSalt = saltArg !== undefined ? saltArg : salt
    const lw = {}; langsAvailable.forEach(l => { if (weights[l] > 0) lw[l] = weights[l] })
    const res = generate({
      lexicon, concepts, languageWeights: lw, softness: softness / 100,
      palette: paletteId ? PAL_BY_ID[paletteId] : null,
      affixes: useAffix ? affixes : [], blendMode, count, salt: useSalt,
    })
    setNotice(res.error || '')
    setResults(res.candidates || []); setSelected(new Set())
    if (res.candidates?.length) {
      const h = [{ t: Date.now(), word: res.candidates[0].word, n: res.candidates.length, recipe: res.candidates[0].recipe }, ...history].slice(0, 60)
      setHistory(h); db.saveSetting?.('semforge_history', JSON.stringify(h))
    }
  }
  function reroll() { const s = Date.now().toString(36); setSalt(s); run(s) }

  function startSave(c) { setSaveFor(c); setSaveForm({ label: c.word, type: 'concept', language_form: '', tags: '', notes: (c.derivation || []).map(d => `${d.word} (${LANG_LABEL[d.language] || d.language}: ${d.meaning})`).join(' + ') }) }
  function saveWord(c, form) {
    db.upsertEntry?.('lexicon_saved', {
      id: 'lex_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      word: c.word, respelling: c.respelling, ipa: c.ipa, spineLang: c.spineLang,
      derivation: c.derivation, recipe: c.recipe,
      label: (form?.label || c.word).trim() || c.word, type: form?.type || 'concept',
      language_form: (form?.language_form || '').trim(), notes: form?.notes || '',
      tags: (form?.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(), source: 'Word Forge (semantic)',
    })
  }
  function confirmSave() {
    const c = saveFor; if (!c) return
    saveWord(c, saveForm)
    setSaveFor(null); setNotice(`Saved "${c.word}" → Notes tab → 🗣 Lexicon.`)
  }
  function toggleSelect(i) { setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n }) }
  function saveSelected() {
    let n = 0
    selected.forEach(i => { const c = results[i]; if (c) { saveWord(c, { label: c.word }); n++ } })
    setSelected(new Set()); setNotice(`Saved ${n} word${n === 1 ? '' : 's'} → Lexicon bucket.`)
  }

  // presets
  function savePreset() {
    const name = presetName.trim(); if (!name) return
    const p = { name, weights, softness, paletteId, blendMode, affixes, useAffix }
    const next = [...presets.filter(x => x.name !== name), p].sort((a, b) => a.name.localeCompare(b.name))
    setPresets(next); db.saveSetting?.('semforge_presets', JSON.stringify(next)); setPresetName(''); setNotice(`Preset "${name}" saved.`)
  }
  function loadPreset(name) {
    const p = presets.find(x => x.name === name); if (!p) return
    setWeights(p.weights || {}); setSoftness(p.softness ?? 50); setPaletteId(p.paletteId || '')
    setBlendMode(p.blendMode || 'portmanteau'); setAffixes(p.affixes || []); setUseAffix(p.useAffix || false)
    setNotice(`Loaded preset "${name}".`)
  }
  function deletePreset(name) {
    const next = presets.filter(x => x.name !== name)
    setPresets(next); db.saveSetting?.('semforge_presets', JSON.stringify(next))
  }

  // add-your-own word → Lexicon bucket (+ optional Glossary/wiki entry)
  function saveCustomWord() {
    const w = cw.word.trim(); if (!w) return
    const meaning = cw.meaning.trim()
    db.upsertEntry?.('lexicon_saved', {
      id: 'lex_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      word: w, respelling: cw.respell.trim(), ipa: '', spineLang: '', derivation: [], recipe: null,
      label: w, type: 'concept', language_form: cw.form.trim(), notes: meaning, meaning,
      tags: [], is_custom: true, created_at: new Date().toISOString(), source: 'Custom entry',
    })
    if (cw.toGlossary) {
      db.upsertEntry?.('wiki', {
        id: 'gl_' + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36),
        title: w, summary: (cw.respell.trim() ? '[' + cw.respell.trim() + '] ' : '') + meaning,
        category: 'Languages', is_glossary: true, blocks: [],
      })
    }
    setNotice(`Added "${w}"${cw.toGlossary ? ' → Lexicon + Glossary' : ' → Lexicon'}.`)
    setCw({ word: '', meaning: '', respell: '', form: '', tag: 'attested', toGlossary: true }); setShowCustom(false)
  }

  function addCustomAffix() {
    const v = customAffix.trim(); if (!v) return
    const a = { value: v, position: customPos, gloss: 'custom' }
    setAffixes(p => [...p, a])
    const next = [...savedAffixes.filter(x => x.value !== v || x.position !== customPos), a]
    setSavedAffixes(next); db.saveSetting?.('semforge_affixes', JSON.stringify(next)); setCustomAffix('')
  }
  const allAffixChoices = [...BUILTIN_AFFIXES, ...savedAffixes.filter(s => !BUILTIN_AFFIXES.some(b => b.value === s.value && b.position === s.position))]

  function parseToEntries(text) {
    const d = JSON.parse(text)
    const cs = d.concepts || d
    const batch = String(d.meta?.batch || 'import')
    const out = []
    for (const [name, obj] of Object.entries(cs)) {
      if (!obj?.words) continue
      out.push({ id: 'seed_' + name, concept: name, meaning: obj.meaning || '', group: obj.group || 'imported', batch, words: obj.words })
    }
    return out
  }
  async function commitImport(entries, sourceLabel) {
    if (!entries.length) { setNotice('No concepts found in that file.'); return }
    setNotice(`Importing ${entries.length} concepts${sourceLabel ? ' from ' + sourceLabel : ''}…`)
    const res = await db.bulkUpsert?.('lexicon_seeds', entries)
    const failed = res?.failed || 0
    setNotice(failed
      ? `Imported ${entries.length} concepts, but ${failed} failed to sync — click Import again to retry those.`
      : `Imported ${entries.length} concepts${sourceLabel ? ' from ' + sourceLabel : ''} — synced to the cloud. ✓`)
    setShowImport(false); setImportText('')
  }
  async function importBatch() {
    try { await commitImport(parseToEntries(importText)) }
    catch { setNotice('Import failed — not valid batch JSON.') }
  }
  async function importFromFile(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''
    setNotice(`Reading ${files.length} file${files.length === 1 ? '' : 's'}…`)
    try {
      const texts = await Promise.all(files.map(f => f.text()))
      const byId = new Map()
      texts.forEach(t => parseToEntries(t).forEach(en => byId.set(en.id, en))) // later files win on same concept
      await commitImport([...byId.values()], files.length === 1 ? files[0].name : `${files.length} files`)
    } catch { setNotice('Import failed — one of those files wasn’t valid batch JSON.') }
  }

  return (
    <div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>
        Semantic forge — starts from real words that <i>mean</i> what you pick, then blends & reshapes. Every result shows its derivation. Suggestions only — never auto-canon. Pronunciations are approximate and editable on save.
      </div>

      {/* Concepts */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: '0.72em', color: 'var(--dim)' }}>Concepts ({conceptList.length} available) — meaning seeds</span>
          <label style={{ fontSize: '0.7em', color: 'var(--dim)', cursor: 'pointer' }}><input type="checkbox" checked={showSelectedOnly} onChange={e => setShowSelectedOnly(e.target.checked)} /> show selected only ({concepts.length})</label>
          {concepts.length > 0 && <button className="btn btn-sm btn-outline" onClick={() => setConcepts([])}>clear</button>}
        </div>
        <input value={conceptQ} onChange={e => setConceptQ(e.target.value)} placeholder="search concepts…" style={{ ...inputStyle, width: 180, marginBottom: 5 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 168, overflowY: 'auto', padding: 2 }}>
          {filteredConcepts.map(c => <span key={c} style={chip(concepts.includes(c))} onClick={() => toggleConcept(c)}>{c}</span>)}
          {filteredConcepts.length === 0 && <span style={{ fontSize: '0.72em', color: 'var(--mut)' }}>no concepts match.</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <input value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFreeText() }} placeholder="…or type any word (real roots if known, else sound-only)" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <button className="btn btn-sm btn-outline" onClick={addFreeText}>+ use word</button>
        </div>
      </div>

      {/* Language weights — only active languages show; add more from the picker */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: '0.72em', color: 'var(--dim)' }}>Languages — highest weight = spine (dominant root)</span>
          <select value={addLang} onChange={e => addLanguage(e.target.value)} style={{ ...inputStyle, maxWidth: 210 }}>
            <option value="">＋ add a language…</option>
            {inactiveLangs.map(l => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
          </select>
        </div>
        {activeLangs.length === 0 && <div style={{ fontSize: '0.72em', color: 'var(--mut)', padding: '4px 2px' }}>No languages active. Pick concepts above, then add a language from the picker.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '4px 14px' }}>
          {activeLangs.map(l => (
            <div key={l} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.72em', width: 84, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={LANG_LABEL[l]}>{LANG_LABEL[l]}</span>
              <input type="range" min="0" max="100" value={weights[l] || 0} onChange={e => setW(l, e.target.value)} style={{ flex: 1, minWidth: 70 }} />
              <span style={{ fontSize: '0.7em', width: 24, color: 'var(--dim)' }}>{weights[l] || 0}</span>
              <button onClick={() => removeLanguage(l)} title="remove" style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.85em' }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72em', color: 'var(--dim)' }}>Presets:</span>
        <select value="" onChange={e => { if (e.target.value) loadPreset(e.target.value) }} style={{ ...inputStyle, maxWidth: 170 }}>
          <option value="">load a naming style…</option>
          {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <input value={presetName} onChange={e => setPresetName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') savePreset() }} placeholder="save current as…" style={{ ...inputStyle, width: 150 }} />
        <button className="btn btn-sm btn-outline" onClick={savePreset}>💾 Save preset</button>
        {presets.length > 0 && <select value="" onChange={e => { if (e.target.value) deletePreset(e.target.value) }} style={{ ...inputStyle, maxWidth: 130 }}><option value="">🗑 delete…</option>{presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select>}
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

      {/* Forge controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button className="btn btn-sm" onClick={() => run()}>⚒ Forge</button>
        <button className="btn btn-sm btn-outline" onClick={reroll} title="Same settings, fresh set of words">🎲 Re-roll</button>
        <button className="btn btn-sm btn-outline" onClick={resetForge} title="Clear concepts, languages and settings">↺ Reset</button>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)', cursor: 'pointer' }}><input type="checkbox" checked={showIPA} onChange={e => { setShowIPA(e.target.checked); db.saveSetting?.('semforge_ipa', e.target.checked ? '1' : '0') }} /> IPA</label>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)' }}>cols
          <select value={cols} onChange={e => { const v = +e.target.value; setCols(v); db.saveSetting?.('semforge_cols', String(v)) }} style={{ ...inputStyle, width: 46, marginLeft: 3 }}>
            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
          </select>
        </label>
        <label style={{ fontSize: '0.72em', color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 4 }}>🗣
          <select value={voiceURI} onChange={e => { setVoiceURI(e.target.value); db.saveSetting?.('semforge_voice', e.target.value) }} style={{ ...inputStyle, maxWidth: 180 }} title="Voice for 🔊 — reads the phonetic respelling, so it approximates any language.">
            <option value="">voice: auto</option>
            {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        </label>
        <button className="btn btn-sm btn-outline" onClick={() => setShowImport(s => !s)}>📥 Import batch</button>
        <button className="btn btn-sm btn-outline" onClick={() => setShowCustom(s => !s)}>＋ Add custom word</button>
        {notice && <span style={{ fontSize: '0.72em', color: 'var(--cfl)' }}>{notice}</span>}
      </div>

      {/* Add-your-own word */}
      {showCustom && (
        <div style={{ marginBottom: 10, padding: '8px 10px', border: '1px solid var(--brd)', borderRadius: 8, background: 'var(--card)' }}>
          <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 5 }}>Add a word you already have (e.g. Ix'Citlatl) — saved to the Lexicon bucket, and optionally the Glossary.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={cw.word} onChange={e => setCw({ ...cw, word: e.target.value })} placeholder="word *" style={{ ...inputStyle, width: 150 }} />
            <input value={cw.respell} onChange={e => setCw({ ...cw, respell: e.target.value })} placeholder="pronunciation (e.g. eesh-see-TLAT-l)" style={{ ...inputStyle, width: 210 }} />
            <input value={cw.meaning} onChange={e => setCw({ ...cw, meaning: e.target.value })} placeholder="meaning" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
            <input value={cw.form} onChange={e => setCw({ ...cw, form: e.target.value })} placeholder="language/form (e.g. Ix'Citlatl)" style={{ ...inputStyle, width: 190 }} />
            <label style={{ fontSize: '0.72em', color: 'var(--dim)', cursor: 'pointer' }}><input type="checkbox" checked={cw.toGlossary} onChange={e => setCw({ ...cw, toGlossary: e.target.checked })} /> also add to Glossary</label>
            <button className="btn btn-sm" onClick={saveCustomWord}>Save word ✓</button>
          </div>
        </div>
      )}

      {showImport && (
        <div style={{ marginBottom: 10 }}>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder='Paste a batch JSON ({"meta":…,"concepts":{…}}) — e.g. Aster batches. Adds concepts with zero deploys.' style={{ ...inputStyle, width: '100%', minHeight: 80, boxSizing: 'border-box', fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={importBatch}>Import pasted</button>
            <span style={{ fontSize: '0.7em', color: 'var(--mut)' }}>or</span>
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>📁 Load from file(s)…
              <input type="file" accept=".json,application/json" multiple onChange={importFromFile} style={{ display: 'none' }} />
            </label>
            <span style={{ fontSize: '0.68em', color: 'var(--dim)' }}>(select one or several JSON batches — large files import via the loader, and now sync reliably)</span>
          </div>
        </div>
      )}

      {/* Multi-save bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <button className="btn btn-sm" onClick={saveSelected}>💾 Save {selected.size} selected</button>
          <button className="btn btn-sm btn-outline" onClick={() => setSelected(new Set())}>clear selection</button>
        </div>
      )}

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 6 }}>
        {results.map((c, i) => {
          const tts = ttsLocaleFor(c.spineLang)
          const dup = savedWords.has(c.word.toLowerCase())
          return (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid ' + (selected.has(i) ? 'var(--cl)' : 'var(--brd)') }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} title="select for batch save" style={{ cursor: 'pointer' }} />
                <b style={{ fontSize: '1.08em', color: 'var(--cl)' }}>{c.word}</b>
                <button onClick={() => say(c)} title={voiceURI ? 'chosen voice reads the respelling' : (tts.proxy ? `voice: ${tts.bcp} (closest proxy)` : `voice: ${tts.bcp}`)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🔊</button>
                <span style={{ fontSize: '0.77em', color: 'var(--dim)' }}>{c.respelling}</span>
                {showIPA && <span style={{ fontSize: '0.74em', color: 'var(--mut)' }}>/{c.ipa}/</span>}
                {dup && <span style={{ fontSize: '0.68em', color: 'var(--cwr)' }} title="a word by this name is already in your Lexicon or Glossary">⚠ exists</span>}
                <span style={{ flex: 1 }} />
                <button className="btn btn-sm btn-outline" onClick={() => startSave(c)}>💾 Save</button>
                <button className="btn btn-sm btn-outline" onClick={() => applyRecipe(c.recipe)} title="Set every control back to the recipe that made this word">↺</button>
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
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <button onClick={() => setShowHistory(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.72em' }}>{showHistory ? '▾' : '▸'} History ({history.length})</button>
            {showHistory && <button className="btn btn-sm btn-outline" onClick={() => { setHistory([]); db.saveSetting?.('semforge_history', '[]') }}>clear</button>}
          </div>
          {showHistory && (
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--brd)', borderRadius: 8, padding: '4px 8px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.74em', padding: '3px 0', borderBottom: i < history.length - 1 ? '1px solid var(--brd)' : 'none' }}>
                  <span style={{ color: 'var(--tx)' }}>{h.word}</span>
                  <span style={{ color: 'var(--mut)' }}>+{h.n - 1} · {new Date(h.t).toLocaleDateString()} {new Date(h.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-sm btn-outline" onClick={() => applyRecipe(h.recipe)}>↺ Load</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
