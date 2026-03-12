begin;

create extension if not exists pgcrypto;

create table if not exists public.restaurant_best_sellers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  price_minor integer not null default 0,
  image_url text,
  stock_quantity integer not null default 0,
  sold_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurant_best_sellers_price_minor_check'
  ) then
    alter table public.restaurant_best_sellers
      add constraint restaurant_best_sellers_price_minor_check
      check (price_minor >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurant_best_sellers_stock_quantity_check'
  ) then
    alter table public.restaurant_best_sellers
      add constraint restaurant_best_sellers_stock_quantity_check
      check (stock_quantity >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurant_best_sellers_sold_count_check'
  ) then
    alter table public.restaurant_best_sellers
      add constraint restaurant_best_sellers_sold_count_check
      check (sold_count >= 0);
  end if;
end $$;

create index if not exists restaurant_best_sellers_restaurant_idx
  on public.restaurant_best_sellers (restaurant_id, is_active, sold_count desc, updated_at desc);

create or replace function public.set_restaurant_best_sellers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_restaurant_best_sellers_updated_at
  on public.restaurant_best_sellers;

create trigger trg_restaurant_best_sellers_updated_at
before update on public.restaurant_best_sellers
for each row
execute function public.set_restaurant_best_sellers_updated_at();

alter table public.restaurant_best_sellers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_best_sellers'
      and policyname = 'restaurant_best_sellers_select_owner'
  ) then
    create policy restaurant_best_sellers_select_owner
      on public.restaurant_best_sellers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.restaurants r
          where r.id = restaurant_best_sellers.restaurant_id
            and r.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_best_sellers'
      and policyname = 'restaurant_best_sellers_insert_owner'
  ) then
    create policy restaurant_best_sellers_insert_owner
      on public.restaurant_best_sellers
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.restaurants r
          where r.id = restaurant_best_sellers.restaurant_id
            and r.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_best_sellers'
      and policyname = 'restaurant_best_sellers_update_owner'
  ) then
    create policy restaurant_best_sellers_update_owner
      on public.restaurant_best_sellers
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.restaurants r
          where r.id = restaurant_best_sellers.restaurant_id
            and r.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.restaurants r
          where r.id = restaurant_best_sellers.restaurant_id
            and r.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_best_sellers'
      and policyname = 'restaurant_best_sellers_delete_owner'
  ) then
    create policy restaurant_best_sellers_delete_owner
      on public.restaurant_best_sellers
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.restaurants r
          where r.id = restaurant_best_sellers.restaurant_id
            and r.owner_id = auth.uid()
        )
      );
  end if;
end $$;

commit;

