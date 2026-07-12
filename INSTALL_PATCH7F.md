# PATCH7F — Install Notes
Guardians Compendium · 2026-07-11 · SW cache v32 · now includes the login gate

## What changed

**1. Font-size buttons (A− / A+) now scale everything.**
The tabs were already `em`-based; the actual offenders were four shared
components used across every tab that had hardcoded pixel sizes. All
converted to `em` at the app's standard ÷13 ratios, so defaults look
pixel-identical and now scale with the nav buttons. Root rule extended to
`html, body, #root { font-size: var(--fs, 13px); }` (fallback matches the
app's real default of 13px, not the brief's assumed 16px — the fallback
never fires in practice since `--fs` is always defined).
Manuscript's separate `--ms-font` scale: untouched, per brief.

**2. Global search unification — one search box.**
Redundant per-tab search inputs removed; the nav Search box now drives
these tabs via the existing `navSearch` sync (which was kept):
Characters, Glossary, Locations, Wiki, Scenes, and — via the shared
GenericListTab — Canon, Questions, Spellings, World. Scenes lacked a
sync effect, so one line was added (same pattern as the other tabs);
its diff vs PATCH7E is exactly 3 lines and the wrapped timeline is
byte-identical. Scenes is now 445 lines.
Flags, Inventory, Timeline never received `navSearch`, so their local
search was left alone per brief rule 4. Purpose-specific searches
(Forge concept picker, sub-tab searches, etc.) untouched.

**3. Login gate (RLS prep).**
New `src/components/LoginGate.jsx`, wired in `main.jsx` around `<App/>`.
When Supabase is configured, nothing mounts (no DB reads) until you sign
in; session persists per device with auto-refreshing tokens. If Supabase
env vars are absent, the gate passes through — localStorage-only mode is
unchanged. No logout button in v1 (deliberate; see SUPABASE_RLS_STEPS.md).
⚠️ Create your auth user (Part A of SUPABASE_RLS_STEPS.md) BEFORE
deploying, or the sign-in screen will have no valid account.

## Files modified (14)

- `src/styles/globals.css` — root font rule + `--fs-xs: 0.77em` defined (was undefined; the 13 labels using it now render at their intended small size and scale)
- `src/components/common/IOBar.jsx` — 8 px→em conversions
- `src/components/common/ImagePicker.jsx` — 10 px→em conversions
- `src/components/common/EntryForm.jsx` — 2 px→em conversions
- `src/components/common/Lightbox.jsx` — 1 px→em conversion
- `src/components/common/GenericListTab.jsx` — local search input removed
- `src/tabs/Characters.jsx` — local search input removed
- `src/tabs/Glossary.jsx` — local search input removed
- `src/tabs/Locations.jsx` — local search input removed
- `src/tabs/Wiki.jsx` — local search input removed
- `src/tabs/Scenes.jsx` — local search input removed, navSearch sync added
- `public/sw.js` — cache bump v31 → v32, header → PATCH7F
- `src/components/LoginGate.jsx` — NEW: auth gate
- `src/main.jsx` — wraps App in LoginGate

Regression-locked files verified byte-identical to PATCH7E:
SessionLog.jsx (840) · notes/JournalView.jsx (322) ·
notes/StickiesView.jsx (899). Scenes.jsx edited per Melissa's
2026-07-11 instruction (3-line diff, timeline intact). Also untouched: useDB.js, SemanticForge.jsx,
ReverseLookup.jsx, langRegistry.js, speech.js, nameForge.js.

## Flags for Melissa

- `src/globals.css` (468 lines) is a stale duplicate — the app imports
  `src/styles/globals.css`. Left in place; candidate for deletion someday.

## Build verification

`npm run build` → **✓ 129 modules transformed, zero errors** (was 128;
+1 is the new LoginGate.jsx — 129 is the expected number from now on).
Built against the repo's real package.json/vite.config.js from `main`.

## Deploy steps

0. **First:** complete Part A of `SUPABASE_RLS_STEPS.md` (create auth
   user + disable sign-ups). Phone-friendly. Do NOT run any SQL yet.
1. **Back up first:** IOBar Export (Supabase JSON) + GitHub repo
   Download ZIP.
2. Delete the existing `src` and `public` folders from your local repo.
3. Copy the `src` and `public` folders from this zip into the repo.
4. GitHub Desktop: commit → push.
5. Wait for Netlify to show green / Published.
6. Hard-refresh: **Ctrl-Shift-R**. If the old version persists:
   F12 → Application → Service Workers → Unregister, then refresh.
   (Cache is now `gol-compendium-v32`, so the SW should self-update.)
7. Sign in, verify data loads, then continue with Parts C–D of
   `SUPABASE_RLS_STEPS.md` to actually enable RLS.
