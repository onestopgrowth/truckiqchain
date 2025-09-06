-- Break recursive RLS between loads and assignments by denormalizing load owner on assignments
-- Adds load_owner_user_id and rewrites assignments policies to avoid referencing loads

alter table public.assignments
  add column if not exists load_owner_user_id uuid;

-- Backfill existing rows
update public.assignments a
set load_owner_user_id = l.user_id
from public.loads l
where a.load_id = l.id and a.load_owner_user_id is null;

-- Trigger to set load_owner_user_id on insert
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

-- Rewrite policies to remove references to loads (break recursion)
drop policy if exists assignments_select_parties on public.assignments;
create policy assignments_select_parties on public.assignments
for select using (
  carrier_user_id = auth.uid() or load_owner_user_id = auth.uid()
);

drop policy if exists assignments_update_owner on public.assignments;
create policy assignments_update_owner on public.assignments
for update using ( load_owner_user_id = auth.uid() );
