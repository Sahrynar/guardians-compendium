import { useState, useMemo } from 'react'
import { DEFAULT_LEXICON } from '../data/lajenLexicon'
import { langLabel } from '../data/langRegistry'
import { BUILTIN_AFFIXES, ttsLocaleFor } from '../utils/nameForge'
import { speakText } from '../utils/speech'

// ── Reverse Lookup / Translator (PATCH7B) ─────────────────────────
// Given a word, answer "where could this have come from?"
//   • EXACT: if it's a saved Lexicon-bucket word, show its true recipe
//     & derivation — this is CERTAIN (it's the stored recipe).
//   • FUZZY: otherwise, infer possible real-word roots from the lexicon.
//     This is a GUESS, clearly flagged, and never written to canon.
// Root layer (meaning-bearing) is kept SEPARATE from the affix layer
// (grammar/morphology), per the standing root-vs-grammar rule.

const inputStyle = { fontSize: '0.9em', padding: '6px 9px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }
const tagColor = { attested: 'var(--cfl)', near: 'var(--cca)', approx: 'var(--cq)', guessed: 'var(--cwr)', none: 'var(--mut)' }
const norm = s => String(s || '').toLowerCase().replace(/[ʼ’]/g, "'").trim()

export default function ReverseLookup({ db }) {
  const [voiceURI] = useState(() => db.getSetting?.('semforge_voice') || '')
  const [query, setQuery] = useState('')
  const [ran, setRan] = useState(false)

  // same word-level merge the Forge uses
  const lexicon = useMemo(() => {
    const merged = { ...DEFAULT_LEXICON }
    for (const e of db.db.lexicon_seeds || []) {
      if (e?.concept && e?.words) {
        const base = merged[e.concept]
        merged[e.concept] = { meaning: e.meaning || base?.meaning || '', words: { ...(base?.words || {}), ...e.words } }
      }
    }
    return merged
  }, [db.db.lexicon_seeds])

  const saved = db.db.lexicon_saved || []

  const result = useMemo(() => {
    const q = norm(query)
    if (!q) return null

    // 1) EXACT — is this a saved word? (certain)
    const hit = saved.find(w => norm(w.word) === q || norm(w.label) === q)
    if (hit) return { kind: 'exact', word: hit }

    // 2) FUZZY — peel known affixes, then infer roots (guess)
    let core = q
    const foundAffixes = []
    for (const a of BUILTIN_AFFIXES) {
      const av = norm(a.value).replace(/^-+|-+$/g, '')
      const bare = av.replace(/'/g, '')
      if (a.position === 'prefix' && (core.startsWith(av) || core.startsWith(bare))) {
        foundAffixes.push(a); core = core.slice(core.startsWith(av) ? av.length : bare.length)
      } else if (a.position === 'suffix' && (core.endsWith(av) || core.endsWith(bare))) {
        foundAffixes.push(a); core = core.slice(0, core.length - (core.endsWith(av) ? av.length : bare.length))
      }
    }

    // scan lexicon for real words that overlap the core
    const roots = []
    for (const [concept, entry] of Object.entries(lexicon)) {
      for (const [lang, cell] of Object.entries(entry.words || {})) {
        const w = norm(cell?.w)
        if (!w || w === '—' || w.length < 3) continue
        const contained = core.includes(w)
        const contains = w.includes(core) && core.length >= 3
        if (contained || contains) {
          roots.push({ concept, lang, word: cell.w, meaning: entry.meaning || '', tag: cell.tag || 'guessed',
            score: (contained ? w.length : core.length) + (contained ? 0.5 : 0) })
        }
      }
    }
    roots.sort((a, b) => b.score - a.score)
    const seen = new Set()
    const top = roots.filter(r => { const k = r.concept + '|' + r.lang; if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 24)
    return { kind: 'fuzzy', core, affixes: foundAffixes, roots: top }
  }, [query, lexicon, saved]) // eslint-disable-line

  function speakInput() {
    speakText(query, { voiceURI, bcp: 'en-GB' })
  }

  return (
    <div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>
        Reverse lookup — paste a forged word to see where it could have come from. A <b>saved</b> word shows its exact recipe (certain). Anything else gets a <b>best-guess</b> root inference from the lexicon — clearly a guess, never canon. Affixes (grammar) are listed separately from roots (meaning).
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <input value={query} onChange={e => { setQuery(e.target.value); setRan(true) }} onKeyDown={e => { if (e.key === 'Enter') setRan(true) }} placeholder="type or paste a word…" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        <button onClick={speakInput} title="hear it (chosen voice)" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em' }}>🔊</button>
      </div>

      {ran && result?.kind === 'exact' && (() => {
        const w = result.word
        return (
          <div style={{ background: 'var(--card)', border: '1px solid var(--cfl)', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ fontSize: '0.72em', color: 'var(--cfl)', marginBottom: 4 }}>✓ Saved word — this is its real recipe (certain)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b style={{ color: 'var(--cl)', fontSize: '1.1em' }}>{w.word}</b>
              <span style={{ fontSize: '0.8em', color: 'var(--dim)' }}>{w.respelling}</span>
              <span style={{ fontSize: '0.72em', color: 'var(--mut)' }}>{w.type}{w.language_form ? ' · ' + w.language_form : ''}</span>
            </div>
            {(w.derivation || []).length > 0 && (
              <div style={{ fontSize: '0.78em', color: 'var(--mut)', marginTop: 6 }}>
                built from {w.derivation.map((d, i) => (
                  <span key={i}><i style={{ color: 'var(--tx)' }}>{d.word}</i> <span style={{ color: 'var(--dim)' }}>({langLabel(d.language)}: “{d.meaning}”</span> <span style={{ color: tagColor[d.tag] || 'var(--mut)' }}>{d.tag}</span><span style={{ color: 'var(--dim)' }}>)</span>{i < w.derivation.length - 1 ? ' + ' : ''}</span>
                ))}
              </div>
            )}
            {w.notes && <div style={{ fontSize: '0.76em', color: 'var(--dim)', marginTop: 5 }}>{w.notes}</div>}
          </div>
        )
      })()}

      {ran && result?.kind === 'fuzzy' && (
        <div>
          <div style={{ background: 'rgba(255,140,60,.08)', border: '1px solid var(--cwr)', borderRadius: 8, padding: '7px 11px', marginBottom: 8, fontSize: '0.76em', color: 'var(--cwr)' }}>
            ⚠ Not a saved word — everything below is <b>inference, not a real translation</b>. Treat as a guess; never promote to canon on this basis.
          </div>

          {result.affixes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 3 }}>Affixes detected (grammar layer — separate from meaning):</div>
              {result.affixes.map((a, i) => (
                <div key={i} style={{ fontSize: '0.8em', color: 'var(--tx)' }}>
                  <b>{a.value}</b> <span style={{ color: 'var(--mut)' }}>({a.position}) — {a.gloss}</span>
                </div>
              ))}
              <div style={{ fontSize: '0.72em', color: 'var(--mut)', marginTop: 2 }}>Remaining root to match: <i>{result.core || '(none)'}</i></div>
            </div>
          )}

          <div style={{ fontSize: '0.72em', color: 'var(--dim)', marginBottom: 4 }}>Possible roots (guessed — meaning layer), best overlap first:</div>
          {result.roots.length === 0 && <div style={{ fontSize: '0.8em', color: 'var(--mut)', padding: 8 }}>No lexicon roots overlap this word. It may be fully invented, or from a concept/language not in the lexicon.</div>}
          {result.roots.map((r, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 7, padding: '5px 10px', marginBottom: 4, fontSize: '0.8em', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <i style={{ color: 'var(--cl)' }}>{r.word}</i>
              <span style={{ color: 'var(--dim)' }}>{langLabel(r.lang)}</span>
              <span style={{ color: 'var(--tx)' }}>“{r.meaning || r.concept}”</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: tagColor[r.tag] || 'var(--mut)', fontSize: '0.9em' }}>[{r.tag}]</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
