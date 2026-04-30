create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'yashsain684@gmail.com';
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  phone text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    username = coalesce(new.raw_user_meta_data ->> 'username', public.profiles.username),
    phone = coalesce(new.raw_user_meta_data ->> 'phone', public.profiles.phone),
    role = case
      when lower(new.email) = 'yashsain684@gmail.com' then 'admin'
      else 'customer'
    end,
    email_confirmed_at = new.email_confirmed_at,
    updated_at = now()
  where id = new.id;

  if not found then
    insert into public.profiles (
      id,
      email,
      username,
      phone,
      role,
      email_confirmed_at,
      updated_at
    )
    values (
      new.id,
      new.email,
      new.raw_user_meta_data ->> 'username',
      new.raw_user_meta_data ->> 'phone',
      case
        when lower(new.email) = 'yashsain684@gmail.com' then 'admin'
        else 'customer'
      end,
      new.email_confirmed_at,
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_from_auth_trigger on auth.users;
create trigger sync_profile_from_auth_trigger
after insert or update on auth.users
for each row execute function public.sync_profile_from_auth();

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  category_id text not null,
  name text not null,
  price numeric(10,2) not null default 0,
  rating text default 'New',
  material text,
  antitarnish text,
  description text,
  image_url text,
  image_urls text[] not null default array[]::text[],
  is_new boolean not null default false,
  is_hot boolean not null default false,
  is_ltd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists image_urls text[] not null default array[]::text[];

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'Placed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = 'customer');

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
on public.products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
on public.products for delete
to authenticated
using (public.is_admin());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

insert into public.products (id, category_id, name, price, rating, is_new, is_hot, is_ltd, material, antitarnish, image_url, image_urls)
values
  ('n1', 'necklaces', 'Celestial Star Chain', 1299, '5.0 (48)', true, false, false, 'Premium Sterling Silver', 'Yes', null, array[]::text[]),
  ('n2', 'necklaces', 'Void Pendant', 1099, '5.0 (29)', true, false, false, 'Stainless Steel', 'Yes', null, array[]::text[]),
  ('n3', 'necklaces', 'Diamond Cut Chain', 1599, '5.0 (19)', false, false, true, '18k Gold Plated', 'Yes', null, array[]::text[]),
  ('r1', 'rings', 'Eclipse Ring', 899, '5.0 (62)', false, true, false, 'Matte Black Steel', 'Yes', null, array[]::text[]),
  ('r2', 'rings', 'Signet Classic', 999, '4.0 (15)', false, false, false, 'Sterling Silver', 'Yes', null, array[]::text[]),
  ('b1', 'bracelets', 'Arc Bracelet', 749, '4.0 (35)', false, false, false, 'Leather & Steel', 'Yes', null, array[]::text[]),
  ('b2', 'bracelets', 'Cuban Link Cuff', 1199, '5.0 (42)', true, false, false, 'Titanium', 'Yes', null, array[]::text[]),
  ('e1', 'earrings', 'Dual Stud Earrings', 649, '4.0 (41)', false, false, false, 'Surgical Steel', 'Yes', null, array[]::text[]),
  ('e2', 'earrings', 'Cross Drop', 599, '5.0 (55)', false, false, false, 'Silver', 'Yes', null, array[]::text[])
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  price = excluded.price,
  rating = excluded.rating,
  is_new = excluded.is_new,
  is_hot = excluded.is_hot,
  is_ltd = excluded.is_ltd,
  material = excluded.material,
  antitarnish = excluded.antitarnish,
  image_url = excluded.image_url,
  image_urls = excluded.image_urls,
  updated_at = now();
