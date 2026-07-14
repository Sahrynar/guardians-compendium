# PATCH7I — Install Notes
Guardians of Lajen Compendium · Service Worker v34
Built 2026-07-13 · Base: PATCH7H FINAL (v33, deployed)

## What changed (11 items)

**1. Scoped global search now lives in the nav bar — on every tab.**
The plain nav search box is gone. In its place: the scope dropdown
("Global (everything)" + 13 category scopes) and search input, moved up
from the Dashboard. It does BOTH jobs: typing still live-filters the
current tab exactly as before, AND a results dropdown offers cross-tab
jumps (click a result → opens that entry in its tab). Enter jumps to
the first result. Esc clears. **Ctrl+K focuses the search from
anywhere.** The Dashboard's own search block is removed.

**2. Manuscript paragraphs finally read like paragraphs.** Root cause:
an inline style deliberately zeroed all paragraph margins in
preview/read views. Now ~0.9em spacing between paragraphs in BOTH
views, indent toggle unchanged.

**3. Manuscript find → full find/replace.** The find bar (which was
built but had NO way to open it — dead UI) is now reachable: 🔍 button
in the toolbar, **Ctrl+F** opens it, **Esc** closes. Match count,
Replace (first match), Replace All. Case-insensitive matching. Replaces
happen in the chapter text exactly as if you'd typed them — nothing
saves until the normal save path runs.

**4. Reading-time estimate** next to the word count in the chapter
toolbar (~250 wpm).

**5. Fuzzy matching in the Forge concept picker.** Typing "hapiness"
now finds happiness (longest-common-substring, same engine as Reverse
Lookup; kicks in from 3+ letters). Meaning-text matching kept.

**6. Flags tab: the missing sort selector.** Sort logic existed but no
UI ever exposed it — flags were stuck on newest-first. New selector:
Newest / Oldest / A→Z / Z→A / By priority.

**7. Z→A sort options added** to GenericListTab (covers Spellings,
World, Canon, Questions) and Inventory. Locations already had it.

**8. Alphabet jump bars added to Wiki and Flags**, sticky below the
nav like the existing ones (Glossary, Characters, Locations, Spellings,
World, Canon, Questions).

**9. FamilyTree relation modal recolored** from the old amber to the
tab's rainbow color (Pass-4C leftover). Person modal was already
correct; the two red danger modals stay red on purpose.

**10. A−/A+ scope-check: PASSED, no changes needed** — zero hardcoded
px font sizes remain anywhere in tabs/components.

**11. Tab counts removed from the nav strip.** The "(46)" style entry
counts beside each tab name are gone — tabs now show just icon + name.
The count helper and its now-unused import were removed with it (no
dead code left). Nothing else used those counts.

## Deliberately NOT included (honest scope calls)
- FamilyTree jump bar — it's a positioned 2D relationship web, not a
  scrollable list; a letter bar there would be fake.
- Inventory jump bar — grouped-by-category/holder layout fights
  letter-jumping. It got the Z→A sort instead.
- Wiki width control — already existed (XS–XL), nothing to do.
- session_log update-on-import + _enriched dedupe — data-destructive
  potential; needs its own careful pass with a fresh backup.

## Files modified
- src/components/common/GlobalSearch.jsx — NEW
- src/App.jsx · src/tabs/Dashboard.jsx — search relocation
- src/tabs/Manuscript.jsx — paragraphs, find/replace, reading time
- src/components/SemanticForge.jsx — fuzzy concept picker
- src/components/common/GenericListTab.jsx · src/tabs/Inventory.jsx —
  Z→A
- src/tabs/Flags.jsx — sort selector, Z→A, jump bar
- src/tabs/Wiki.jsx — jump bar
- src/tabs/FamilyTree.jsx — relation modal color
- src/App.jsx — tab counts removed from nav
- public/sw.js — v33 → v34

## Verification
- npm run build → ✓ 128 modules, zero errors, zero warnings
- Regression tracker exact: 840 / 322 / 445 / 899
- First build attempt failed on a duplicate import in Flags.jsx
  (my error); caught by verification, fixed, rebuilt clean.

## Deploy
1. **Back up first — both:** IOBar Export JSON + GitHub Download ZIP
2. Delete local `src` + `public` → copy in these → commit/push
3. Netlify green → Ctrl-Shift-R (unregister SW if stale)

## Smoke test
- Nav: scope dropdown present on every tab; type → current tab filters
  AND dropdown shows jump results; click one → lands on the entry;
  Ctrl+K focuses; Esc clears
- Manuscript: open a chapter in preview/read → real paragraph spacing;
  Ctrl+F → find/replace bar; **test Replace on a junk word first**;
  reading-time shows next to word count
- Forge: concept search "hapiness" → happiness appears
- Flags: new sort selector works; jump bar sticks while scrolling
- Wiki: jump bar sticks; letters jump-and-flash the right article
- Spellings/World/Canon/Questions/Inventory: Z→A present and works
- FamilyTree: open Add/Edit Relation → modal accent matches the tab
