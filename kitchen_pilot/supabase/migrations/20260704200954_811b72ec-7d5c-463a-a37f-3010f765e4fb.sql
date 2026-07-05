
-- Enums
do $$ begin
  create type public.delivery_provider as enum ('swiggy','zomato','ondc','magicpin','rapido','website','mobile_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sync_status as enum ('idle','syncing','success','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_order_status as enum ('accepted','preparing','ready','picked_up','delivered','cancelled');
exception when duplicate_object then null; end $$;

-- Integrations
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider public.delivery_provider not null,
  connected boolean not null default false,
  api_key text,
  secret_key text,
  webhook_url text,
  sync_status public.sync_status not null default 'idle',
  last_sync_at timestamptz,
  last_error text,
  config jsonb not null default '{}'::jsonb,
  price_markup_pct numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

grant select, insert, update, delete on public.integrations to authenticated;
grant all on public.integrations to service_role;

alter table public.integrations enable row level security;

create policy "Owners manage their integrations"
on public.integrations for all to authenticated
using (
  exists (select 1 from public.restaurants r
    where r.id = integrations.restaurant_id and r.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.restaurants r
    where r.id = integrations.restaurant_id and r.owner_id = auth.uid())
);

create trigger trg_integrations_updated
before update on public.integrations
for each row execute function public.tg_set_updated_at();

-- Delivery orders
create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider public.delivery_provider not null,
  external_order_id text not null,
  status public.delivery_order_status not null default 'accepted',
  customer_name text,
  delivery_address text,
  items jsonb not null default '[]'::jsonb,
  special_instructions text,
  delivery_partner text,
  eta_pickup timestamptz,
  eta_delivery timestamptz,
  payment_status text,
  payment_mode text,
  subtotal numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_order_id, restaurant_id)
);

grant select, insert, update, delete on public.delivery_orders to authenticated;
grant all on public.delivery_orders to service_role;

alter table public.delivery_orders enable row level security;

create policy "Owners manage their delivery orders"
on public.delivery_orders for all to authenticated
using (
  exists (select 1 from public.restaurants r
    where r.id = delivery_orders.restaurant_id and r.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.restaurants r
    where r.id = delivery_orders.restaurant_id and r.owner_id = auth.uid())
);

create trigger trg_delivery_orders_updated
before update on public.delivery_orders
for each row execute function public.tg_set_updated_at();

create index delivery_orders_restaurant_placed_idx
  on public.delivery_orders (restaurant_id, placed_at desc);
create index delivery_orders_provider_idx
  on public.delivery_orders (restaurant_id, provider);

-- India default currency
alter table public.restaurants alter column currency set default 'INR';
