-- Create trigger to auto-create profile on user signup
-- This ensures every authenticated user has a profile record

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, role, company_name, dot_number, mc_number)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'role', 'carrier'), -- default to carrier
      coalesce(new.raw_user_meta_data ->> 'company_name', null),
      coalesce(new.raw_user_meta_data ->> 'dot_number', null),
      coalesce(new.raw_user_meta_data ->> 'mc_number', null)
    )
    on conflict (id) do nothing;
  exception when others then
    -- Avoid blocking signup if profile insert fails for any reason
    null;
  end;

  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Add updated_at triggers to all tables
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger carrier_profiles_updated_at
  before update on public.carrier_profiles
  for each row
  execute function public.handle_updated_at();

create trigger capacity_calls_updated_at
  before update on public.capacity_calls
  for each row
  execute function public.handle_updated_at();
