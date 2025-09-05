-- Create loads table for posted freight loads
-- Includes origin/destination (text granularity), equipment requirements, dates, weight, and basic status lifecycle

create table if not exists public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- shipper / capacity_finder owning profile (could extend later)
  title text,
  reference_number text,
  origin_city text not null,
  origin_state text not null,
  origin_zip text,
  destination_city text not null,
  destination_state text not null,
  destination_zip text,
  pickup_earliest timestamptz,
  pickup_latest timestamptz,
  delivery_earliest timestamptz,
  delivery_latest timestamptz,
  equipment_required text[] default '{}', -- e.g. ['dry_van','reefer']
  weight_lbs int,
  pieces int,
  length_feet numeric,
  notes text,
  status text not null default 'open', -- open | covered | cancelled | completed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loads enable row level security;

-- Basic indexes for search/filtering
create index if not exists loads_origin_idx on public.loads(origin_state, origin_city);
create index if not exists loads_destination_idx on public.loads(destination_state, destination_city);
create index if not exists loads_status_idx on public.loads(status);
create index if not exists loads_equipment_gin_idx on public.loads using gin(equipment_required);

-- Policies: owners manage; carriers (verified) can read open loads
create policy "loads_select_public" on public.loads for select using (
  status = 'open'
);

create policy "loads_select_owner" on public.loads for select using (
  auth.uid() = user_id
);

create policy "loads_insert_owner" on public.loads for insert with check (
  auth.uid() = user_id
);

create policy "loads_update_owner" on public.loads for update using (
  auth.uid() = user_id
);

create policy "loads_delete_owner" on public.loads for delete using (
  auth.uid() = user_id
);

-- updated_at trigger reuse if function exists
create trigger loads_updated_at before update on public.loads for each row execute function public.handle_updated_at();
