alter table public.orders
add column if not exists completed_at timestamptz,
add column if not exists completion_email_sent boolean not null default false,
add column if not exists completion_email_error text;

create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);
