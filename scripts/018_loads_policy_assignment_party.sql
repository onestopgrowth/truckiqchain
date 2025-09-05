-- Allow carriers involved in assignments to read the related load even if not open
alter table public.loads enable row level security;
drop policy if exists loads_select_assignment_party on public.loads;
create policy loads_select_assignment_party on public.loads
for select using (
  exists (select 1 from assignments a where a.load_id = id and a.carrier_user_id = auth.uid())
);
