create table if not exists public.categories (
  id text primary key,
  name text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
on public.categories for insert
to authenticated
with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
on public.categories for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
on public.categories for delete
to authenticated
using (public.is_admin());

insert into public.categories (id, name, sort_order)
values
  ('necklaces', 'Necklaces', 10),
  ('rings', 'Rings', 20),
  ('bracelets', 'Bracelets', 30),
  ('earrings', 'Earrings', 40)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.site_assets (key, image_urls)
values ('front-mobile-image', array[]::text[])
on conflict (key) do nothing;
