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

create table if not exists public.ridgeline_visits (
  id bigserial primary key,
  visit_id text not null,
  seen_at timestamptz not null default now(),
  page text not null,
  page_path text not null default '',
  page_title text not null default '',
  visitor_name text,
  referrer text,
  browser_label text,
  language text,
  timezone text,
  viewport text,
  screen_size text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.garage_kv enable row level security;
alter table public.ridgeline_visits enable row level security;

insert into public.garage_kv (device_id, storage_key, payload, updated_at, created_at)
select
  'ridgeline-site-memory' as device_id,
  latest.storage_key,
  latest.payload,
  latest.updated_at,
  latest.created_at
from (
  select distinct on (storage_key)
    storage_key,
    payload,
    updated_at,
    created_at,
    device_id,
    id
  from public.garage_kv
  order by
    storage_key,
    case when device_id = 'ridgeline-site-memory' then 0 else 1 end,
    updated_at desc,
    id desc
) as latest
on conflict (device_id, storage_key) do update
set
  payload = excluded.payload,
  updated_at = excluded.updated_at;

create or replace function public.ridgeline_is_owner()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'vicente.diaz.sal@gmail.com';
$$;

drop policy if exists ridgeline_visits_select on public.ridgeline_visits;
create policy ridgeline_visits_select
on public.ridgeline_visits
for select
to authenticated
using (public.ridgeline_is_owner());

drop policy if exists ridgeline_visits_insert on public.ridgeline_visits;
create policy ridgeline_visits_insert
on public.ridgeline_visits
for insert
to anon, authenticated
with check (
  char_length(coalesce(page, '')) > 0
  and char_length(coalesce(page, '')) <= 120
  and char_length(coalesce(page_path, '')) <= 300
  and char_length(coalesce(page_title, '')) <= 200
  and char_length(coalesce(visitor_name, '')) <= 80
);

drop policy if exists ridgeline_visits_delete on public.ridgeline_visits;
create policy ridgeline_visits_delete
on public.ridgeline_visits
for delete
to authenticated
using (public.ridgeline_is_owner());

drop policy if exists garage_kv_select on public.garage_kv;
create policy garage_kv_select
on public.garage_kv
for select
to anon, authenticated
using (device_id = 'ridgeline-site-memory');

drop policy if exists garage_kv_insert on public.garage_kv;
create policy garage_kv_insert
on public.garage_kv
for insert
to authenticated
with check (
  public.ridgeline_is_owner()
  and device_id = 'ridgeline-site-memory'
);

drop policy if exists garage_kv_update on public.garage_kv;
create policy garage_kv_update
on public.garage_kv
for update
to authenticated
using (
  public.ridgeline_is_owner()
  and device_id = 'ridgeline-site-memory'
)
with check (
  public.ridgeline_is_owner()
  and device_id = 'ridgeline-site-memory'
);

drop policy if exists garage_kv_delete on public.garage_kv;
create policy garage_kv_delete
on public.garage_kv
for delete
to authenticated
using (
  public.ridgeline_is_owner()
  and device_id = 'ridgeline-site-memory'
);

-- Shared public-read storage buckets for Ridgeline photos.
insert into storage.buckets (id, name, public)
values ('2019 Honda Ridgeline Main', '2019 Honda Ridgeline Main', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values ('2019-honda-ridgeline-main', '2019-honda-ridgeline-main', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists ridgeline_bucket_select on storage.objects;
create policy ridgeline_bucket_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id in ('2019 Honda Ridgeline Main', '2019-honda-ridgeline-main')
);

drop policy if exists ridgeline_bucket_insert on storage.objects;
create policy ridgeline_bucket_insert
on storage.objects
for insert
to authenticated
with check (
  public.ridgeline_is_owner()
  and bucket_id in ('2019 Honda Ridgeline Main', '2019-honda-ridgeline-main')
  and split_part(name, '/', 1) = 'ridgeline-site-memory'
);

drop policy if exists ridgeline_bucket_update on storage.objects;
create policy ridgeline_bucket_update
on storage.objects
for update
to authenticated
using (
  public.ridgeline_is_owner()
  and bucket_id in ('2019 Honda Ridgeline Main', '2019-honda-ridgeline-main')
)
with check (
  public.ridgeline_is_owner()
  and bucket_id in ('2019 Honda Ridgeline Main', '2019-honda-ridgeline-main')
);

drop policy if exists ridgeline_bucket_delete on storage.objects;
create policy ridgeline_bucket_delete
on storage.objects
for delete
to authenticated
using (
  public.ridgeline_is_owner()
  and bucket_id in ('2019 Honda Ridgeline Main', '2019-honda-ridgeline-main')
);
