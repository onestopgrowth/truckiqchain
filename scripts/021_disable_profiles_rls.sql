-- Temporary workaround: disable RLS on profiles to avoid infinite recursion during upsert
alter table public.profiles disable row level security;
