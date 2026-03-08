begin;

alter table if exists public.reservations
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_amount integer not null default 10000,
  add column if not exists payment_provider text not null default 'paymongo',
  add column if not exists payment_checkout_session_id text,
  add column if not exists payment_reference text,
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_error text;

update public.reservations
set payment_status = 'unpaid'
where payment_status is null;

update public.reservations
set payment_amount = 10000
where payment_amount is null;

update public.reservations
set payment_provider = 'paymongo'
where payment_provider is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_payment_status_check'
  ) then
    alter table public.reservations
      add constraint reservations_payment_status_check
      check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'cancelled'));
  end if;
end $$;

create index if not exists reservations_user_payment_status_idx
  on public.reservations (user_id, payment_status);

create index if not exists reservations_checkout_session_idx
  on public.reservations (payment_checkout_session_id);

commit;

