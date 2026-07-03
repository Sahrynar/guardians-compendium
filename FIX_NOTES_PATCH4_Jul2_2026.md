# PATCH 4 — Deploys A′ + B combined (July 2, 2026)
Everything from Rebuild Spec v1 EXCEPT the Language Workshop (waits on your phonology picks).

## Tools
- SCOTS LADDER: four cumulative levels — L1 Trace (Elizabeth's default; canon: not raised in
  Scotland, accent from Silvia) · L2 Light · L3 Medium (Silvia's default) · L4 Broad.
  Pick any combination; one output card per level with copy; rules reference grouped by level.
- CROSSED-WORLD: preset chips for the full cohort — Rose, Lila, Martyn, Maitland (no crossing),
  Thomas, Sandra, Faith, Hope, Silvia, Elizabeth. Fill a person's dates once, hit 💾 Save,
  they reload on click forever. Output now labeled PERCEIVED lifetime (canon-locked Jul 2).
- BACKFILL v2: birthdays are now AUTOMATIC — saving any character with a real Lajen birthday
  creates its timeline entry by itself. The tool's button = one-time sweep of all existing
  characters, with an honest report of everything it couldn't place (e.g. "pending_math"
  placeholders — that's why Aenya was skipped before; the data was a placeholder, not a bug).
- IMAGE LIBRARY v2: scans EVERY field of EVERY entry in EVERY category — portraits, maps,
  item images, anything image-like — automatically, live. ➕ Add image uploads straight to
  the Library. Click any image for a full preview. (The "pick from Library elsewhere"
  integration is the deferred half — next pass.)

## Timeline — option C, as you chose
- Ancient section COLLAPSIBLE (▸ Ancient (n) chip next to Range) — collapsed by default,
  so your 1–320 working view is now just the default view with no range tricks needed.
- Events with no sort# are PARKED off-track with a ⚠ "n unplaced" counter (hover lists them)
  instead of silently piling up at zero — the stretch-line bug is dead.
- Era-marker labels stagger vertically — no more overlapping garble at shared edges.

## Session Bundle importer — the automation you asked for
- New 📥 Session Bundle button in the IOBar: feed it a session-minutes .md that contains a
  ```json block, and it imports the log AND auto-populates every category from it in one go.
  All my minutes files now ship in that format.

## Housekeeping
- Auto-birthday hook lives in the core save path (automatic-with-manual-override, per your principle).
- IOBar's own import counter now counts by ID (robust). NOTE: the "0 added" message you saw
  comes from the conflict-modal path in App.jsx — still on the list.
- Glossary A–Z bar is now STICKY at the top while scrolling. (Sizing chips + manual add/edit
  modal: deferred to next pass with the Workshop.)
- Service worker → v23.

## Verified
vite build ✓ · ESLint 0 problems ✓ · unicode scan 0 ✓
(One build error caught & fixed pre-ship: duplicate import from my own edit.)
