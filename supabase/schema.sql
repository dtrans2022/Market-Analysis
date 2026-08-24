create table if not exists public.mt5_snapshots (
  snapshot_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mt5_snapshots enable row level security;

revoke all on table public.mt5_snapshots from anon, authenticated;
grant select, insert, update on table public.mt5_snapshots to service_role;
