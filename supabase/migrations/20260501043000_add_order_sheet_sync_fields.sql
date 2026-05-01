alter table public.orders
add column if not exists sheet_synced_at timestamptz,
add column if not exists sheet_sync_error text;
