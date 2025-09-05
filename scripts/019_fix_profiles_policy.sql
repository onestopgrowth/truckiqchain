-- Replace recursive carrier visibility policy to avoid infinite recursion error
drop policy if exists "profiles_select_carriers_by_capacity_finders" on public.profiles;
create policy profiles_select_carriers_public on public.profiles
for select using (
  -- allow own row or any carrier row (MVP simplification; tighten later)
  auth.uid() = id or role = 'carrier'
);
