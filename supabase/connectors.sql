-- Run this once in the Supabase SQL editor (or it has been applied for you).
-- Stores per-user connector connections. Tokens are AES-GCM encrypted by the app
-- (CONNECTOR_ENCRYPTION_KEY) before they are written to the `data` column.

create table if not exists public.connector_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_id text not null,
  status text not null default 'pending' check (status in ('pending', 'connected')),
  server_url text,
  label text,
  oauth_state text,
  data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, connector_id)
);

create index if not exists connector_connections_state_idx
  on public.connector_connections (oauth_state);

alter table public.connector_connections enable row level security;

drop policy if exists "connector_connections_select_own" on public.connector_connections;
drop policy if exists "connector_connections_insert_own" on public.connector_connections;
drop policy if exists "connector_connections_update_own" on public.connector_connections;
drop policy if exists "connector_connections_delete_own" on public.connector_connections;

create policy "connector_connections_select_own" on public.connector_connections
  for select using (auth.uid() = user_id);
create policy "connector_connections_insert_own" on public.connector_connections
  for insert with check (auth.uid() = user_id);
create policy "connector_connections_update_own" on public.connector_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "connector_connections_delete_own" on public.connector_connections
  for delete using (auth.uid() = user_id);
