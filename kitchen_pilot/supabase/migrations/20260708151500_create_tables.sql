-- Tables schema definition
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number text not null,
  name text not null,
  capacity integer not null default 4,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

grant select, insert, update, delete on public.tables to authenticated;
grant all on public.tables to service_role;

alter table public.tables enable row level security;

create policy "Owners manage their tables"
on public.tables for all to authenticated
using (
  exists (select 1 from public.restaurants r
    where r.id = tables.restaurant_id and r.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.restaurants r
    where r.id = tables.restaurant_id and r.owner_id = auth.uid())
);

create trigger trg_tables_updated
before update on public.tables
for each row execute function public.tg_set_updated_at();
