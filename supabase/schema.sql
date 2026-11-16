create table if not exists public.mt5_snapshots (
  snapshot_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mt5_snapshots enable row level security;

revoke all on table public.mt5_snapshots from anon, authenticated;
grant select, insert, update on table public.mt5_snapshots to service_role;

create table if not exists public.forex_trade_ledger (
  ledger_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.forex_trade_ledger enable row level security;

revoke all on table public.forex_trade_ledger from anon, authenticated;
grant select, insert, update on table public.forex_trade_ledger to service_role;

create table if not exists public.alert_preferences (
  prefs_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.alert_preferences enable row level security;

revoke all on table public.alert_preferences from anon, authenticated;
grant select, insert, update on table public.alert_preferences to service_role;

