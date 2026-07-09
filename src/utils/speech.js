// ══════════════════════════════════════════════════════════════════
// speech.js — Web Speech API voice picking + speaking (PATCH7B)
// A TTS voice speaks SOUNDS, not a language — so any installed voice can
// read any language by voicing its phonetic respelling. This lets every
// one of the 72 languages be voiced with whatever voice the user picks,
// authentic-native voice not required (Melissa's accepted approach).
// ══════════════════════════════════════════════════════════════════

// Voices load async in most browsers; cache + notify on ready.
let _voices = []
const _subs = new Set()
function refresh() {
  try {
    _voices = window.speechSynthesis?.getVoices?.() || []
    if (_voices.length) _subs.forEach(fn => { try { fn(_voices) } catch {} })
  } catch { _voices = [] }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refresh()
  window.speechSynthesis.onvoiceschanged = refresh
}

export function listVoices() {
  if (!_voices.length) refresh()
  return _voices
}
// subscribe to voice-list readiness; returns an unsubscribe fn
export function onVoices(fn) {
  _subs.add(fn)
  if (_voices.length) { try { fn(_voices) } catch {} }
  return () => _subs.delete(fn)
}

// Speak `text` (usually a phonetic respelling). Prefer an explicit
// voiceURI; else fall back to a bcp locale hint; else the browser default.
export function speakText(text, { voiceURI = '', bcp = 'en-GB', rate = 0.85 } = {}) {
  try {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(String(text || ''))
    const voices = listVoices()
    let v = voiceURI && voices.find(x => x.voiceURI === voiceURI)
    if (!v && bcp) v = voices.find(x => x.lang === bcp) || voices.find(x => x.lang?.startsWith(bcp.split('-')[0]))
    if (v) { u.voice = v; u.lang = v.lang } else { u.lang = bcp }
    u.rate = rate
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {}
}

// Turn a respelling like "kee-TLAL-lee" into something a voice reads more
// naturally (hyphens → spaces so syllables aren't run together).
export function speakableFromRespell(respelling, fallbackWord) {
  const r = String(respelling || '').trim()
  if (!r) return String(fallbackWord || '')
  return r.replace(/-/g, ' ').toLowerCase()
}
