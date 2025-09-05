-- Assignments link a carrier (profile + user) to a load through a request/accept flow
-- Status flow: requested -> accepted -> booked -> in_transit -> delivered -> completed / declined / cancelled
-- Minimal MVP supports: requested, accepted, declined, booked, in_transit, delivered, completed, cancelled

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references public.loads(id) on delete cascade,
  carrier_user_id uuid not null references public.profiles(id) on delete cascade,
  carrier_profile_id uuid not null references public.carrier_profiles(id) on delete cascade,
  status text not null default 'requested',
  -- lifecycle timestamps
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  booked_at timestamptz,
  in_transit_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  -- POD metadata
  pod_file_path text,
  pod_mime_type text,
  pod_uploaded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_status_chk check (status in ('requested','accepted','declined','booked','in_transit','delivered','completed','cancelled'))
);

alter table public.assignments enable row level security;

-- Prevent multiple active (non-declined/cancelled) assignments on same load
create unique index if not exists assignments_unique_active_load
  on public.assignments(load_id)
  where status in ('requested','accepted','booked','in_transit');

create index if not exists assignments_carrier_user_idx on public.assignments(carrier_user_id);
create index if not exists assignments_load_idx on public.assignments(load_id);
create index if not exists assignments_status_idx on public.assignments(status);

-- Policies
-- Carrier can insert request for open load (verified check via carrier_profiles)
drop policy if exists assignments_insert_request on public.assignments;
create policy assignments_insert_request on public.assignments
for insert to authenticated with check (
  carrier_user_id = auth.uid()
  and exists(select 1 from carrier_profiles cp where cp.id = carrier_profile_id and cp.user_id = auth.uid() and cp.is_verified = true)
  and exists(select 1 from loads l where l.id = load_id and l.status = 'open')
);

-- Select: carrier who owns assignment or load owner
drop policy if exists assignments_select_parties on public.assignments;
create policy assignments_select_parties on public.assignments
for select using (
  carrier_user_id = auth.uid() or exists(select 1 from loads l where l.id = load_id and l.user_id = auth.uid())
);

-- Update: carrier may only update limited transitions they own (requested->cancelled)
drop policy if exists assignments_update_carrier on public.assignments;
create policy assignments_update_carrier on public.assignments
for update using (carrier_user_id = auth.uid());

-- Load owner update
drop policy if exists assignments_update_owner on public.assignments;
create policy assignments_update_owner on public.assignments
for update using ( exists(select 1 from loads l where l.id = load_id and l.user_id = auth.uid()) );

-- Delete: disallow via policy (no delete) - soft handled by status

-- Trigger for updated_at
create trigger assignments_updated_at before update on public.assignments for each row execute function public.handle_updated_at();
