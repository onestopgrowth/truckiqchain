-- Final fix for infinite recursion: redefine the carrier visibility policy without self-referencing subquery
-- Remove any previous variants
drop policy if exists "profiles_select_carriers_by_capacity_finders" on public.profiles;
drop policy if exists profiles_select_carriers_public on public.profiles;

create policy "profiles_select_carriers_by_capacity_finders" on public.profiles
for select using (
  -- Allow a user to read their own row OR any carrier row (MVP scope)
  auth.uid() = id OR role = 'carrier'
);
