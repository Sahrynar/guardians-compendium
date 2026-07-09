// ══════════════════════════════════════════════════════════════════
// langRegistry.js — DATA-DRIVEN language registry (PATCH7B)
// Single source of truth for: display label, TTS locale hint, and
// per-language respell (pronunciation) rules.
//
// DESIGN PRINCIPLE: adding a future language is a DATA edit here (or a
// pure lexicon import), never a code change. Any language that appears
// in the lexicon but is NOT listed below still works fully:
//   • label  → prettified from its key
//   • voice  → falls back to en-GB (and the user's chosen voice reads it)
//   • respell→ base rules only (still legible)
// So the 62 added languages are all usable immediately; entries below
// just make specific ones nicer.
// ══════════════════════════════════════════════════════════════════

// Nice labels for keys whose prettified form would be wrong/ugly.
const LABEL_OVERRIDE = {
  greek_ancient: 'Anc. Greek', maya_yucatec: 'Yucatec Maya',
  proto_indo_european: 'Proto-Indo-European', proto_semitic: 'Proto-Semitic',
  proto_bantu: 'Proto-Bantu', old_high_german: 'Old High German',
  old_english: 'Old English', old_norse: 'Old Norse', old_saxon: 'Old Saxon',
  old_frisian: 'Old Frisian', old_irish: 'Old Irish', old_persian: 'Old Persian',
  middle_persian: 'Middle Persian', old_japanese: 'Old Japanese',
  middle_korean: 'Middle Korean', classical_chinese: 'Classical Chinese',
  classical_tibetan: 'Classical Tibetan', classical_armenian: 'Classical Armenian',
  classical_mongolian: 'Classical Mongolian', old_georgian: 'Old Georgian',
  byzantine_greek: 'Byzantine Greek', middle_mongol: 'Middle Mongol',
  old_turkic: 'Old Turkic', old_uyghur: 'Old Uyghur', old_nubian: 'Old Nubian',
  vedic_sanskrit: 'Vedic Sanskrit', scottish_gaelic: 'Scottish Gaelic',
  geez: 'Geʽez', kiche_maya: 'Kʼicheʼ Maya', cholti_maya: 'Chʼoltiʼ Maya',
  qeqchi_maya: 'Qʼeqchiʼ Maya', tamasheq: 'Tamasheq', purepecha: 'Purépecha',
}

// prettify: star_key → "Star Key"
function prettify(key) {
  return String(key || '').split('_')
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

// ── Registry: label + TTS hint + respell overrides ────────────────
// bcp = default voice locale hint; proxy=true means "no exact native
// voice expected — closest match / user-chosen voice reads it".
// respell = letters/digraphs → English-reader sounds (merged over base).
export const LANGS = {
  // ── original 10 (carried over from PATCH7A, unchanged behaviour) ──
  latin:         { bcp: 'it-IT', proxy: true,  respell: { j: 'y', v: 'w', c: 'k' } },
  italian:       { bcp: 'it-IT', proxy: false, respell: { j: 'y', gl: 'ly', gn: 'ny' } },
  greek_ancient: { bcp: 'el-GR', proxy: true,  respell: { ph: 'f', ch: 'kh' } },
  welsh:         { bcp: 'cy-GB', proxy: false, respell: { ll: 'hl', dd: 'th', w: 'oo', u: 'ee', f: 'v' } },
  persian:       { bcp: 'fa-IR', proxy: false, respell: { kh: 'kh', q: 'k' } },
  arabic:        { bcp: 'ar-SA', proxy: false, respell: { q: 'k' } },
  sanskrit:      { bcp: 'hi-IN', proxy: true,  respell: { j: 'j' } },
  japanese:      { bcp: 'ja-JP', proxy: false, respell: {} },
  nahuatl:       { bcp: 'es-MX', proxy: true,  respell: { x: 'sh', j: 'h', hu: 'w', qu: 'k', c: 'k' } },
  maya_yucatec:  { bcp: 'es-MX', proxy: true,  respell: { x: 'sh', j: 'h', c: 'k' } },

  // ── added languages with a plausible living voice locale ──────────
  // (proxy:true throughout — user's chosen voice is what really matters)
  swahili:   { bcp: 'sw-KE', proxy: true },
  zulu:      { bcp: 'zu-ZA', proxy: true },
  yoruba:    { bcp: 'yo-NG', proxy: true },
  hausa:     { bcp: 'ha-NG', proxy: true },
  amharic:   { bcp: 'am-ET', proxy: true },
  somali:    { bcp: 'so-SO', proxy: true },
  malagasy:  { bcp: 'mg-MG', proxy: true },
  wolof:     { bcp: 'fr-SN', proxy: true },
  urdu:      { bcp: 'ur-PK', proxy: true },
  punjabi:   { bcp: 'pa-IN', proxy: true },
  tamil:     { bcp: 'ta-IN', proxy: true },
  pashto:    { bcp: 'ps-AF', proxy: true },
  kazakh:    { bcp: 'kk-KZ', proxy: true },
  hawaiian:  { bcp: 'haw-US', proxy: true, respell: { w: 'v' } },
  // classical/old forms → nearest living locale as a default hint only
  vedic_sanskrit:   { bcp: 'hi-IN', proxy: true, respell: { j: 'j' } },
  pali:             { bcp: 'hi-IN', proxy: true },
  prakrit:          { bcp: 'hi-IN', proxy: true },
  old_persian:      { bcp: 'fa-IR', proxy: true, respell: { kh: 'kh', q: 'k' } },
  middle_persian:   { bcp: 'fa-IR', proxy: true, respell: { kh: 'kh', q: 'k' } },
  avestan:          { bcp: 'fa-IR', proxy: true },
  sogdian:          { bcp: 'fa-IR', proxy: true },
  bactrian:         { bcp: 'fa-IR', proxy: true },
  syriac:           { bcp: 'ar-SA', proxy: true, respell: { q: 'k' } },
  classical_chinese:{ bcp: 'zh-CN', proxy: true },
  old_japanese:     { bcp: 'ja-JP', proxy: true },
  middle_korean:    { bcp: 'ko-KR', proxy: true },
  classical_tibetan:{ bcp: 'bo', proxy: true },
  middle_mongol:    { bcp: 'mn-MN', proxy: true },
  classical_mongolian:{ bcp: 'mn-MN', proxy: true },
  old_turkic:       { bcp: 'tr-TR', proxy: true },
  old_uyghur:       { bcp: 'ug', proxy: true },
  classical_armenian:{ bcp: 'hy-AM', proxy: true },
  old_georgian:     { bcp: 'ka-GE', proxy: true },
  byzantine_greek:  { bcp: 'el-GR', proxy: true, respell: { ph: 'f', ch: 'kh' } },
  ainu:             { bcp: 'ja-JP', proxy: true },
  manchu:           { bcp: 'zh-CN', proxy: true },
  geez:             { bcp: 'am-ET', proxy: true },
  // Germanic / Celtic old forms
  old_norse:        { bcp: 'is-IS', proxy: true },
  old_english:      { bcp: 'en-GB', proxy: true },
  old_high_german:  { bcp: 'de-DE', proxy: true },
  old_saxon:        { bcp: 'de-DE', proxy: true },
  old_frisian:      { bcp: 'nl-NL', proxy: true },
  old_irish:        { bcp: 'ga-IE', proxy: true },
  scottish_gaelic:  { bcp: 'gd-GB', proxy: true, respell: { mh: 'v', bh: 'v', dh: 'gh' } },
  cornish:          { bcp: 'kw', proxy: true },
  breton:           { bcp: 'br', proxy: true },
  venetian:         { bcp: 'it-IT', proxy: true },
  // Mesoamerican family
  kiche_maya:  { bcp: 'es-GT', proxy: true, respell: { x: 'sh', j: 'h' } },
  cholti_maya: { bcp: 'es-GT', proxy: true, respell: { x: 'sh', j: 'h' } },
  qeqchi_maya: { bcp: 'es-GT', proxy: true, respell: { x: 'sh', j: 'h' } },
  zapotec:     { bcp: 'es-MX', proxy: true, respell: { x: 'sh' } },
  mixtec:      { bcp: 'es-MX', proxy: true, respell: { x: 'sh' } },
  totonac:     { bcp: 'es-MX', proxy: true, respell: { x: 'sh' } },
  purepecha:   { bcp: 'es-MX', proxy: true },
  otomi:       { bcp: 'es-MX', proxy: true },
  // Ancient near-east / reconstructed
  egyptian:     { bcp: 'ar-EG', proxy: true },
  sumerian:     { bcp: 'ar-IQ', proxy: true },
  proto_indo_european: { bcp: 'en-GB', proxy: true },
  proto_semitic:{ bcp: 'ar-SA', proxy: true },
  proto_bantu:  { bcp: 'sw-KE', proxy: true },
  old_nubian:   { bcp: 'ar-EG', proxy: true },
  tamasheq:     { bcp: 'ar-DZ', proxy: true },
}

// ── Affix pronunciation LAYER (fixes the Ix' → "eesh" bug) ─────────
// Affixes are morphology, NOT roots — they must be respelled by their
// OWN rules, never through the spine language's sound map. Keyed by the
// affix value (case-insensitive, glottal-tolerant).
export const AFFIX_RESPELL = {
  "ix'": 'eesh',   // Yucatec Maya feminine prefix (Ix Chel) — Melissa-confirmed
  'ix':  'eesh',
  'ah':  'ah',     // Maya masculine/agentive (Ah Kin)
  '-iel': 'ee-el',
  '-riel': 'ree-el',
  '-ah': 'ah',
}

// normalise an affix value for lookup: lowercase, keep letters + glottal
function affixKey(v) {
  return String(v || '').toLowerCase().replace(/[^a-zʼ''\-]/g, '')
    .replace(/[ʼ']/g, "'")
}

// ── Public helpers (used across the engine + UI) ──────────────────
export function langLabel(key) {
  return LABEL_OVERRIDE[key] || prettify(key)
}
export function ttsFor(key) {
  const e = LANGS[key]
  return e ? { bcp: e.bcp || 'en-GB', proxy: e.proxy !== false }
           : { bcp: 'en-GB', proxy: true }
}
export function respellMap(key) {
  return LANGS[key]?.respell || {}
}
// respell a known affix via its own layer; returns null if not a known affix
export function respellAffix(value) {
  const k = affixKey(value)
  if (AFFIX_RESPELL[k] !== undefined) return AFFIX_RESPELL[k]
  // strip leading/trailing hyphen and retry (suffix "-ah" stored as "ah")
  const bare = k.replace(/^-+|-+$/g, '')
  return AFFIX_RESPELL['-' + bare] ?? AFFIX_RESPELL[bare] ?? null
}
