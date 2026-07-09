# FIX — your deploy failed because a file went missing in the copy

**What happened:** the Netlify build failed with `Could not resolve "./hooks/useDB"`.
That means `src/hooks/useDB.js` (and possibly other files not in the patch zip)
got dropped when the files were copied into the repo — the copy replaced/synced
folders instead of merging them. The *code* is fine; the *repo* just lost files.

**This zip contains the COMPLETE, build-verified `src/` and `public/` folders**
(your full 7A app + all the 7B changes, incl. the kitl fix and file-import). I
built it locally: 128 modules, clean. Replace wholesale — don't merge this time.

## Steps (GitHub Desktop)
1. **Back up first:** IOBar ⬆ Export (Supabase JSON) + GitHub → Download ZIP.
2. In your repo `C:\Users\melis\GitHub\guardians-compendium\`:
   - **Delete** the existing `src` folder and the existing `public` folder.
   - **Extract this zip** and copy its `src` and `public` folders into the repo
     root so they sit where the old ones were.
3. GitHub Desktop will show a batch of changes (some modified, some *restored*).
   Commit → Push.
4. Watch Netlify: the build should go **green / Published** this time.
5. Then hard-refresh (Ctrl-Shift-R). If the old version lingers: F12 →
   Application → Service Workers → Unregister → reload. (Cache is now v28.)

## How to confirm the fix worked
On github.com → your repo → `src/hooks/` → you should see **useDB.js** present.
If it's there and Netlify is green, you're done — you'll see the 🔎 Reverse
Lookup tab, the 🗣 voice picker, the "type any word" box, and 📁 Load from file.

## Why replace instead of merge
The build stops at the *first* missing file, so restoring only useDB.js could
just reveal the next gap. Replacing both folders wholesale with this verified
copy removes all doubt in one step.

Nothing of yours is lost: this `src/` is your 7A app plus the 7B additions —
it's a superset of what you had, not a reset.
