
-- Roles enum
create type public.app_role as enum ('super_admin','owner','manager','cashier','waiter','kitchen','inventory','accountant','delivery');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are viewable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Restaurants
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type text,
  cuisine text,
  address text,
  city text,
  country text,
  gst_number text,
  currency text not null default 'USD',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.restaurants to authenticated;
grant all on public.restaurants to service_role;
alter table public.restaurants enable row level security;
create policy "Owners can manage their restaurants" on public.restaurants for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- User roles (scoped optionally to a restaurant)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, restaurant_id)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can view their own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Security definer to check roles safely (avoids recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + assign default owner role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();
create trigger trg_restaurants_updated before update on public.restaurants for each row execute function public.tg_set_updated_at();
