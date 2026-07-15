# PATCH7K — Install Notes
Guardians of Lajen Compendium · Service Worker v36
Built 2026-07-14 · Base: PATCH7I (deployed)

⚠ **SUPERSEDES the un-deployed PATCH7J zip — discard that one, deploy
this.** (If you already deployed 7J, this deploys cleanly over it.)
Contains 7J's three bug fixes PLUS the Manuscript pro-editor.

## Carried from PATCH7J (3 fixes)
1. **Manuscript indent bug** — only the first paragraph was indenting in
   preview/read; indent now lives on each paragraph. Every paragraph
   indents (or none with Indent OFF). Edit view untouched.
2. **Manuscript Ctrl+F dead** — two competing handlers cancelled each
   other; duplicate removed. Ctrl+F opens find/replace, Esc closes.
3. **Locations A–Z jump dead in Tree view** — now auto-expands the
   target's parent chain, then scrolls + flashes.

## New: Manuscript PRO-EDITOR (TD-029 core)

**4. Real undo/redo.** Toolbar ↶ ↷ buttons + **Ctrl+Z / Ctrl+Y**
(Ctrl+Shift+Z also redoes). One history covers EVERYTHING that changes
chapter text: typing (grouped into ~0.7s bursts), FormatBar buttons,
Replace, and Replace All — each replace is one clean undo step. Up to
200 steps per chapter. History is per-chapter and per-visit: switching
chapters or closing the editor clears it. Undo does NOT auto-save —
Save persists whatever you've undone/redone to.

**5. Split chapter at cursor (✂).** In ✎ Edit or ⧉ Split view, click
where the new chapter should begin, press ✂. Confirm shows the word
split. Current chapter keeps the first half; a new chapter titled
"<title> — Part 2" (rename any time) takes the rest, inserted as the
next chapter number; all following chapters in that book renumber +1
automatically.

**6. Merge next chapter (⤵).** Appends the NEXT chapter's text into
this one after a *** scene break (visible seam — delete it if you want
continuous prose), then deletes that chapter and renumbers later ones
−1. The confirm spells all of this out; back up first if unsure.

## Files modified
- src/tabs/Manuscript.jsx — indent fix, Ctrl+F fix, undo/redo engine,
  split/merge (editor + parent handlers)
- src/tabs/Locations.jsx — tree-view jump fix
- public/sw.js — v34 → v36 (v35 never shipped)

## Verification
- npm run build → ✓ 128 modules, zero errors, zero warnings
- Regression tracker exact: 840 / 322 / 445 / 899

## Deploy
Both backups (IOBar Export + GitHub ZIP) → swap src+public → push →
Netlify green → Ctrl-Shift-R.

## Smoke test (adds to the parked checklist)
- Read view: ALL paragraphs indented; Indent toggle flips all
- Ctrl+F: bar opens; Replace on a junk word; Ctrl+Z undoes the replace
- Type a burst → Ctrl+Z removes the burst; Ctrl+Y restores; ↶↷ grey
  out when empty
- ✂ on a test chapter: halves correct, "— Part 2" appears next,
  following chapters renumbered
- ⤵ on the test pair: text rejoined around ***, extra chapter gone,
  numbering healed
- Locations tree: A–Z letter jumps to nested location
