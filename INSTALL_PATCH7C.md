# PATCH7C — Forge organization, presets, custom words, tool reorder/rainbow

Build-verified (vite build clean, 128 modules). Full src + public — replace
wholesale (delete old `src` and `public`, drop these in) to avoid any dropped-file
issue like last time.

## Back up first
IOBar ⬆ Export (Supabase JSON) + GitHub → Download ZIP.

## Deploy (GitHub Desktop)
1. Delete the repo's `src` and `public` folders.
2. Copy in the `src` and `public` from this zip.
3. Commit → Push → wait for Netlify to go **green** → Ctrl-Shift-R (cache is v29).

## What's new

**Where saved words live (FIXED):** the Lexicon bucket was orphaned — it lived in a
legacy file that isn't your Notes tab. It's now a real **4th sub-tab under Notes:
🗣 Lexicon**. Forged words you Save, and custom words you add, show up there.

**Word Forge — organization:**
- Languages show **only the ones you've turned on**; add more from the **＋ add a
  language** picker. Each active language has a remove (✕). No more 72-slider wall.
- **↺ Reset** — clears concepts, languages, and settings to defaults.
- **🎲 Re-roll** — same settings, a fresh set of words.
- **Presets** — save a weight+palette+settings combo under a name ("Ix'Citlatl
  blend"), reload in one click, delete when done.
- **cols 1/2/3** — lay results out in 1, 2, or 3 columns.
- **⚠ exists** badge on a result whose name is already in your Lexicon or Glossary.
- **Multi-select save** — tick results, "Save N selected" at once.
- **Concepts**: "show selected only" toggle, a **clear** button (no more accidental
  deselects), and a bigger scroll box.
- **History** is collapsible with a clear button.

**＋ Add custom word:** enter a word you already have (e.g. Ix'Citlatl) with
pronunciation + meaning + language/form. Saves to the Lexicon bucket, and — if you
tick "also add to Glossary" — creates a Glossary entry too.

**kitl fix carried forward**, plus **c/k → k** matcher preference (from 7B).

**Tools tab:** reordered to Date & Time → Unit Converter → Reverse Lookup → Word
Forge → Language Workshop → Pronunciation Helper → Ix'Citlatl Converter → Scots
Dialogue → Birthday Backfill → Image Library, and recoloured **top-to-bottom across
the rainbow** (pink → violet). These intentionally don't match the nav tabs.

## Regression check
SessionLog Activity sub-tab, Journal sticky board, Scenes timeline, Quick Capture —
all in files this patch doesn't touch. Intact.

## Deferred (your "later" list)
- Concept **category dropdowns** — needs concepts to be categorized first (see the
  Aster instruction I gave you).
- Pronunciation Helper reading the "private" name under Ix'Citlatl.
- Per-language voices, XS–XL density.
