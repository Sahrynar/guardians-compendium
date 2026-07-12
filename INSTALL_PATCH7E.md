# PATCH7E — robust large-import, Ideas rainbow, A–Z sticky, Glossary width

Full src + public (replace wholesale). Build-verified (128 modules). Cache v31.

## Back up → deploy (GitHub Desktop)
1. IOBar ⬆ Export + GitHub → Download ZIP.
2. Delete the repo's `src` and `public`; copy in these; Commit → Push → green → Ctrl-Shift-R.

## What's in it
1. **Robust large-import + multi-file (the fix for the 417→109 loss):**
   - The big lexicon is kept OUT of the ~5 MB local storage (it re-loads from the
     cloud), so it can't overflow and corrupt the mirror.
   - Imports now write to the cloud in **reliable awaited chunks** (~15 concepts
     each) instead of hundreds of fire-and-forget writes — so every concept sticks.
     The message reports if any chunk failed so you can retry.
   - **Load from file(s)** now takes **multiple files at once**.
   - **AFTER deploying: re-import your CATTAG file** (417 concepts, 128 languages,
     all categorized) via 📁 Load from file(s). Verified: parses to 417 clean,
     categorized entries. This restores everything in one go — skip the 15 small files.
2. **Ideas buckets** (Names/Words/Phrases) now use the rainbow spread.
3. **A–Z jump bar freezes** at the top: it was sticky but hidden behind the sticky
   nav; it now parks just below the nav (measured live, so it's correct on mobile
   too). Works on Characters, Glossary, Locations, and all generic list tabs.
4. **Glossary width cap** — the XS–XL control now also limits row width so long
   definitions stop stretching edge-to-edge.

## Deferred to the NEXT chip (flagged — they each sprawl across ~8-10 tabs)
- **Global search unification** (remove the redundant per-tab box) — the nav search
  already drives most tabs; cleanly removing the second box spans many differently-
  built tabs + the sub-tab searches aren't nav-driven. Its own chip.
- **Font sizing to every tab** — needs per-tab px hunting. Its own chip.
- **Wiki A–Z bar** — Wiki is a custom tab without the bar; adding it needs scroll
  targets. Small follow-up.
- **Width control on the remaining sprawling tabs** (generic list tabs) — next.

## Regression check
SessionLog, Journal sticky board, Scenes timeline, Quick Capture — untouched.
