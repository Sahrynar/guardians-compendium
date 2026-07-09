# For Aster — how to format language/concept batches so they plug straight in

The engine is now **data-driven**. Your job is pure data: produce batch JSON in
the shape below. New languages need **no code** — they import and work.

## Batch JSON shape (goes into the Forge's 📥 "Import concept batch" box)
```json
{
  "meta": { "batch": "CL6" },
  "concepts": {
    "star": {
      "meaning": "a star in the night sky",
      "words": {
        "old_norse": { "w": "stjarna", "tag": "attested", "note": "optional source note" },
        "german":    { "w": "Stern",    "tag": "attested" }
      }
    }
  }
}
```

## Rules
- **concept key**: lowercase_snake_case. Reuse an EXISTING key to add languages to
  that concept (words merge — the original 10 are preserved). Use a NEW key to add
  a brand-new concept.
- **language key**: lowercase_snake_case (e.g. `old_norse`, `kiche_maya`,
  `german`). ANY key is accepted. Unknown languages auto-get a prettified label,
  a default voice, and base pronunciation — no code change.
- **tag**: one of `attested` | `near` | `approx` | `guessed`. Be honest — the whole
  tool leans on these. Modern languages should be mostly `attested` (real dicts).
- **note**: optional; source/caveat. Kept, shown on hover.

## What Melissa actually wants next (targets for your batches)
1. **Modern equivalents** of the old/classical columns — these are the easy, mostly-
   `attested` ones: e.g. `german`, `dutch`, `modern_greek`, `mandarin` (or
   `cantonese`), `modern_korean`, `modern_irish`, `modern_armenian`,
   `modern_georgian`, `modern_mongolian`, `modern_tibetan`, `modern_nubian`.
2. **A curated Mesoamerican set** (NOT "all" — pick the ~10-15 that matter): beyond
   the 8 already added, candidates include huastec, tzotzil, tzeltal, chol, mam,
   kaqchikel, huave, etc. Melissa will prune.
3. Any **country-connected** gaps she names (e.g. Hebrew / Imperial Aramaic for
   Hafari if she wants them alongside Syriac).

## Do NOT
- Re-import batches **1–4 + 5A** — already bundled in the base lexicon.
- Fake `attested` on unsourced cells — leave them `guessed`/`near` honestly.

## Making a new language "nicer" (optional, Claude does this, not Aster)
Send Claude: the language key + display label + a modern locale to voice it (e.g.
`de-DE`) + any spelling→sound rules (e.g. `x → sh`). Claude adds one line to
`langRegistry.js`. Still no logic change — pure data.
