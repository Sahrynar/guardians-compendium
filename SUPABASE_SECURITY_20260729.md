# Supabase Security Pass — 2026-07-29

Guardians Compendium · project `ejjqujeabttawwnkdatd`
Executed live via the Supabase connector. **No app deploy required** — every
change below is database-side. Rollback SQL at the bottom.

---

## What was wrong

The advisor was reporting two **ERROR**-level findings and, separately, a
storage misconfiguration that was silently breaking a feature.

### 1. 🔴 Two tables had RLS switched off entirely

| Table | Rows | Exposure |
|---|---|---|
| `activity_log_td075_backup` | 23 | anon key could read **and write** every row |
| `settings_imagelibrary_backup` | 1 (3.0 MB) | same |

These were created as ad-hoc backups and never locked down. Because the anon
key ships inside the public JS bundle, "exposed to anon" means exposed to
anyone who views source on the live site. The other seven tables were locked
back on 2026-07-12; these two were added afterwards and missed.

Both are orphans as far as the running app is concerned:

- `activity_log_td075_backup` — all 23 rows verified **still present** in live
  `activity_log`, so it is fully redundant.
- `settings_imagelibrary_backup` — holds a `image_library` key that is **not**
  in the live `settings` table and is **not read anywhere in the source**.
  `LibraryPicker.jsx` builds the gallery by scanning entry fields for
  image-shaped values, so this blob is a leftover from an earlier design.

Neither was dropped — locking is non-destructive and the 3 MB blob deserves a
look before anything permanent happens to it. See "Still open" below.

### 2. 🐛 Storage uploads were failing RLS (not previously on the ledger)

All four policies on `storage.objects` required the object path to begin with
`private/`:

```
(bucket_id = 'compendium-images')
  AND ((storage.foldername(name))[1] = 'private')
  AND (auth.role() = 'authenticated')
```

But `src/hooks/useImageUpload.js:10` builds paths as `${folder}/${Date.now()}-…`
where `folder` is `'items'` or `'inventory'` — never `private`. So **every
upload through the Inventory tab was being denied by RLS.** The single object
in the bucket (`items/…png`) dates from 2026-03-27, before those policies
existed, which is consistent with uploads having been broken ever since.

`SUPABASE_RLS_STEPS.md` Part C2 had specified plain bucket-scoped policies;
the ones actually in place looked like they came from a dashboard template
that assumes a `private` folder convention this app does not use.

---

## What changed

Three migrations, applied in order:

**`lock_orphan_backup_tables_rls`**
```sql
alter table public.activity_log_td075_backup     enable row level security;
alter table public.settings_imagelibrary_backup  enable row level security;

create policy "keeper_all" on public.activity_log_td075_backup
  for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.settings_imagelibrary_backup
  for all to authenticated using (true) with check (true);
```

**`fix_storage_policies_bucket_scoped`** — dropped the four
`Give users authenticated access to folder 1oq1v1s_*` policies and replaced
them with bucket-scoped INSERT / UPDATE / DELETE for `authenticated`, exactly
as the runbook originally specified.

**`drop_storage_select_policy_prevent_listing`** — removed the SELECT policy
added in the previous step. The bucket is Public, so object URLs resolve with
no policy at all, and the app only calls `upload()` and `getPublicUrl()` (the
latter builds a URL client-side and makes no API call). A broad SELECT policy
would only have granted the ability to **list every file in the bucket**,
which nothing needs — the advisor flags this as `public_bucket_allows_listing`.

### Result

- Both ERROR-level findings: **cleared.**
- All **nine** public tables now have RLS on with exactly one
  `keeper_all` / `authenticated` policy each.
- Storage: public read (unchanged, images keep working), writes are
  authenticated-only and no longer path-restricted, no bucket listing.
- Inventory image upload should work again — **needs a live smoke test**
  (upload an image in Inventory; it should stick and render).

---

## Accepted, not fixed

**9× `rls_policy_always_true` (WARN).** The advisor objects to
`using (true) with check (true)`. This is deliberate: the Compendium is a
sole-keeper app with exactly one auth user and no per-row ownership model, so
"any authenticated user" and "Melissa" are the same set. Tightening these to
`auth.uid() = <something>` would add no security and would break every table
the moment a second device or a recovery account is involved. Recorded here so
it stops being re-raised as a finding.

---

## Still open (needs the dashboard — cannot be done over the connector)

- **TD-033 — enable leaked-password protection.** Authentication → Sign In /
  Providers → Password settings → turn on the HaveIBeenPwned check. Still the
  only remaining advisor WARN that is a genuine gap.
- **TD-034 — re-confirm "Allow new users to sign up" is OFF.** The login gate
  protects nothing if self-registration is open. Worth an eyeball since it has
  never been verified in writing after the 7H auth work.
- **TD-076 (new) — decide the fate of the two orphan backup tables.** Now
  locked, so there is no rush. `activity_log_td075_backup` is provably
  redundant and can be dropped whenever. `settings_imagelibrary_backup` holds
  3 MB of image data nothing reads — export it first, then decide.

---

## EMERGENCY ROLLBACK

If anything about images or the app misbehaves after this pass:

```sql
-- storage back to the previous (path-restricted) behaviour
drop policy if exists "keeper_insert_images" on storage.objects;
drop policy if exists "keeper_update_images" on storage.objects;
drop policy if exists "keeper_delete_images" on storage.objects;

create policy "Give users authenticated access to folder 1oq1v1s_0" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'compendium-images'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated');
create policy "Give users authenticated access to folder 1oq1v1s_1" on storage.objects
  for update to authenticated using (
    bucket_id = 'compendium-images'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated');
create policy "Give users authenticated access to folder 1oq1v1s_2" on storage.objects
  for select to authenticated using (
    bucket_id = 'compendium-images'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated');
create policy "Give users authenticated access to folder 1oq1v1s_3" on storage.objects
  for delete to authenticated using (
    bucket_id = 'compendium-images'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated');

-- backup tables back to open (NOT recommended — this is the hole we just closed)
alter table public.activity_log_td075_backup    disable row level security;
alter table public.settings_imagelibrary_backup disable row level security;
```

Table data was never touched by any of this. The only thing that changed is
who is allowed to reach it.
