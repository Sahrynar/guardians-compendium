# PATCH7B — Reverse tool · free-text · voice picker · Ix' fix · data-driven languages

**One deploy.** Build-verified (`vite build` clean, 128 modules). Built on top of deployed PATCH7A.

## BEFORE you install (standing backup rule — both)
1. IOBar ⬆ **Export** → save the full Supabase JSON backup.
2. GitHub **Code → Download ZIP** → code-state backup.

## Files (3 new, 5 patched) — drop into the repo, same paths
NEW:
- `src/data/langRegistry.js` — data-driven language registry (labels, TTS locales, respell rules) + affix pronunciation layer
- `src/utils/speech.js` — voice enumeration + speak-with-chosen-voice
- `src/components/ReverseLookup.jsx` — the reverse/translator tool

PATCHED:
- `src/utils/nameForge.js` — registry-driven respell/TTS + affix layer (Ix' fix)
- `src/components/SemanticForge.jsx` — registry labels, **word-level merge**, data-driven language sliders, voice picker, free-text input
- `src/components/LexiconBucket.jsx` — uses the chosen voice
- `src/tabs/Tools.jsx` — mounts the Reverse Lookup sub-tab
- `public/sw.js` — cache **v26 → v27**

Then: `git add -A && commit && push` → one Netlify deploy. Hard-refresh once (v27) to clear the old cache.

## What changed, plainly
- **Ix' now pronounces "eesh"** regardless of the spine language (affixes get their own pronunciation layer, separate from root sound-rules). Proven: old code said "eeks" over a Latin spine; now "eesh".
- **🔊 speaks the phonetic respelling** (not the raw forged letters), read by **any voice you pick** in the new voice dropdown. This is what fixes the weird/"M" sound you heard — the browser was guessing at the raw word before. All 72 languages are voiceable this way (approximate, not native — as agreed).
- **Type any word** in the Forge: real roots if it's in the lexicon, honest **sound-only** fallback (clearly flagged "no real translation behind this") if not. Chip picker stays.
- **Reverse Lookup** (Tools → 🔎): a saved word shows its exact recipe (certain); anything else gets flagged best-guess roots, with affixes listed separately from meaning-roots. Never writes canon.
- **62 added languages now supported** with zero further code: any language key imports and works (prettified label, en-GB voice via your chosen voice, base respell). Registry entries just make specific ones nicer.

## IMPORT SAFETY — resolved
The runtime merge is now **word-level**, so importing your added-columns master (the 62-lang patch) via 📥 **no longer strips the original 10** from existing concepts — it patches onto them. Structurally safe to import once QA'd. (Tag-honesty QA still recommended before bulk import; that's a content check, not a code one.)

## Regression tracker — verified intact
SessionLog Activity sub-tab, Journal sticky board, Scenes wrapped timeline, Quick Capture — all in files this patch does NOT touch. Untouched = intact.
