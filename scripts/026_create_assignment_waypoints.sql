-- Waypoints captured during in-transit updates
create table if not exists public.assignment_waypoints (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  lat double precision,
  lon double precision,
  note text,
  created_at timestamptz not null default now()
);

alter table public.assignment_waypoints enable row level security;

-- Carrier on the assignment or owner of the load can view/insert waypoints
drop policy if exists assignment_waypoints_access on public.assignment_waypoints;
create policy assignment_waypoints_access on public.assignment_waypoints
for all using (
  exists (
    select 1 from public.assignments a
    join public.loads l on l.id = a.load_id
    where a.id = assignment_id
      and (a.carrier_user_id = auth.uid() or l.user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.assignments a
    join public.loads l on l.id = a.load_id
    where a.id = assignment_id
      and (a.carrier_user_id = auth.uid() or l.user_id = auth.uid())
  )
);

create index if not exists assignment_waypoints_assignment_idx on public.assignment_waypoints(assignment_id);
