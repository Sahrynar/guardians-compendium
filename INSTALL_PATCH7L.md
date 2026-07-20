# PATCH7L — Install Notes
Guardians of Lajen Compendium · Service Worker v37
Built 2026-07-15 · Base: PATCH7K (deployed)

The Characters overhaul + four backlog items. One deploy.

## 1. CHARACTERS — image system rehaul (TD-071 core)

**Tagged slots, unlimited images.** The old portrait+reference pair is
replaced by a gallery of labeled cards — "Age 12", "Her sword", anything
you type. Add as many as you want per character.
- **Rainbow in spectrum order**: slot borders + labels cycle the locked
  18-color rainbow, first slot pink, onward through the spectrum. Black
  card backgrounds.
- **Per-slot sizing**: every slot has an S/M/L button — Lila-at-16 big,
  Lila-at-9 small, the sword smaller. Saved per image.
- **Add via 📎 Upload or 🖼 Library** — the Library picker now works for
  ALL image adds (TD-052 closed: no more file-explorer-only Reference).
- **Labels**: ✎ renames inline. ✕ removes (image stays in Library).
- **Portrait slot** is special: always shows your PortraitTool art, 🎨
  edits it, can't be deleted here (that stays PortraitTool's job).
- **Migration is non-destructive**: old portrait_canvas / reference_image
  fields are left in place. Reference appears as a normal "Reference"
  slot; the first time you change a character's gallery it starts saving
  to the new format.

**Draggable comparison lightboxes.** Click any image (slot or card
thumbnail) → a floating panel opens. Panels are DRAGGABLE (grab the
title bar), you can open SEVERAL AT ONCE — different ages side by side,
or different PEOPLE (open Lila's, collapse her card, open Martyn's —
panels stay). ⤢ toggles big/small, ✕ closes, click brings to front.
Panels close when you leave the Characters tab.

**Card thumbnails fixed (TD-051):** the list now shows each character's
first image — custom uploads and references included, not just canvas
portraits.

**Sort dropdown (new):** A→Z / Z→A / Newest / Oldest, next to the
Alive/† filter. (The A–Z jump bar was already there; this is actual
ordering.)

## 2. MANUSCRIPT — 🗑 Delete Chapter (TD-069)
New 🗑 in the editor toolbar (after ⤵). Full confirm shows title + word
count, warns it's permanent, then deletes and renumbers later chapters
−1 (mirrors merge's logic). Chapters are no longer forever.

## 3. IMPORT ERRORS SURFACE (TD-070)
Session-log import failures now fire the red cloud-error toast with the
REAL error message and get counted — a rejected import can never again
masquerade as "✓ 0 new entries added". (This is the fix for the silent
400s that ate the first session-log swap attempt.)

## 4. IMAGE LIBRARY DEDUPE (TD-050)
Library previously deduped per-entry, so the same image used on two
entries showed twice. Now dedupes by image content — one copy, ever.

## 5. BANNER STYLE PICKER (TD-068)
New 🖼 corner button on the banner cycles: **Classic** (your painted
banner — still the DEFAULT, untouched, never overwritten) → **Night
Sky** (silver moon phases, gold sun, 3,370 stars, rainbow shooting
stars in spectrum order, constellation tracing) → **Night Sky + World
Tree** (procedural tree with rainbow lanterns). Choice saved to
settings, syncs across devices.

## NOT in this patch (honestly)
- TD-053 App conflict-path import counter (untouched)
- TD-055 Forge concept-category dropdowns
- Slot drag-REORDER within the grid (panels cover comparison; reorder
  can come later if wanted)

## Files
- NEW src/components/common/CharacterGallery.jsx
- NEW src/components/common/NightSkyBanner.jsx
- src/tabs/Characters.jsx (gallery, panels, thumbnails, sort)
- src/tabs/Manuscript.jsx (delete)
- src/hooks/useDB.js (import error surfacing)
- src/components/common/LibraryPicker.jsx (content dedupe)
- src/App.jsx (banner picker)
- public/sw.js v36 → v37

## Verification
✓ 130 modules (2 new), 0 errors, 0 warnings · regression 840/322/445/899

## Deploy
Both backups → swap src+public → push → Netlify green → Ctrl-Shift-R.

## Smoke test
- Open a character: old portrait+reference appear as rainbow slots
- Add an image via 🖼 Library and via 📎; label it; S/M/L it; ✕ it
- Click two images (two characters) → drag both panels side by side
- Sort dropdown reorders; card thumbnails show for reference-only chars
- Manuscript: 🗑 a junk chapter → confirm → numbering heals
- Banner 🖼: classic → sky → sky+tree → classic
