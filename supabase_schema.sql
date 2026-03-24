-- Guardians Compendium — Supabase Schema

create table if not exists entries (
  id text primary key,
  category text not null,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb
);

create index if not exists entries_category_idx on entries(category);
