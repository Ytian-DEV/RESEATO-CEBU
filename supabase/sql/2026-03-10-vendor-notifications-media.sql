begin;

create extension if not exists pgcrypto;

alter table if exists public.restaurants
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  link text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_insert_own'
  ) then
    create policy notifications_insert_own
      on public.notifications
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_delete_own'
  ) then
    create policy notifications_delete_own
      on public.notifications
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-images',
  'restaurant-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'restaurant_images_public_read'
  ) then
    create policy restaurant_images_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'restaurant-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'restaurant_images_upload_own'
  ) then
    create policy restaurant_images_upload_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'restaurant-images'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'restaurant_images_update_own'
  ) then
    create policy restaurant_images_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'restaurant-images'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'restaurant-images'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'restaurant_images_delete_own'
  ) then
    create policy restaurant_images_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'restaurant-images'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;

commit;
