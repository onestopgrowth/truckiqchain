-- Create capacity_calls table for capacity finder requests

create table if not exists public.capacity_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  
  -- Origin information
  origin_city text not null,
  origin_state text not null,
  origin_zip text,
  origin_address text,
  
  -- Destination information
  destination_city text not null,
  destination_state text not null,
  destination_zip text,
  destination_address text,
  
  -- Requirements
  equipment_needed text not null check (equipment_needed in (
    'flatbed', 'dry_van', 'refrigerated', 'tanker', 'container', 
    'lowboy', 'step_deck', 'double_drop', 'removable_gooseneck'
  )),
  minimum_xp_score integer not null check (minimum_xp_score >= 0 and minimum_xp_score <= 100),
  
  -- Load details
  weight integer, -- in pounds
  length integer, -- in feet
  width integer, -- in feet
  height integer, -- in feet
  
  -- Timing
  pickup_date date,
  delivery_date date,
  
  -- Pricing
  rate_per_mile decimal(10,2),
  total_rate decimal(10,2),
  
  -- Status
  status text not null check (status in ('open', 'assigned', 'in_transit', 'completed', 'cancelled')) default 'open',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure only capacity_finders can create capacity calls
  constraint capacity_calls_user_role_check check (
    exists (
      select 1 from public.profiles p 
      where p.id = user_id and p.role = 'capacity_finder'
    )
  )
);

-- Enable RLS
alter table public.capacity_calls enable row level security;

-- RLS policies for capacity_calls
create policy "capacity_calls_select_all"
  on public.capacity_calls for select
  using (true); -- All authenticated users can view capacity calls

create policy "capacity_calls_insert_own"
  on public.capacity_calls for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );

create policy "capacity_calls_update_own"
  on public.capacity_calls for update
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );

create policy "capacity_calls_delete_own"
  on public.capacity_calls for delete
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );
