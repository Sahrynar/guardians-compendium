# PATCH7M — Install Notes
Guardians of Lajen Compendium · Service Worker v38
Built 2026-07-29 · Base: PATCH7L (deployed)

The quick-win bundle from §B of the master ledger. Seven items, one deploy.
No database changes — the 2026-07-29 Supabase security pass was applied
separately and is already live.

---

## 1. WIKI — READ MODE (TD-001)

Wiki was **edit-only**: the only way to look at an article was to open the
editor, which is a poor place to simply read lore and an easy place to fat-finger
a change into 30,000 words of cosmology.

**Click any card** (or the new 📖 Read button) and the article opens as a page:
title, category, summary, and every content block rendered exactly as edit mode
renders them — text, tables, flowcharts, diagrams, images, callouts. ✎ Edit is
one click away, and Back returns to the list.

Arriving at a Wiki article **from search or a cross-link now lands in READ mode**
too, rather than dropping you straight into the editor — the same principle the
Dashboard preview popup already followed.

Implementation note: the block renderers were extracted into a shared
`BlockBody` component used by *both* the editor and the reader, so there is no
second copy to drift out of sync.

## 2. CHARACTERS — ZODIAC DROPDOWN (TD-003)

`Zodiac` was free text. It's now a proper dropdown of the 12 signs in calendar
order (Aries → Pisces), matching the locked Guardian birthday cycle.

**Nothing is lost.** Any existing value that isn't one of the 12 — a typo, an
import artefact, something you wrote deliberately — is preserved and shown at the
top of the list with a `·` marker, so you can see it and decide. This safety net
is in `EntryForm` itself, so it now protects **every** dropdown field
(Element, Deceased, Dies In, Has Wings), not just Zodiac.

## 3. CHARACTERS — READ-ONLY POP-OPEN (TD-004)

New 👁 button on every character card header. Opens the whole character on one
focused surface — images, colour swatches, every populated field, deceased
status, notes — **without expanding the card and with no editable control in
reach**. Click an image to send it to a draggable comparison panel as usual.
✎ Edit is on the modal if you want it.

## 4. FILTERS ON THE GENERIC TABS (TD-007)

World, Questions, Canon and Spellings now have the same ⊟ Filter popup the
Wiki/Glossary/Characters tabs have had.

Rather than hand-configuring four tabs, the filter facets are **derived from
each tab's own field definitions plus its actual data**:

- dropdown fields contribute their declared options (Questions → Priority)
- text fields contribute their distinct values, but only when there are between
  2 and 20 of them — enough to divide the list, few enough to read

So Questions gets Priority / Topic / Session Raised, World gets Subtopic, Canon
gets Session — and a field like Spellings' *Alternates*, which is near-unique
per row, correctly produces no facet instead of a wall of chips.

Within one facet the chips are OR'd; across facets they're AND'd. Any future tab
built on `GenericListTab` gets this free.

## 5. DASHBOARD — DEAD CODE SWEEP (TD-008)

Two real defects, both leftovers from the PATCH7I search removal:

- **A stray `)}` was rendering as literal text on the Dashboard.** The removal
  deleted a conditional block but left its closing fragment behind, and because
  JSX treats it as text rather than syntax, the build never complained.
- **The preview modal had two buttons that did exactly the same thing.**
  `openInTabForEdit` and `goToPreviewEntry` were byte-identical copies, wired to
  "✎ Edit" and "↗ Go to entry". Collapsed to one function, one button.

## 6. IMPORT COUNTER ON THE CONFLICT PATH (TD-053)

The clean import path counted `added + sessionLogAdded`. The **conflict** path
counted only `added` — so a bundle that both hit a conflict *and* imported
session-log rows under-reported what it had done, which is exactly the "0 added"
symptom. Now both paths sum the same way.

## 7. MANUSCRIPT — COVER IMAGE FALLBACK (TD-006)

A cover whose data URI is truncated or whose URL 404s left a broken-image icon
in the shelf. It now falls back to the same 📖 placeholder a coverless book gets.

---

## Verified already done — closed without code

Two ledger items turned out to be **already shipped**; their "absent" notes were
verified against PATCH7I and have since gone stale. No duplicate work was done.

- **TD-002** Notes read-only popup — live at `JournalView.jsx:234`. Card click
  opens `viewNote` with Close / ↗ Go to entry / ✎ Edit.
- **TD-005** Manuscript chapter editor persists on reload — the restore effect
  runs once `chapters` loads. The `useState` initializer that read the saved id
  and then returned `null` regardless was misleading dead code and has been
  replaced with a plain `useState(null)` plus a comment pointing at the effect.

## NOT in this patch (honestly)

- **TD-055** Forge concept-category dropdowns — needs the CATTAG category data
  wired into the picker UI; too big for a quick-win bundle.
- **TD-009** Tools "Character Age at Event" auto-pull — needs a live eyeball
  first to confirm whether it's genuinely manual-entry only.
- **TD-054** Glossary manual add/edit modal — still needs the ❓ live check.

## Files

- `src/tabs/Wiki.jsx` — BlockBody extraction, ArticleReader, read mode wiring
- `src/tabs/Characters.jsx` — 👁 read-only pop-open modal
- `src/tabs/Dashboard.jsx` — stray `)}` removed, duplicate handler collapsed
- `src/tabs/Manuscript.jsx` — cover onError fallback, dead initializer cleaned
- `src/components/common/GenericListTab.jsx` — auto-derived filter facets
- `src/components/common/EntryForm.jsx` — preserve out-of-list select values
- `src/constants.js` — `ZODIAC_SIGNS`, `sign` field → dropdown
- `src/App.jsx` — conflict-path import counter
- `public/sw.js` — v37 → v38

## Verification

✓ 130 modules transformed, **0 errors, 0 warnings** (`npm run build`).

⚠️ The 840/322/445/899 regression tracker was **not** reproduced — its definition
doesn't exist anywhere in the repo, and none of the obvious candidate counts
match those numbers. Rather than print four numbers I can't stand behind, this
is flagged. If you can tell me what those four count, I'll add the check.

## Deploy

Both backups (IOBar ⬆ Export JSON + GitHub Download ZIP) → swap `src` + `public`
→ push → Netlify green → Ctrl-Shift-R.

## Smoke test

- **Wiki:** click a card → article reads as a page, blocks render · 📖 Read and
  ✎ Edit both work · Back returns to the list
- **Characters:** 👁 on a card opens the read-only view without expanding ·
  open a character with an odd existing Zodiac value → it's still there, marked `·`
- **World / Questions / Canon / Spellings:** ⊟ Filter appears; picking two
  priorities widens, adding a topic narrows
- **Dashboard:** no stray `)}` text near the top · preview modal has one Edit button
- **Manuscript:** book shelf shows 📖 rather than a broken image for a bad cover
- **Inventory:** upload an image — this is the smoke test for the 2026-07-29
  storage-policy fix, still outstanding from that pass
