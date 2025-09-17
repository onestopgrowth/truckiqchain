-- Add carrier_profile_id column to assignments table
ALTER TABLE assignments ADD COLUMN carrier_profile_id uuid;
-- Optionally, add a foreign key constraint if desired:
-- ALTER TABLE assignments ADD CONSTRAINT assignments_carrier_profile_id_fkey FOREIGN KEY (carrier_profile_id) REFERENCES carrier_profiles(id) ON DELETE SET NULL;

-- Add load_id column to assignments table
ALTER TABLE assignments ADD COLUMN load_id uuid;


-- Allow users to insert assignments if they own the load
CREATE POLICY "Allow load owner to insert assignments"
ON assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loads
    WHERE loads.id = assignments.load_id
      AND loads.user_id = auth.uid()
  )
);

-- Ensure load_owner_user_id is set automatically on insert
create or replace function public.set_assignment_owner()
returns trigger
language plpgsql
as $$
begin
  if new.load_owner_user_id is null then
    select l.user_id into new.load_owner_user_id from public.loads l where l.id = new.load_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_assignment_owner_before_insert on public.assignments;
create trigger set_assignment_owner_before_insert
  before insert on public.assignments
  for each row
  execute function public.set_assignment_owner();
