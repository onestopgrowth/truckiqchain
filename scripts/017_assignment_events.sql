-- Emit events for assignment lifecycle via triggers

create or replace function public.emit_assignment_event() returns trigger as $$
declare
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := 'load.requested';
  elsif tg_op = 'UPDATE' then
    if new.status <> old.status then
      if new.status = 'accepted' then v_type := 'load.accepted';
      elsif new.status = 'declined' then v_type := 'load.declined';
      elsif new.status = 'booked' then v_type := 'load.booked';
      elsif new.status = 'in_transit' then v_type := 'load.in_transit';
      elsif new.status = 'delivered' then v_type := 'load.delivered';
      elsif new.status = 'completed' then v_type := 'load.completed';
      elsif new.status = 'cancelled' then v_type := 'load.cancelled';
      end if;
    end if;
  end if;
  if v_type is not null then
    insert into events(event_type, user_id, payload)
      values (v_type, new.carrier_user_id, jsonb_build_object('assignment_id', new.id, 'load_id', new.load_id, 'status', new.status));
  end if;
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_assignment_events_insert on public.assignments;
create trigger trg_assignment_events_insert after insert on public.assignments for each row execute function public.emit_assignment_event();

drop trigger if exists trg_assignment_events_update on public.assignments;
create trigger trg_assignment_events_update after update on public.assignments for each row execute function public.emit_assignment_event();
