# PATCH7H (FINAL) — Install Notes
Guardians of Lajen Compendium · Service Worker v33
Built 2026-07-12 · Base: PATCH7F (v32)

⚠ **This FINAL zip supersedes BOTH earlier zips from the same day
(PATCH7G and the first PATCH7H). Deploy this one only.**

## What changed (9 items)

### Carried over from PATCH7G (tasks 1–5)

**1. Nav bar — true centering.** `.nav-top` is CSS grid (`1fr auto 1fr`);
search box genuinely centred at any width, fluid
`clamp(160px, 40vw, 480px)`; right buttons right-align.

**2. Sign-out button** at the end of the IOBar row (Supabase mode only).
Calls `supabase.auth.signOut()` → back to the LoginGate.

**3. sbLoad pagination.** Loads entries in pages of 1000 — no more
silent row loss above PostgREST's max_rows cap (project has 1429+ rows).
Includes `.order('id')` so pages are deterministic (Postgres guarantees
no stable order across LIMIT/OFFSET pages without an ORDER BY).

**4. Stale duplicate `src/globals.css` deleted** (468 lines, never
imported — main.jsx imports `src/styles/globals.css`).

**5. Dead CSS variables `--cd` / `--ctl` removed** from `:root`
(verified: zero usage anywhere).

### New in PATCH7H (items 6–9)

**6. Code-splitting.** All 20 tabs converted to `React.lazy` with a
`Suspense` fallback (the ✦ loader). The single 709 kB bundle is now a
195 kB core plus per-tab chunks that download on first visit and cache
thereafter. Biggest practical effect: much faster initial load,
especially on mobile. The ">500 kB chunk" build warning is gone.

**7. Cloud errors are now visible.** Failed Supabase loads/saves/deletes
previously only logged to the browser console — invisible in normal use.
New `CloudErrorToast` component shows a dismissible red banner
(bottom-right, auto-hides after 8 s) whenever a cloud operation fails.
Console logging is retained.

**8. Dead-code sweep.**
- Removed four dead tab imports from App.jsx: `Wardrobe`, `Items`,
  `Eras`, `Journal` — imported but never rendered anywhere. The files
  remain on disk (in case anything is ever resurrected) but no longer
  ship in the bundle. Their live functionality exists elsewhere
  (Inventory, Timeline, Notes → Journal view, etc.).
- Removed the dead `CSS_VARS` export from constants.js (never imported).
- Fixed IOBar's mixed static/dynamic import of supabase.js (the other
  long-standing build warning) — now uses the static import only.

**9. In-app password change.** New "🔑 Password" button next to Sign
out (Supabase mode only). Opens a small modal: new password + confirm,
minimum 8 characters, calls `supabase.auth.updateUser`. You stay signed
in on the current device. Reminder shown in the modal: save it in your
password manager — lost passwords still require a dashboard reset.

## Files modified

- `src/App.jsx` — lazy tab imports, Suspense wrapper, toast mount,
  search-input style (Task 1)
- `src/styles/globals.css` — grid nav, dead vars removed
- `src/components/common/IOBar.jsx` — sign-out button, password-change
  modal, import fix
- `src/hooks/useDB.js` — paginated sbLoad, cloudError reporting
- `src/constants.js` — CSS_VARS removed
- `src/components/common/CloudErrorToast.jsx` — NEW
- `src/globals.css` — DELETED
- `public/sw.js` — cache bumped v32 → v33

## Verification

- `npm run build` → ✓ 127 modules transformed, **zero errors, zero
  warnings** (was 129 with 2 warnings; −4 dead tabs, +1 new component,
  +1 Vite preload helper, both warnings eliminated)
- Bundle: 709 kB monolith → 195 kB core + on-demand tab chunks
- Regression tracker exact: SessionLog.jsx 840 · JournalView.jsx 322 ·
  Scenes.jsx 445 · StickiesView.jsx 899
- Untouched: SemanticForge.jsx, ReverseLookup.jsx, langRegistry.js,
  speech.js, nameForge.js

## Deploy steps

1. **Back up first — both, every time:**
   a. IOBar **Export** → full Supabase JSON backup
   b. GitHub repo → **Code → Download ZIP**
2. Delete the existing `src` and `public` folders from your local repo.
3. Copy in the `src` and `public` folders from this zip.
4. Commit and push via GitHub Desktop.
5. Wait for Netlify green/Published.
6. Hard-refresh (**Ctrl-Shift-R**); if stale, F12 → Application →
   Service Workers → Unregister → refresh.

## Post-deploy smoke test

- Search box centred at all window widths
- Click through several tabs — each shows the ✦ flash on FIRST visit
  only (that's the chunk downloading), then instant
- "Sign out" button at end of IOBar row works; sign back in works
- "🔑 Password" opens the change-password modal; mismatched or short
  passwords are rejected with a message; a real change succeeds, and
  the NEW password works after sign-out/sign-in
- Entry counts correct (may INCREASE vs before — that's the pagination
  fix recovering silently-dropped rows, not a bug)
- To see the new error toast in action (optional): turn off wifi and
  edit an entry — red "Cloud save failed" banner appears bottom-right
