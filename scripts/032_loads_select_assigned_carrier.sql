-- Allow carriers to select loads if they have an assignment for that load
create policy "loads_select_assigned_carrier" on public.loads
for select using (
  exists (
    select 1 from public.assignments a
    where a.load_id = id and a.carrier_user_id = auth.uid()
  )
);
