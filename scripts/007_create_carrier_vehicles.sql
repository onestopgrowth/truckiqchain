-- Create carrier_vehicles table for fleet vehicles

create table if not exists public.carrier_vehicles (
  id uuid primary key default gen_random_uuid(),
  carrier_profile_id uuid not null references public.carrier_profiles(id) on delete cascade,
  vin text,
  year integer,
  make text,
  model text,
  trailer_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.carrier_vehicles enable row level security;

-- Allow owners (via carrier_profile.user_id) to select, insert, update, delete
create policy "carrier_vehicles_select_own"
  on public.carrier_vehicles for select
  using (
    exists (
      select 1 from public.carrier_profiles cp where cp.id = carrier_profile_id and cp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );

create policy "carrier_vehicles_insert_own"
  on public.carrier_vehicles for insert
  with check (
    exists (
      select 1 from public.carrier_profiles cp where cp.id = carrier_profile_id and cp.user_id = auth.uid()
    )
  );

create policy "carrier_vehicles_update_own"
  on public.carrier_vehicles for update
  using (
    exists (
      select 1 from public.carrier_profiles cp where cp.id = carrier_profile_id and cp.user_id = auth.uid()
    )
  );

create policy "carrier_vehicles_delete_own"
  on public.carrier_vehicles for delete
  using (
    exists (
      select 1 from public.carrier_profiles cp where cp.id = carrier_profile_id and cp.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists carrier_vehicles_profile_idx on public.carrier_vehicles(carrier_profile_id);
create index if not exists carrier_vehicles_vin_idx on public.carrier_vehicles(vin);
