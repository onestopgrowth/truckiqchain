-- Simplify loads policies to avoid recursive lookups
alter table public.loads enable row level security;

-- Drop any extra loads policies that might reference other tables in USING
drop policy if exists loads_select_assignment_party on public.loads;

-- Ensure core policies exist
drop policy if exists "loads_select_public" on public.loads;
create policy "loads_select_public" on public.loads for select using (
  status = 'open'
);

drop policy if exists "loads_select_owner" on public.loads;
create policy "loads_select_owner" on public.loads for select using (
  auth.uid() = user_id
);

drop policy if exists "loads_insert_owner" on public.loads;
create policy "loads_insert_owner" on public.loads for insert with check (
  auth.uid() = user_id
);

drop policy if exists "loads_update_owner" on public.loads;
create policy "loads_update_owner" on public.loads for update using (
  auth.uid() = user_id
);

drop policy if exists "loads_delete_owner" on public.loads;
create policy "loads_delete_owner" on public.loads for delete using (
  auth.uid() = user_id
);
