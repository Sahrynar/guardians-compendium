# PATCH 3 — "The Big Build" (July 2, 2026)
One deploy. Eleven files. Everything below in a single push.

## Tools tab — full rewrite to the recovered Session 10/12 spec
- ONE unified Date & Time tool: bidirectional Lajen↔Mnaerah converter (full month/day/year
  both calendars, month card shows Guardian/Incarnate/season), Time Elapsed (mix calendars,
  fuzzy dates → flagged approximate), Crossed-World Lifetime (unlimited crossings; shows
  local years per side; biological-aging interpretation flagged as OPEN canon), Age at Event
  (says exactly WHY when it can't calculate).
- Ix'Citlatl Converter: all 12 systems as toggle chips, collapsed one-line results that
  expand to the full table, 🔊 per row, history persisted. Canon names (Ahilion, Ixelaoien)
  shown as a 📌 badge while the table shows raw system output — both truths kept.
- Pronunciation Helper: three tabs (Ix'Citlatl systems / Lajen languages with ⚠ on
  unconfirmed phonologies / real-world multi-select). External translation API removed.
- Scots Dialogue: Silvia (educated Edinburgh) and Elizabeth (broader rural) with independent
  toggles, copy buttons, expandable rules reference. Honest note: drafting aid, not dialect engine.
- Image Library + Birthday Backfill preserved verbatim (they worked). Simple Unit Converter kept.

## Eras — consolidated and PERMANENT
- ONE ErasView (Calendar ▸ Eras). Duplicate implementation deleted.
- Era rows/spans now live in the DATABASE like every other entry — add/edit/DELETE all work.
- First load auto-migrates anything recoverable from the old settings blobs.

## Timeline
- Era markers are now anchored to EVENTS (pick first + last event the era covers) — the
  band follows the events, the rainbow line reaches every era, no more coordinate mismatch.
- Old settings-based markers auto-migrate on first load (your vanished eras may reappear).

## Everything else
- constants.js: month 5 = **Sachaluna** (canon lock, Jul 1).
- Glossary tab counter now counts the real glossary set (was hardwired to an empty category).
- Dashboard TOTAL now counts every category (was 840 vs true 956).
- Ideas: single write path through the database everywhere; one-time merge pulls in any
  rows from the standalone table. The silent-loss era is over.
- Service worker → v22.

## Verified
vite build ✓ · ESLint 0 problems ✓ · wide-net unicode scan 0 ✓
