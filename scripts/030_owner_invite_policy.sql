-- Allow load owners to create assignment invitations (requested) for a carrier
-- Requires: load_owner_user_id set via trigger, load belongs to owner and is active, valid carrier profile

alter table public.assignments enable row level security;

drop policy if exists assignments_insert_owner on public.assignments;
create policy assignments_insert_owner on public.assignments
for insert to authenticated
with check (
  -- Trigger set_assignment_owner() fills this before RLS check
  load_owner_user_id = auth.uid()
  and status = 'requested'
  and exists (
    select 1 from public.loads l
    where l.id = load_id and l.user_id = auth.uid() and l.status in ('open','accepted','booked')
  )
  and exists (
    select 1 from public.carrier_profiles cp
    where cp.id = carrier_profile_id and cp.user_id = carrier_user_id and coalesce(cp.is_verified, true) = true
  )
);
