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

create table if not exists feature_registry (
  id text primary key,
  name text not null,
  tab text not null,
  session integer not null,
  status text not null default 'active',
  created_at timestamptz default now()
);

create index if not exists entries_category_idx on entries(category);
