# GUARDIANS COMPENDIUM — MASTER TO-DO

**Current as of 2026-07-29.** Successor to `MASTER_TODO_v2_RECONCILED_2026-07-13.md`
(Drive), brought forward through PATCH7L and the 2026-07-29 Supabase security pass.

**This file now lives in the repo, not in Drive.** That is deliberate — TD-047
(master-list hygiene) kept failing because the authoritative ledger lived in a
Drive file that nothing forced anyone to open. In the repo it sits next to the
code it describes and moves with every clone and every Download-ZIP backup.

Legend: 🧍 Melissa · 🤖 Claude · 🤝 both · 🔧 code build · 🗄 far backlog

---

## ⚠️ KNOWN GAP IN THIS LEDGER — read before trusting it

**TD-072, TD-073, TD-074 and TD-075 are missing.** They were issued during the
2026-07-15 → 07-19 sessions, after the v2 reconciliation was written. Their
definitions are not in the repo, not in Supabase, and not in any Drive ledger
file — the only surviving record is the chat transcript
**`FinalFableJuly192026`** (Drive, 1.4 MB Google Doc, modified 2026-07-20).

The one thing known for certain: TD-075 involved `activity_log`, because it
left a table called `activity_log_td075_backup` behind (23 rows, timestamps
running to 2026-07-16).

**Next session should mine that transcript and fold TD-069–075 in properly.**
Everything below is accurate; it is just not complete in that one range.

---

## A. ✅ CLOSED — recent (evidence noted, stop re-raising)

**PATCH7L (sw v37, 2026-07-15/19):**
- TD-071 ✅ Characters image system rehaul — tagged slots, unlimited images per
  character, rainbow spectrum borders, per-slot S/M/L, draggable multi-panel
  comparison lightboxes, non-destructive migration of the old
  portrait/reference pair.
- TD-069 ✅ Manuscript 🗑 Delete Chapter, with confirm + renumber −1.
- TD-070 ✅ Session-log import failures now raise the red cloud-error toast with
  the real error text. A rejected import can no longer masquerade as
  "✓ 0 new entries added".
- TD-050 ✅ Image Library dedupes by image *content*, not per entry.
- TD-051 ✅ Character card thumbnails show the first image of any kind, not just
  canvas portraits.
- TD-052 ✅ Library picker wired for **all** image adds (Reference slot no longer
  opens the file explorer only).
- TD-068 ✅ Banner style picker — Classic (default, never overwritten) → Night Sky
  → Night Sky + World Tree, saved to `settings.banner_style`, syncs across devices.
- Characters sort dropdown (A→Z / Z→A / Newest / Oldest) — new, unnumbered.

**PATCH7K (sw v36):** TD-029 core (undo/redo 200 steps, ✂ split, ⤵ merge),
TD-065 (Locations A–Z jump expands ancestors), TD-066 (duplicate Ctrl+F handler),
Manuscript per-`<p>` indent fix.

**PATCH7I / 7H / 7G:** global search unification + Ctrl+K, Manuscript
find/replace, reading-time, Forge fuzzy concept picker, Flags sort UI, Z→A
across GenericListTab + Inventory, jump bars on Wiki + Flags, in-app password
change + sign out, code-splitting (709 kB → ~198 kB core), cloud-error toast,
paginated `sbLoad` with `order('id')`, dead-code sweep, nav grid centering.

**Database:** TD-035 (`update_updated_at` `search_path` hardening, verified
`proconfig search_path=""`), TD-044 (CATTAG 417/417 concepts verified against
Aster's source — the 107-avg-vs-128 depth is **source-side by design, never
re-flag it**).

**2026-07-29 security pass** — see `SUPABASE_SECURITY_2026-07-29.md`:
- ✅ Both RLS-disabled backup tables locked (`keeper_all` / authenticated).
  All nine public tables now have RLS on with exactly one policy each.
- ✅ Storage policies fixed — they required a `private/` path prefix the app
  never uses, so **every Inventory image upload was being denied by RLS**.
  Now bucket-scoped, authenticated-write, public-read, no listing.
- ✅ TD-049 keep-alive workflow added (`.github/workflows/keep-alive.yml`) —
  needs its two repo secrets set, see §C.

---

## B. 🔲 OPEN — CODE (🤖/🔧), grouped by size

### Quick wins — bundle candidates for the next patch
- **TD-001** Wiki READ mode — click a card to read the article (currently edit-only).
- **TD-002** Notes card click → read-only popup, distinct from edit.
- **TD-003** Characters: Zodiac as a dropdown.
- **TD-004** Characters: read-only pop-open view.
- **TD-005** Manuscript: chapter editor persists across reload (S29 bug #1).
- **TD-006** Manuscript: cover image `onError` fallback (picker half now closed by TD-052).
- **TD-007** FilterPopup into World / Questions / Canon / Spellings (GenericListTab).
- **TD-008** `Dashboard.jsx` dead-helper sweep (leftovers from the search removal).
- **TD-009** Tools "Character Age at Event": auto-pull birthdays from Characters
  — ❓ verify first, may be manual-entry only.
- **TD-053** `App.jsx` conflict-path import still reports "0 added". The IOBar
  path was fixed; this one was not. Verify, then fix.
- **TD-055** Forge: concept-CATEGORY dropdowns. CATTAG already carries the
  categories; the UI was never started.

### Medium
- **TD-010** `session_log` import: update-on-import by `session_number` + dedupe
  `_enriched` pairs. ⚠️ **Data-destructive potential — own pass, fresh backup first.**
- **TD-011** Locations: image upload in tree AND table views.
- **TD-012** Locations: table-view sort/filter + make the size pickers actually apply (S29 #5–6).
- **TD-013** Locations: drag-adjustable column widths.
- **TD-014** Manuscript edit-mode: colour picker + image upload.
- **TD-015** In-app password-reset page (email-link flow; needs redirect config).
- **TD-016** Word-count progress bars on book cards. 🧍-blocked by TD-042.
- **TD-017** Journal "+New Note" relabel. 🧍-blocked: needs wording.
- **TD-018** Per-sticky text formatting (font size, bg + text colour pickers).
- **TD-019** Map pin markers on map images.
- **TD-020** Flow-direction toggle (horizontal ↔ vertical) across column-picker tabs.
- **TD-021** Grid divider toggle in settings.
- **TD-022** Book-shelf spacing polish (bigger cards when fewer books).
- **TD-023** Glossary filter types beyond category / status / A–Z.
- **TD-024** AlphabetJumpBar: jump-only vs filter-all-by-letter. 🧍 decision, then 🤖.
- **TD-054** Glossary: manual add/edit modal + confirm sizing chips shipped. ❓

### Big builds — own sessions
- **TD-025** Tools tab full overhaul (tabbed: Date & Time / Names & Languages / Dialogue / Library).
- **TD-026** Calendar full feature pass. Weather blocked on geography (TD-057);
  season colour spectrum needs Melissa's picks.
- **TD-027** Mobile layout pass.
- **TD-028** Custom add/edit/delete filter system per tab.
- **TD-030** Timeline polish. 🧍 scope undefined — needs Melissa's list.
- **TD-031** Notes sticky board → Supabase sync (❓ verify current state first;
  an April note says localStorage-only).
- **TD-032** Sticky date filters beyond "today" (week / month / custom).
- **TD-048** ⏳ **ULTIMATE DOOMSDAY BACKUP** — one self-contained HTML file that is
  simultaneously a printable book and a re-importable database (embedded JSON).
  **Spec v1 delivered** (`TD-048_DOOMSDAY_SPEC_v1.md`, Drive); build is blocked
  only on Melissa's 4 picks (image tier / manuscript default / Letter vs A4 /
  title wording). Once picked, the build is Sonnet-capable.
- **TD-029 extras** Manuscript autocomplete + reading-ease (core shipped 7K).

---

## C. 🧍 OPEN — MELISSA (dashboard / content / canon, any pace)

**Dashboard — the only remaining security gaps:**
- **TD-033** Enable leaked-password protection. Authentication → Sign In /
  Providers → Password settings → turn on the HaveIBeenPwned check. This is the
  last outstanding Supabase advisor warning that is a genuine gap.
- **TD-034** Re-confirm **"Allow new users to sign up" is OFF**. The login gate
  protects nothing if self-registration is open, and this has never been
  verified in writing since the 7H auth work.
- **TD-049** Set the two repo secrets the keep-alive workflow needs:
  Settings → Secrets and variables → Actions →
  `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Until these exist the workflow will
  fail loudly by design (a silent no-op would be worse than none).
- **TD-076** 🆕 Decide the fate of the two orphan backup tables, now locked and
  no longer urgent. `activity_log_td075_backup` is provably redundant (all 23
  rows still live in `activity_log`) and can be dropped whenever.
  `settings_imagelibrary_backup` holds 3 MB of image data nothing reads —
  export it first, then decide.
- **TD-043** GitHub: branch protection on `main`.

**Content & canon:**
- **TD-036** Real birthdays for the remaining ~42 `pending_math` characters.
- **TD-037** Era length: 12,958 vs 12,959.
- **TD-038** Lurlen forms lock (Lurling/Lurric · Lurlenish/Lurlish).
- **TD-039** Skim/correct the reconstructed May + June session entries.
- **TD-040** Canon-question backlog: weapons ×12, royal keys, Chiron/Cremiliton,
  power-tier rename, Aenya's demon name, Dragon-Man/Bird-Man, Minato inn,
  L&M wedding year, daughter's name (Daphne working), fireball gap, Rose's
  Mnaerah arrival, fire-sword pommel origin, Gillison's Ix'Citlatl name,
  Natulis/Natulus, Yzral/Yzrael.
- **TD-041** Phonology content picks — still wanted, or moot post-Forge?
- **TD-042** Per-book word-count targets (unblocks TD-016).
- **TD-058** Scots line review across manuscript dialogue.
- **TD-059** Sicilian-variant Lajen name (canon pick).
- **TD-061** Session numbering 13-vs-14 decision (open since March).
- **TD-062** Confirm `Guardians_Country_Naming_Lock` (+v2) is reflected in canon records.
- **TD-063** Pronunciation Helper: whether to read the "private" name under
  Ix'Citlatl (deferred, low priority).
- **TD-064** Per-language default voices, beyond the single global picker (deferred).

---

## D. 🤝 OPEN — BOTH
- **TD-045** S29 leftover-bug re-test on the CURRENT build (see §E — many are
  fixed or stale).
- **TD-046** Manuscript DOC backlog (documents, not the app): find-replace list
  execution, B1 chapter titles 6–20, alternate-ending removal (B1 lines
  18561–18626), Caduceus → Rod of Asclepius (1831/1998/4469), book-numbering
  inversion. Martyn card retired terms: "Spirit Wood" → Aethrath,
  "Fiher" → Xitalar (quick Compendium data fix).
- **TD-047** Master-list hygiene: merge each session's ledger into **this file**
  at session close. Moving it into the repo is the structural half of the fix.
- **TD-056** Deep session-log enrichment Phase 2b (fresh dedicated session).
- **TD-057** Geography Session — unblocks Calendar weather (TD-026).
- **TD-060** **Ground Truth project** — awaiting Melissa's intro/files, then pick
  the first extraction target: locations census / knowledge-states / timeline / glossary.
- **TD-067** Session-log rebuild: Fable phase complete (41 rows, 176,815 chars).
  ⚠️ **The swap was never run.** `session_log` still holds 42 rows including the
  thin originals. Runbook: `TD-067_RUNBOOK.md` (Drive) — backup both → `delete
  from session_log;` → 📥 Session Bundle import → verify count.
- **TD-072 / 073 / 074 / 075** — ❓ **definitions unknown**, see the gap warning
  at the top of this file.

---

## E. ❓ NEEDS A LIVE-APP EYEBALL (~10 min — grep cannot see rendering)

1. Stickies: does XL actually differ from L? (S29 #7)
2. Journal sub-tab: L vs XL distinct? (S29 #8)
3. Timeline: do the size pickers visibly apply? (S29 #9)
4. Manuscript: book/chapter dropdown navigation from TOC — does it switch books? (S29 #10)
5. Quick Capture: do stickies arrive where sent? (S29 #12)
6. Ideas notes: survive clicking away from Notes parent and back? (S29 #13)
7. Sticky compact mode: is the "Send to" arrow hidden? (S29 #14)
8. Which tabs still ignore nav-search typing? (8 non-consumers exist; some
   legitimately have nothing to filter)
9. Inventory popup colour matches bubble colour?
10. Manuscript Word-doc upload "sticking"? (April note — may be long fixed)
11. Sticky "Send to ▸" includes Ideas as a destination? (S31)
12. Sticky face shows CREATION date, not archive date? (S31)
13. Book colour picker present inside the edit-book modal? (S31)
14. 🆕 **Inventory image upload** — now that the storage policies are fixed,
    upload an image and confirm it saves and renders. This is the smoke test
    for the 2026-07-29 storage fix.

→ Anything that fails gets promoted to a TD in §B next session.

---

## F. 🗑 OBSOLETE / SUPERSEDED (recorded so they stop resurfacing)
- "Remove redundant second search box" → superseded by the PATCH7I relocation design.
- "Dashboard search with scope dropdown" → superseded, moved to nav.
- Items/Wardrobe separate-tab fixes → tabs merged into Inventory.
- "Eras out of TAB_ORDER" → done, `Eras.jsx` unhooked entirely in 7H.
- PR #13/#14/fix3-era mechanics → all shipped/merged eras ago.
- "Maps drag/resize regressed" → present in current code.
- "A–Z jump bar sticky container fix" → resolved 7E, coverage extended 7I.
- "Robust large-import" → shipped 7E (`sbUpsertMany` + localStorage exclusion).
- "Rainbow Ideas buckets" → shipped 7E.
- "Six-table RLS" framing → it was seven, and is now **nine**.
- "Double search boxes" / "A–Z bar not freezing" → fully closed by 7E/7I.
- "Wiki needs its own A–Z jump bar" → shipped 7I.
- S31 "FT color recheck post-Mode-B" → shipped 7I.

---

## G. 🗄 FAR BACKLOG (recorded, unscheduled — carried verbatim)

Continuity checker · per-character power-system tracker · custom fields ·
scheduled auto-backup · full/partial doomsday export refinements ·
scene ↔ chapter bidirectional linking · Bestiary sub-tab · word/chapter tracker ·
POV tracker · foreshadowing tracker · beat sheet · PR #16 UX polish (masonry,
per-sticky sizing, Journal sidebar collapse, magnified modal, Quick Capture
3-button, location thumbnails) · Manuscript markup/character-linking (large) ·
full Pronunciation Helper (100+ languages, Best-Mix blend) · Language Workshop
tab evolution · Calendar region selector (Build D2) · slot drag-reorder within
the Characters gallery grid.

---

## H. 🔍 HOUSEKEEPING NOTED 2026-07-29 (not yet TD'd — Melissa's call)

- **`.gitignore` contains `*.json`.** Already-tracked files (`package.json`,
  `public/manifest.json`) are unaffected, but **any new JSON is silently
  ignored** — including session bundles and export files. This is why
  `session_log_REBUILD_ALL_2026-07-14.json` lives in Drive rather than the repo.
  Suggested fix: narrow it to the specific files being excluded, or add
  `!` negations for the ones worth versioning.
- **`supabase_schema.sql` is badly stale.** It describes 3 tables
  (`entries`, `settings`, `feature_registry`) and no RLS. Reality is 9 tables
  with RLS on all of them. Anyone rebuilding from that file would get an
  unprotected, incomplete database. Now updated — see the file header.
