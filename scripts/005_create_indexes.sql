-- Create indexes for better query performance

-- Profiles indexes
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- Carrier profiles indexes
create index if not exists carrier_profiles_user_id_idx on public.carrier_profiles(user_id);
create index if not exists carrier_profiles_equipment_type_idx on public.carrier_profiles(equipment_type);
create index if not exists carrier_profiles_xp_score_idx on public.carrier_profiles(xp_score);
create index if not exists carrier_profiles_availability_idx on public.carrier_profiles(availability_status);
create index if not exists carrier_profiles_location_idx on public.carrier_profiles(location_state, location_city);

-- Capacity calls indexes
create index if not exists capacity_calls_user_id_idx on public.capacity_calls(user_id);
create index if not exists capacity_calls_equipment_needed_idx on public.capacity_calls(equipment_needed);
create index if not exists capacity_calls_minimum_xp_idx on public.capacity_calls(minimum_xp_score);
create index if not exists capacity_calls_status_idx on public.capacity_calls(status);
create index if not exists capacity_calls_origin_idx on public.capacity_calls(origin_state, origin_city);
create index if not exists capacity_calls_destination_idx on public.capacity_calls(destination_state, destination_city);
create index if not exists capacity_calls_pickup_date_idx on public.capacity_calls(pickup_date);

-- Composite indexes for matching queries
create index if not exists carrier_profiles_matching_idx on public.carrier_profiles(equipment_type, xp_score, availability_status);
create index if not exists capacity_calls_matching_idx on public.capacity_calls(equipment_needed, minimum_xp_score, status);
