-- =====================================================================
-- Guardians Compendium — Supabase Schema
-- Dumped from the live project 2026-07-29. Supersedes the 3-table stub
-- that used to live here, which described neither the six tables added
-- since nor any of the row-level security.
--
-- Running this file top to bottom on an empty project reproduces the
-- current database, INCLUDING the access control. Do not split it — a
-- rebuild that stops after the CREATE TABLEs leaves every table open to
-- the anon key.
--
-- The two *_backup tables are orphaned snapshots the app never reads.
-- They are included because they exist in the live database and are
-- locked down; a fresh rebuild does not need them (see TD-076).
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

-- Every worldbuilding record. `category` is the tab (characters,
-- locations, manuscript, …); `data` is the whole entry as JSON.
create table if not exists public.entries (
  id          text primary key,
  category    text        not null,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Key/value app state: column widths, banner style, tool history,
-- manuscript covers. Values are JSON; several are multi-megabyte
-- base64 images.
create table if not exists public.settings (
  key    text primary key,
  value  jsonb
);

-- Session minutes. Note both `todo` and `todos` exist and are kept in
-- sync by the importer — a historical wart, not a mistake.
create table if not exists public.session_log (
  id              text primary key,
  session_number  integer,
  date            text,
  title           text,
  topics          text,
  opened_at       text,
  closed_at       text,
  decisions       text,
  built           text,
  completed       text,
  flags           text,
  questions       text,
  todo            text,
  todos           text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Undo/restore history. `snapshot` holds the pre-change entry so a
-- delete can be reversed; `undone` marks entries already rolled back.
create table if not exists public.activity_log (
  id          text primary key,
  timestamp   timestamptz not null default now(),
  action      text        not null,
  category    text,
  entry_id    text,
  entry_name  text,
  snapshot    jsonb,
  diff        jsonb,
  undone      boolean default false
);

-- Quick-capture buckets (names / words / phrases).
create table if not exists public.ideas_list (
  id          text primary key,
  category    text not null,
  value       text not null,
  created_at  timestamptz default now()
);

-- Which features shipped in which session. Tab-level only, so it
-- backstops big features, not granular items.
create table if not exists public.feature_registry (
  id          text primary key,
  name        text not null,
  tab         text not null,
  session     integer not null,
  status      text not null default 'active',
  created_at  timestamptz default now()
);

-- Written by the auto-backup hook.
create table if not exists public.backup_log (
  id            uuid primary key default gen_random_uuid(),
  backed_up_at  timestamptz default now(),
  entry_count   integer,
  destination   text default 'google_drive'
);

-- Orphaned snapshots — see the header note.
create table if not exists public.activity_log_td075_backup (
  id text, timestamp timestamptz, action text, category text,
  entry_id text, entry_name text, snapshot jsonb, diff jsonb, undone boolean
);

create table if not exists public.settings_imagelibrary_backup (
  key text, value jsonb
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------

create index        if not exists entries_category_idx     on public.entries (category);
create index        if not exists session_log_date_idx     on public.session_log (date);
create unique index if not exists session_log_number_idx   on public.session_log (session_number);
create index        if not exists activity_log_timestamp_idx on public.activity_log ("timestamp" desc);
create index        if not exists activity_log_action_idx    on public.activity_log (action);
create index        if not exists activity_log_category_idx  on public.activity_log (category);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

-- search_path is pinned to '' so the function cannot be hijacked by a
-- shadowing object in an attacker-controlled schema (TD-035, hardened
-- 2026-07-13). Keep the SET clause and the fully-qualified names.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_updated_at on public.entries;
create trigger entries_updated_at
  before update on public.entries
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY  — do not skip this section
-- ---------------------------------------------------------------------
--
-- The Compendium is a sole-keeper app: one auth user, no per-row
-- ownership. So the policy is deliberately "any authenticated user, all
-- rows". The security boundary is the login gate, not the row filter.
--
-- What this buys: the anon key ships inside the public JS bundle, and
-- these policies mean holding it grants nothing. Without them, anyone
-- viewing source on the live site can read and rewrite the entire
-- Compendium.
--
-- The Supabase advisor flags each of these as `rls_policy_always_true`.
-- That warning is understood and accepted — see
-- SUPABASE_SECURITY_2026-07-29.md.

alter table public.entries                      enable row level security;
alter table public.settings                     enable row level security;
alter table public.session_log                  enable row level security;
alter table public.activity_log                 enable row level security;
alter table public.ideas_list                   enable row level security;
alter table public.feature_registry             enable row level security;
alter table public.backup_log                   enable row level security;
alter table public.activity_log_td075_backup    enable row level security;
alter table public.settings_imagelibrary_backup enable row level security;

create policy "keeper_all" on public.entries                      for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.settings                     for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.session_log                  for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.activity_log                 for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.ideas_list                   for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.feature_registry             for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.backup_log                   for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.activity_log_td075_backup    for all to authenticated using (true) with check (true);
create policy "keeper_all" on public.settings_imagelibrary_backup for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- STORAGE  — bucket `compendium-images`
-- ---------------------------------------------------------------------
--
-- The bucket's Public toggle stays ON: existing image URLs keep working
-- and reads are public. That is the accepted trade-off, and it is why
-- there is deliberately NO select policy below — a public bucket serves
-- object URLs without one, and adding it would only grant the ability to
-- LIST every file (advisor: public_bucket_allows_listing).
--
-- Scope these to the bucket, NOT to a path prefix. Policies that
-- required a `private/` prefix silently broke every upload, because
-- src/hooks/useImageUpload.js writes to items/ and inventory/.

create policy "keeper_insert_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'compendium-images');

create policy "keeper_update_images" on storage.objects
  for update to authenticated
  using (bucket_id = 'compendium-images')
  with check (bucket_id = 'compendium-images');

create policy "keeper_delete_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'compendium-images');
