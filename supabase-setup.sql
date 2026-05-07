-- Ridgeline Garage cloud sync table
create table if not exists public.garage_kv (
  id bigserial primary key,
  device_id text not null,
  storage_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (device_id, storage_key)
);

alter table public.garage_kv enable row level security;

-- Current client integration uses publishable key without user auth.
-- This keeps setup simple for now.
drop policy if exists garage_kv_select on public.garage_kv;
create policy garage_kv_select
on public.garage_kv
for select
to anon, authenticated
using (true);

drop policy if exists garage_kv_insert on public.garage_kv;
create policy garage_kv_insert
on public.garage_kv
for insert
to anon, authenticated
with check (true);

drop policy if exists garage_kv_update on public.garage_kv;
create policy garage_kv_update
on public.garage_kv
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists garage_kv_delete on public.garage_kv;
create policy garage_kv_delete
on public.garage_kv
for delete
to anon, authenticated
using (true);

-- Private storage bucket for Ridgeline photos.
insert into storage.buckets (id, name, public)
values ('2019 Honda Ridgeline Main', '2019 Honda Ridgeline Main', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Allow the client to list, read, write, update, and delete objects in this bucket.
drop policy if exists ridgeline_bucket_select on storage.objects;
create policy ridgeline_bucket_select
on storage.objects
for select
to anon, authenticated
using (bucket_id = '2019 Honda Ridgeline Main');

drop policy if exists ridgeline_bucket_insert on storage.objects;
create policy ridgeline_bucket_insert
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = '2019 Honda Ridgeline Main');

drop policy if exists ridgeline_bucket_update on storage.objects;
create policy ridgeline_bucket_update
on storage.objects
for update
to anon, authenticated
using (bucket_id = '2019 Honda Ridgeline Main')
with check (bucket_id = '2019 Honda Ridgeline Main');

drop policy if exists ridgeline_bucket_delete on storage.objects;
create policy ridgeline_bucket_delete
on storage.objects
for delete
to anon, authenticated
using (bucket_id = '2019 Honda Ridgeline Main');
