-- Reinstate RLS on profiles with non-recursive, safe policies
alter table public.profiles enable row level security;

-- Clean old policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "profiles_select_carriers_by_capacity_finders" on public.profiles;

-- Self CRUD
create policy profiles_self_select on public.profiles for select using (auth.uid() = id);
create policy profiles_self_update on public.profiles for update using (auth.uid() = id);
create policy profiles_self_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_self_delete on public.profiles for delete using (auth.uid() = id);

-- Capacity finders may select carriers
create policy profiles_select_carriers_for_capacity_finders on public.profiles
  for select using (
    role = 'carrier' and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capacity_finder')
  );

-- Admins may select all
create policy profiles_select_admin on public.profiles for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
