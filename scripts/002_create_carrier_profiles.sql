-- Create carrier_profiles table for carrier-specific information
-- Equipment types: flatbed, dry_van, refrigerated, tanker, container, etc.

create table if not exists public.carrier_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_type text not null check (equipment_type in (
    'flatbed', 'dry_van', 'refrigerated', 'tanker', 'container', 
    'lowboy', 'step_deck', 'double_drop', 'removable_gooseneck'
  )),
  xp_score integer not null check (xp_score >= 0 and xp_score <= 100),
  availability_status text not null check (availability_status in ('available', 'busy', 'unavailable')) default 'available',
  location_city text,
  location_state text,
  location_zip text,
  capacity_weight integer, -- in pounds
  capacity_length integer, -- in feet
  capacity_width integer, -- in feet
  capacity_height integer, -- in feet
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure only carriers can have carrier profiles
  constraint carrier_profiles_user_role_check check (
    exists (
      select 1 from public.profiles p 
      where p.id = user_id and p.role = 'carrier'
    )
  )
);

-- Enable RLS
alter table public.carrier_profiles enable row level security;

-- RLS policies for carrier_profiles
create policy "carrier_profiles_select_own"
  on public.carrier_profiles for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );

create policy "carrier_profiles_insert_own"
  on public.carrier_profiles for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'carrier'
    )
  );

create policy "carrier_profiles_update_own"
  on public.carrier_profiles for update
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'carrier'
    )
  );

create policy "carrier_profiles_delete_own"
  on public.carrier_profiles for delete
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'carrier'
    )
  );
