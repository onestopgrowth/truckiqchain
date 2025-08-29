-- Create profiles table that references auth.users
-- This will store user role information (carrier or capacity_finder)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('carrier', 'capacity_finder')),
  company_name text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Allow capacity_finders to view carrier profiles for matching
create policy "profiles_select_carriers_by_capacity_finders"
  on public.profiles for select
  using (
    role = 'carrier' and 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'capacity_finder'
    )
  );
