-- Add exclusion constraint to prevent overlapping availability windows for the same carrier_profile (simple check)
-- Using a btree_gist extension for range overlap would be ideal; for MVP we do a trigger check.

-- Simple function to block overlaps (same carrier_profile_id, time overlaps)
create or replace function public.prevent_availability_overlap() returns trigger as $$
declare
  v_conflict uuid;
begin
  select id into v_conflict from carrier_availability
    where carrier_profile_id = new.carrier_profile_id
      and tstzrange(start_at, end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;
  if v_conflict is not null then
    raise exception 'overlapping_availability';
  end if;
  return new;
end;$$ language plpgsql;

-- Ensure btree_gist ext (safe repeat)
create extension if not exists btree_gist;

-- Add trigger (upsert safe)
drop trigger if exists trg_prevent_availability_overlap on carrier_availability;
create trigger trg_prevent_availability_overlap
  before insert or update on carrier_availability
  for each row execute function public.prevent_availability_overlap();

-- RLS already allows update (owner). Add delete policy for owner.
drop policy if exists carrier_availability_delete_owner on carrier_availability;
create policy carrier_availability_delete_owner on carrier_availability
for delete to authenticated using ( user_id = auth.uid() );
