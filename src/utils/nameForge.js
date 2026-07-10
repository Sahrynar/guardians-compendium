// ══════════════════════════════════════════════════════════════════
// nameForge.js — SEMANTIC word-forge engine (PATCH7A)
// Starts from REAL words that MEAN the requested concept, then blends
// and reshapes them. Every output carries its derivation. Deterministic:
// same recipe + seed index ⇒ identical word, always. No Math.random().
// Outputs are SUGGESTIONS ONLY — nothing here is canon until Melissa says.
// Heuristic pieces (syllable split, respelling, IPA) are approximate by
// design and editable on save.
// ══════════════════════════════════════════════════════════════════

import { respellMap, respellAffix, ttsFor } from '../data/langRegistry'

// ── Deterministic PRNG ────────────────────────────────────────────
export function hashString(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

// ── Canonical recipe string (stable across sessions) ──────────────
export function canonicalRecipe(r) {
  const langs = Object.entries(r.languageWeights || {})
    .filter(([, w]) => w > 0).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([l, w]) => l + ':' + (+w).toFixed(3)).join(',')
  const affs = (r.affixes || []).map(a => a.position + ':' + a.value).join(',')
  return [
    'c=' + (r.concepts || []).slice().sort().join('+'),
    'w=' + langs, 's=' + (+r.softness).toFixed(3),
    'p=' + (r.palette || 'none'), 'a=' + affs, 'm=' + (r.blendMode || 'portmanteau'),
  ].join('|')
}

// ── Syllabification (HEURISTIC) ───────────────────────────────────
const V = 'aeiouyáéíóúàèìòùâêîôûäëïöüāēīōūœæ'
const isV = ch => V.includes(ch)
export function syllabify(word) {
  const out = []
  for (const part of String(word).toLowerCase().split(/[''\-\s]+/).filter(Boolean)) {
    const m = part.match(/[^aeiouyáéíóúàèìòùâêîôûäëïöüāēīōūœæ]*[aeiouyáéíóúàèìòùâêîôûäëïöüāēīōūœæ]+/g)
    if (!m) { out.push(part); continue }
    const used = m.join('')
    const tail = part.slice(used.length)
    if (tail) m[m.length - 1] += tail
    out.push(...m)
  }
  return out.length ? out : [String(word).toLowerCase()]
}

// ── Blend ─────────────────────────────────────────────────────────
function blend(seedsByLang, weights, mode, rng) {
  const order = Object.entries(weights).sort((a, b) => b[1] - a[1])
  const langs = order.map(([l]) => l)
  const sylls = langs.map(l => syllabify(seedsByLang[l].word))
  if (langs.length === 1 || mode === 'root') return sylls[0].join('')

  const avg = order.reduce((s, [, w], i) => s + w * sylls[i].length, 0)
  let target = Math.max(2, Math.min(5, Math.round(avg)))
  if (rng() < 0.35) target = Math.max(2, Math.min(5, target + (rng() < 0.5 ? -1 : 1)))

  if (mode === 'alternating') {
    const chunks = []
    for (let i = 0; i < target; i++) {
      const li = i % langs.length
      const s = sylls[li]
      chunks.push(s[Math.floor(i / langs.length) % s.length])
    }
    return chunks.join('')
  }
  // portmanteau (default): spine leads from its START, others contribute TAILS
  let spineTake = Math.max(1, Math.round(order[0][1] * target))
  if (langs.length > 1) spineTake = Math.min(spineTake, target - 1)
  spineTake = Math.min(spineTake, sylls[0].length)
  const chunks = sylls[0].slice(0, spineTake)
  let remaining = target - chunks.length
  for (let i = 1; i < langs.length && remaining > 0; i++) {
    const share = i === langs.length - 1 ? remaining
      : Math.max(1, Math.round(order[i][1] / order.slice(1).reduce((s, [, w]) => s + w, 0) * remaining))
    const take = Math.min(share, sylls[i].length, remaining)
    const maxOff = sylls[i].length - take
    const off = maxOff > 0 && rng() < 0.45 ? Math.floor(rng() * (maxOff + 1)) : maxOff
    chunks.push(...sylls[i].slice(off, off + take))
    remaining -= take
  }
  while (remaining-- > 0) chunks.push(pick(rng, sylls[0]))
  return chunks.join('')
}

// ── Reshape: softness ops + palette conformance ───────────────────
const DIGRAPHS = ['sh','ch','th','tl','tz','ts','kh','gh','ph','bh','dh','zh','ng','ny','ll','dd','gw','kw','hr','sk','tx','rr','sc','gl']
function tokenize(w) {
  const t = []
  for (let i = 0; i < w.length;) {
    const two = w.slice(i, i + 2)
    if (DIGRAPHS.includes(two)) { t.push(two); i += 2 } else { t.push(w[i]); i += 1 }
  }
  return t
}
const C_CLASS = {
  stop: ['p','b','t','d','k','g','q','c'],
  fric: ['f','v','s','z','h','x','sh','ch','th','kh','gh','ph','zh','j'],
  nasal: ['m','n','ng','ny'],
  liquid: ['l','r','ll','rr'],
  glide: ['w','y'],
  cluster: ['tl','tz','ts','bh','dh','gw','kw','hr','sk','tx','dd','sc','gl'],
}
const classOf = tok => Object.keys(C_CLASS).find(k => C_CLASS[k].includes(tok)) || 'stop'
const HARDEN = { b:'p', d:'t', g:'k', v:'f', z:'s', j:'ch' }
const SOFTEN = { p:'b', t:'d', k:'g', f:'v', s:'z' }
const V_NEAR = { a:['a','e','o'], e:['e','i','a'], i:['i','e','y'], o:['o','u','a'], u:['u','o','i'], y:['i','e','y'] }
const baseV = ch => 'áàâäā'.includes(ch) ? 'a' : 'éèêëē'.includes(ch) ? 'e' : 'íìîïī'.includes(ch) ? 'i'
  : 'óòôöō'.includes(ch) ? 'o' : 'úùûüū'.includes(ch) ? 'u' : ch

// Preferred substitutes by phonetic closeness, tried before the generic
// class scan. Fixes e.g. 'c'/'k' collapsing to 'p' when a palette allows
// both p and k (k is the right choice for a /k/ sound).
const PREFERRED_SUB = {
  c: ['k', 'ch', 'q', 's'], k: ['k', 'q', 'c', 'g'], q: ['k', 'c', 'g'],
  g: ['g', 'k', 'q'], x: ['x', 'sh', 'ch', 's', 'k'], j: ['j', 'ch', 'y', 'g'],
  z: ['z', 's'], v: ['v', 'f', 'w'], f: ['f', 'ph', 'v'],
}
function nearestConsonant(tok, allowed) {
  if (allowed.has(tok)) return tok
  const pref = PREFERRED_SUB[tok]
  if (pref) for (const cand of pref) if (allowed.has(cand)) return cand
  for (const cand of C_CLASS[classOf(tok)]) if (allowed.has(cand)) return cand
  for (const cls of ['stop','fric','nasal','liquid','glide']) for (const cand of C_CLASS[cls]) if (allowed.has(cand)) return cand
  return tok
}
function nearestVowel(ch, allowedLetters) {
  const b = baseV(ch)
  if (allowedLetters.has(b)) return b
  for (const cand of (V_NEAR[b] || ['a'])) if (allowedLetters.has(cand)) return cand
  return b
}

function paletteConform(word, pal, rng) {
  if (!pal) return word
  const allowedC = new Set([...(pal.on || []), ...(pal.cod || [])])
  const allowedVL = new Set((pal.v || []).join('').split('').map(baseV))
  let out = ''
  for (const tok of tokenize(word)) {
    if (tok === "'" || tok === '’') { out += tok; continue }
    out += isV(tok[0]) ? [...tok].map(c => nearestVowel(c, allowedVL)).join('') : nearestConsonant(tok, allowedC)
  }
  // occasionally graft a palette ending for stronger flavour
  if (pal.end?.length && out.length <= 9 && rng() < 0.3) {
    out = out.replace(/[aeiouy]+$/i, '')
    if (!/[aeiouy]/i.test(out)) out += pick(rng, pal.v || ['a'])
    out += pick(rng, pal.end)
  }
  return out
}

function reshape(word, softness, pal, rng) {
  let w = word
  const vowelsIn = s => [...s].filter(isV)
  const anyVowel = s => { const vs = vowelsIn(s); return vs.length ? pick(rng, vs) : 'a' }
  const softOps = [
    s => s.replace(/([^aeiouy'\s])([^aeiouy'\s])/i, (m, a, b) => a + anyVowel(s) + b),           // break a cluster
    s => (/[^aeiouy'ʼ]$/.test(s) ? s + anyVowel(s) : s),                                          // open final syllable
    s => s.replace(/[ptk](?=[aeiouy])/i, m => SOFTEN[m] || m),                                    // soften a stop
    s => s.replace(/['’](?=.)/, ''),                                                              // drop a glottal
  ]
  const hardOps = [
    s => (s.length > 3 && /[aeiouy]$/.test(s) ? s.slice(0, -1) : s),                              // close final syllable
    s => s.replace(/[bdgvzj](?=[aeiouy])/i, m => HARDEN[m] || m),                                 // harden a voiced consonant
    s => { const i = 2 + Math.floor(rng() * Math.max(1, s.length - 4));                           // insert a glottal
           return /[''ʼ]/.test(s) || s.length < 5 ? s : s.slice(0, i) + "'" + s.slice(i) },
    s => s.replace(/([lrmnstk])(?=[aeiouy])/i, (m, c) => c + c),                                  // geminate
  ]
  const intensity = Math.abs(softness - 0.5) * 2
  let n = Math.round(intensity * 3)
  if (n === 0 && rng() < 0.65) n = 1 // near-neutral: one mild op keeps candidates varied
  const ops = softness < 0.5 ? softOps : hardOps
  for (let i = 0; i < n; i++) w = ops[Math.floor(rng() * ops.length)](w)
  w = paletteConform(w, pal, rng)
  // guards: pronounceability
  w = w.replace(/(.)\1\1+/g, '$1$1')                                   // no triples
  w = w.replace(/[^aeiouyáéíóú''ʼ]{4,}/gi, m => m.slice(0, 2) + anyVowel(w) + m.slice(2))  // cap clusters
  for (const syl of syllabify(w)) if (!/[aeiouyáéíóú]/i.test(syl)) { w = w.replace(syl, syl + 'a'); break }
  if (w.replace(/[''ʼ]/g, '').length < 2) w += 'a'
  return w
}

// ── Affixes ───────────────────────────────────────────────────────
export const BUILTIN_AFFIXES = [
  { value: "Ix'", position: 'prefix', gloss: 'feminine — "she of…" (real Maya morphology, e.g. Ix Chel)' },
  { value: 'Ah',  position: 'prefix', gloss: 'masculine/agentive — "he of…" (real Maya morphology, e.g. Ah Kin)' },
  { value: '-iel',  position: 'suffix', gloss: 'series flavour (Akatriel family)' },
  { value: '-riel', position: 'suffix', gloss: 'series flavour (Akatriel family)' },
  { value: '-ah',   position: 'suffix', gloss: 'series flavour (Sahrynar / Mirirah family)' },
]
function applyAffixes(word, affixes) {
  let w = word
  const capAfter = []
  for (const a of affixes || []) {
    const val = String(a.value || '').replace(/^-|-$/g, a.position === 'suffix' ? '' : '')
    if (!val) continue
    if (a.position === 'prefix') {
      const p = a.value.replace(/-+$/, '')
      if (/[''ʼ]$/.test(p)) capAfter.push(p.length)
      w = p + w
    } else w = w + a.value.replace(/^-+/, '')
  }
  return { w, capAfter }
}

// ── Pronunciation (HEURISTIC — editable on save) ──────────────────
const RESPELL_BASE = { a:'ah', e:'eh', i:'ee', o:'oh', u:'oo', y:'ee',
  ai:'eye', au:'ow', ei:'ay', oi:'oy', c:'k', q:'k', x:'ks', j:'j',
  sh:'sh', ch:'ch', th:'th', kh:'kh', gh:'g', ph:'f', tl:'tl', tz:'ts', ts:'ts',
  ll:'l', rr:'r', ng:'ng', zh:'zh', dd:'th', gw:'gw', kw:'kw', hr:'hr', sk:'sk', bh:'b', dh:'d' }
// Peel known affixes off a (final) word so they can be pronounced via
// their OWN layer, not the spine language's root rules. Tolerant of
// reshape having dropped a glottal. Returns { pre, core, suf }.
function peelAffixes(word, affixes) {
  let core = word
  let pre = '', suf = ''
  const norm = s => String(s).toLowerCase().replace(/[ʼ’]/g, "'")
  for (const a of affixes || []) {
    const rs = respellAffix(a.value)
    if (rs == null) continue
    const av = norm(String(a.value).replace(/^-+|-+$/g, ''))
    const avNoGlot = av.replace(/'/g, '')
    if (a.position === 'prefix') {
      const c = norm(core)
      if (av && c.startsWith(av)) { pre += rs + '-'; core = core.slice(av.length) }
      else if (avNoGlot && c.startsWith(avNoGlot)) { pre += rs + '-'; core = core.slice(avNoGlot.length) }
    } else {
      const c = norm(core)
      if (av && c.endsWith(av)) { suf = '-' + rs + suf; core = core.slice(0, core.length - av.length) }
      else if (avNoGlot && c.endsWith(avNoGlot)) { suf = '-' + rs + suf; core = core.slice(0, core.length - avNoGlot.length) }
    }
  }
  return { pre, core, suf }
}

export function respell(word, spineLang, affixes = []) {
  const map = { ...RESPELL_BASE, ...respellMap(spineLang) }
  const { pre, core, suf } = peelAffixes(word, affixes)
  const sylls = core ? syllabify(core) : []
  const conv = s => {
    let out = '', i = 0
    while (i < s.length) {
      const two = s.slice(i, i + 2)
      if (map[two]) { out += map[two]; i += 2; continue }
      const ch = baseV(s[i])
      out += map[ch] !== undefined ? map[ch] : s[i]
      i += 1
    }
    return out
  }
  const chunks = sylls.map(conv)
  const stress = chunks.length >= 2 ? chunks.length - 2 : 0
  const coreOut = chunks.map((c, i) => (i === stress && chunks.length >= 2 ? c.toUpperCase() : c)).join('-')
  return (pre + coreOut + suf).replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
}
const IPA_BASE = { a:'a', e:'e', i:'i', o:'o', u:'u', y:'i', c:'k', q:'k', x:'ʃ', j:'dʒ',
  sh:'ʃ', ch:'tʃ', th:'θ', kh:'x', gh:'ɣ', ph:'f', tl:'tɬ', tz:'ts', ts:'ts', ll:'ʎ', rr:'r', ng:'ŋ', zh:'ʒ', "'":'ʔ' }
export function toIPA(word, spineLang) {
  const over = spineLang === 'latin' || spineLang === 'italian' ? { j:'j', x:'ks' } : {}
  const map = { ...IPA_BASE, ...over }
  let out = ''
  for (const tok of tokenize(String(word).toLowerCase())) out += map[tok] || map[baseV(tok)] || tok
  return 'ˈ' + out
}

// ── TTS locale (registry-driven; browser/chosen voices expand it) ──
// Any language in the lexicon resolves to a locale hint via the registry;
// unknown languages fall back to en-GB. The user's chosen voice (voice
// picker) overrides this at speak time.
export const ttsLocaleFor = spineLang => ttsFor(spineLang)

// ── Main generate ─────────────────────────────────────────────────
export function generate(opts) {
  const { lexicon, concepts = [], languageWeights = {}, softness = 0.5,
    palette = null, affixes = [], blendMode = 'portmanteau', salt = '' } = opts
  const count = Math.max(1, Math.min(50, Math.round(opts.count || 10)))

  // seeds per language (a language may hold several seeds across concepts)
  const seedPool = {}
  for (const c of concepts) {
    const entry = lexicon[c]; if (!entry) continue
    for (const [lang, cell] of Object.entries(entry.words || {})) {
      const w = (cell?.w || '').trim()
      if (!w || w === '—' || !(languageWeights[lang] > 0)) continue
      ;(seedPool[lang] = seedPool[lang] || []).push({ language: lang, word: w, meaning: entry.meaning, tag: cell.tag || 'attested', concept: c })
    }
  }
  const langs = Object.keys(seedPool)
  if (!langs.length) return { error: 'No seed words found — pick at least one concept and one weighted language that has an entry for it.', candidates: [] }
  const tot = langs.reduce((s, l) => s + languageWeights[l], 0)
  const weights = Object.fromEntries(langs.map(l => [l, languageWeights[l] / tot]))
  const spineLang = langs.sort((a, b) => weights[b] - weights[a])[0]

  const recipeBase = { concepts, languageWeights: weights, softness, palette: palette?.id || null, affixes, blendMode }
  const canon = canonicalRecipe(recipeBase) + (salt ? '#salt#' + salt : '')
  const out = [], seen = new Set()
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const seed = hashString(canon + '#' + i)
    const rng = mulberry32(seed)
    const chosen = {}; const derivation = []
    for (const l of langs) { const s = pick(rng, seedPool[l]); chosen[l] = s; derivation.push(s) }
    let w = blend(chosen, weights, blendMode, rng)
    const { w: affixed, capAfter } = applyAffixes(w, affixes)
    w = reshape(affixed, softness, palette, rng).toLowerCase()
    w = w[0].toUpperCase() + w.slice(1)
    for (const idx of capAfter) if (w[idx]) w = w.slice(0, idx) + w[idx].toUpperCase() + w.slice(idx + 1)
    if (seen.has(w)) continue
    seen.add(w)
    out.push({
      word: w, respelling: respell(w, spineLang, affixes), ipa: toIPA(w, spineLang),
      spineLang, tts: ttsLocaleFor(spineLang), derivation, affixes,
      seed, recipe: { ...recipeBase, seedIndex: i, salt },
    })
  }
  return { candidates: out, spineLang }
}

// Re-derive ONE exact word from a saved recipe (Load settings / audit trail)
export function regenerate(lexicon, recipe, paletteObj = null) {
  const r = generate({ lexicon, ...recipe, palette: paletteObj, count: recipe.seedIndex + 1 })
  return r.candidates?.find(c => c.recipe.seedIndex === recipe.seedIndex) || null
}
