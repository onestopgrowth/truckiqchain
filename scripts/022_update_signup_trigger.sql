-- Ensure robust signup trigger does not fail user creation
-- Recreate function and trigger explicitly to pick up latest logic

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, role, company_name)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'role', 'carrier'),
      coalesce(new.raw_user_meta_data ->> 'company_name', null)
    )
    on conflict (id) do nothing;
  exception when others then
    -- do not block signup
    null;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
