begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);

create index if not exists idx_admin_audit_logs_actor_id
  on public.admin_audit_logs (actor_id);

create index if not exists idx_admin_audit_logs_target
  on public.admin_audit_logs (target_type, target_id);

alter table public.admin_audit_logs enable row level security;

commit;
