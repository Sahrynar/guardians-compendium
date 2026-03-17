-- ============================================================
-- GUARDIANS COMPENDIUM — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ============================================================

-- Main entries table (flexible JSONB - mirrors localStorage structure)
create table if not exists entries (
  id text primary key,
  category text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast category queries
create index if not exists entries_category_idx on entries (category);

-- Settings table (theme, customization, app config)
create table if not exists settings (
  key text primary key,
  value jsonb
);

-- Auto-update updated_at on any row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entries_updated_at
  before update on entries
  for each row execute function update_updated_at();

-- Backup log (tracks when backups were made)
create table if not exists backup_log (
  id uuid default gen_random_uuid() primary key,
  backed_up_at timestamptz default now(),
  entry_count integer,
  destination text default 'google_drive'
);

-- Enable Row Level Security (optional but good practice)
-- Comment these out if you want simpler access without auth
alter table entries enable row level security;
alter table settings enable row level security;

-- Allow all operations for now (no auth required)
-- You can tighten this later when/if you add user accounts
create policy "Allow all for now" on entries for all using (true) with check (true);
create policy "Allow all for now" on settings for all using (true) with check (true);
