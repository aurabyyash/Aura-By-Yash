create table if not exists public.site_assets (
  key text primary key,
  image_urls text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

alter table public.site_assets enable row level security;

drop policy if exists "site_assets_public_read" on public.site_assets;
create policy "site_assets_public_read"
on public.site_assets for select
to anon, authenticated
using (true);

drop policy if exists "site_assets_admin_insert" on public.site_assets;
create policy "site_assets_admin_insert"
on public.site_assets for insert
to authenticated
with check (public.is_admin());

drop policy if exists "site_assets_admin_update" on public.site_assets;
create policy "site_assets_admin_update"
on public.site_assets for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "site_assets_admin_delete" on public.site_assets;
create policy "site_assets_admin_delete"
on public.site_assets for delete
to authenticated
using (public.is_admin());

insert into public.site_assets (key, image_urls)
values ('front-image', array[]::text[])
on conflict (key) do nothing;
