# Compendium Fix — July 1, 2026

## What was broken
1. **Character corruption (mojibake)** in 5 files — ~200 instances. Every em dash,
   ellipsis, and UI glyph (✎ ✕ ⟲ ✦ ⚠ ◀ ▶ 🌳 🏠 …) was double-encoded and rendered
   as garbage like `â€”` and `âœŽ` on screen. Introduced in commit b895f0f
   (PR #15 "Pass 4B", Apr 27); the "Pass 4C mojibake cleanup" commit missed most of it.
2. **Phantom 45-file diff** — every file had been re-saved with Windows (CRLF) line
   endings + a hidden BOM, so git showed ~15,000 changed lines when the actual
   content was identical to the last commit. This is why it looked impossibly messy.
3. **Dead duplicate keys** in src/tabs/notes/stickyShared.js (normalizeSticky) —
   `size`, `sort_order`, `journal_sort_order` each defined twice. Harmless here
   (later values always won) but a lint error and a trap for future edits. Removed.

## Files actually changed (drop-in replacements)
- src/App.jsx
- src/tabs/SessionLog.jsx
- src/tabs/notes/JournalView.jsx
- src/tabs/notes/stickyShared.js
- src/tabs/OutfitSnapshot.jsx
- src/components/common/EntryPreviewModal.jsx
(All other files: content unchanged, only line endings normalized back to match the repo.)

## Verified
- `vite build` ✓ clean
- ESLint (no-undef, dupe keys, rules-of-hooks, etc.) ✓ 0 problems
- Corruption scan across src/, public/, index.html ✓ 0 matches
