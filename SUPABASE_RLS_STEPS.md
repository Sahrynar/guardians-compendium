# RLS + Login Gate — Runbook
Guardians Compendium · prepared 2026-07-11

⚠️ **ORDER MATTERS.** Doing Part C before Part B breaks the app (reads
return nothing until the authenticated code is live). Follow A → B → C → D.
Rollback SQL is at the bottom if anything goes wrong.

---

## PART A — Do now (works from a phone browser)

Supabase Dashboard → your project:

1. **Create your user.** Authentication → Users → **Add user** →
   *Create new user*:
   - Email: `Sahrynar@gmail.com`
   - Password: strong + saved in a password manager
   - ✅ **Check "Auto Confirm User"** — if you skip this, sign-in fails
     with "Email not confirmed."
2. **Disable public sign-ups.** Authentication → Sign In / Providers
   (Email provider settings): turn **OFF** "Allow new users to sign up."
   ⚠️ This step is not optional. If sign-ups stay open, anyone can
   self-register and the login gate protects nothing.
3. Do **not** run any SQL yet.

---

## PART B — Desktop deploy (PATCH7F zip)

1. Backups first: IOBar Export (Supabase JSON) + GitHub repo Download ZIP.
2. Replace `src` + `public` in the local repo with this zip's folders.
3. GitHub Desktop: commit → push → wait for Netlify green.
4. Hard refresh (Ctrl-Shift-R). You should see the ✦ **Keeper sign-in**
   screen. Sign in with the Part A credentials.
5. Verify all data loads and the app behaves normally. Sign-in persists
   per device (~once per device; tokens auto-refresh).

If the site works and data loads while signed in → proceed to Part C.

---

## PART C — Enable RLS (ONLY after Part B is verified)

### C1. Tables — paste ALL of this into SQL Editor → Run (one shot, atomic):

```sql
alter table public.entries          enable row level security;
alter table public.session_log      enable row level security;
alter table public.settings         enable row level security;
alter table public.activity_log     enable row level security;
alter table public.feature_registry enable row level security;
alter table public.ideas_list       enable row level security;

create policy "keeper_all" on public.entries          for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.session_log      for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.settings         for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.activity_log     for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.feature_registry for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.ideas_list       for all to authenticated using (true) with check (true);
```

If it errors (e.g. a table name differs), nothing is applied — copy me
the error text and stop.

### C2. Storage bucket `compendium-images` — use the Dashboard UI
(Storage → the bucket → Policies), because SQL-editor permissions on
`storage.objects` vary by project:

- **Keep the bucket's "Public" toggle ON** (existing image URLs keep
  working; reads stay public — that's the accepted trade-off).
- **Delete/disable any existing policy** on this bucket that grants
  INSERT, UPDATE, or DELETE to `anon` or `public`.
- Create three policies for role **authenticated** on this bucket:
  INSERT, UPDATE, DELETE (target: `bucket_id = 'compendium-images'`).
  The UI templates cover this; equivalent SQL if the editor allows it:

```sql
create policy "keeper_insert_images" on storage.objects
  for insert to authenticated with check (bucket_id = 'compendium-images');
create policy "keeper_update_images" on storage.objects
  for update to authenticated using (bucket_id = 'compendium-images')
  with check (bucket_id = 'compendium-images');
create policy "keeper_delete_images" on storage.objects
  for delete to authenticated using (bucket_id = 'compendium-images');
```

---

## PART D — Verify

1. Hard refresh the app while signed in: data loads, create a test entry,
   upload a test image, confirm both stick.
2. Open a **private/incognito window** → site demands sign-in; a wrong
   password is rejected. (This is also the "log out" test — v1 has no
   logout button by design; incognito is the clean way to test.)
3. Forgot password later? Dashboard → Authentication → Users → your
   user → reset. No in-app reset flow in v1 (deliberate, sole-user app).

---

## EMERGENCY ROLLBACK (tables)

If the app breaks after Part C, paste this to instantly restore the old
behavior (data is untouched either way):

```sql
alter table public.entries          disable row level security;
alter table public.session_log      disable row level security;
alter table public.settings         disable row level security;
alter table public.activity_log     disable row level security;
alter table public.feature_registry disable row level security;
alter table public.ideas_list       disable row level security;
```

Then tell Claude what happened.
