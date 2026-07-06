# PATCH7A — Semantic Word Forge + Lexicon Bucket
**Build date:** 2026-07-04 · **Verified against:** live GitHub main (cloned same day) · **Vite production build: PASSED ✓**

## What this is
The semantic Language Workshop redesign, complete and wired. One deploy covers everything.
(Note on numbering: **PATCH6 — the phonetic workshop — is already live** in your deployed app; I verified it in the repo. Nothing from 6 is missing or needs re-shipping. This zip is the complete new set.)

**New tool:** Tools → ✨ **Word Forge (Semantic)** — starts from real words that *mean* your concept (90 concepts × 10 languages bundled, zero blanks), blends by weight, reshapes via soft↔hard slider + optional 44-palette conformance, optional affixes (Ix' / Ah / -iel / -riel / -ah / custom), deterministic seeds (Load settings reproduces any word exactly), history, 🔊 TTS in the spine language's closest voice, IPA toggle.
**New Journal sub-tab:** Notes → 🗣 **Lexicon** — every saved word with derivation + recipe; filter/sort/edit inline; select a word to hear it; "Load settings in Forge" round-trip; Delete (confirm-gated).
**Old workshop:** kept, relabeled **Language Workshop (Phonetic)** — the fallback, untouched.
**Storage:** saved words = `lexicon_saved` entries; imported concepts = `lexicon_seeds` entries. Both ride the existing single-table system — automatically included in backups, exports, and activity log. **No Supabase changes, no SQL, no RLS work needed for this patch.**

## Files in this zip (paths mirror the repo)
NEW — add:
- `src/data/lajenLexicon.js` — merged seed lexicon (batches 1–4 + 5A corrected)
- `src/utils/nameForge.js` — the engine (deterministic; node-tested)
- `src/components/SemanticForge.jsx` — the Forge tool UI
- `src/components/LexiconBucket.jsx` — the Journal sub-tab

PATCHED — overwrite (surgical edits only; everything else in them is byte-identical to live):
- `src/hooks/useDB.js` — +2 categories in the whitelist
- `src/tabs/Tools.jsx` — exports PALETTES/PAL_BY_ID, registers the new tool, relabels old one
- `src/tabs/Journal.jsx` — additive sub-tab bar (Board stays the default view; sticky board untouched — verified)
- `public/sw.js` — cache v25 → **v26**

EXTRAS (don't deploy): `extras/engine.test.mjs` — rerunnable engine test suite.

⚠ **Use the files from THIS zip**, not the loose .jsx files from earlier in the chat — those two are the same components but only this zip has the wiring around them.

## Install (one deploy)
1. **BACKUPS FIRST — both, mandatory:** IOBar ⬆ Export (fresh JSON) **and** GitHub → Code → Download ZIP.
2. Copy the 8 files into `C:\Users\melis\GitHub\guardians-compendium\` at the paths above (4 new, 4 overwrite).
3. GitHub Desktop → commit `PATCH7A: semantic word forge + lexicon bucket` → Push. Netlify deploys once.
4. After deploy: close ALL Compendium tabs, reopen, hard-refresh (Ctrl+Shift+R). The v26 service worker may need one extra reload to swap caches.

## Smoke test (~3 min)
1. Tools → ✨ Word Forge → default is star/Nahuatl+Latin → Forge → results with derivations appear.
2. 🔊 on a result speaks (Mexican-Spanish proxy voice for Nahuatl spine).
3. Toggle affixes → Ix' → Forge → Ix'-prefixed, capital-after-apostrophe words.
4. 💾 Save one → Notes tab → 🗣 Lexicon → it's there; click it → it speaks; edit a field → sticks after refresh.
5. "↺ Load settings in Forge" from the bucket → open Tools → Forge controls snap to the recipe.
6. Language Workshop (Phonetic) still generates.
7. **Regression:** Journal 📌 Board sticky board · Quick Capture button · SessionLog Activity sub-tab · Scenes wrapped timeline — all present.

## Aster's JSON files — import path (IMPORTANT)
**Not the IOBar.** The IOBar importer expects full backup/entries JSON — batch files would fail or mis-import there.
- Batches **1–4 + 5A are already bundled** in this patch. Do **not** re-import them.
- Future batches (**5B–5H**, and the guess-audit patch when it returns): open ✨ Word Forge → **📥 Import concept batch** → paste the batch JSON → Import. Concepts land in `lexicon_seeds` instantly — **zero deploys**, and they're covered by normal backups. (Have me QA each Aster batch before importing, per the standing workflow.)

## Known rough edges (v1, tune-by-ear zone — expected per spec §12)
- Reshape occasionally yields awkward doubles (*stt*, *tll*) at some seeds — skip those candidates; tightening the cluster guard is a later pass.
- Respelling + IPA are heuristics; the bucket's pronunciation field is editable for exactly this reason.
- Voice quality depends on installed system voices; proxies are marked with tooltips and upgrade automatically if you install more voices.

## Rollback
GitHub Desktop → History → right-click the PATCH7A commit → Revert → Push. One deploy back to current state. Data is untouched either way (saved words/seeds are just entries rows).
