-- Enable RLS (safe to run multiple times)
ALTER TABLE carrier_availability ENABLE ROW LEVEL SECURITY;

-- Recreate policies (DROP + CREATE) because CREATE POLICY does not support IF NOT EXISTS on current Postgres versions

-- Insert policy
DROP POLICY IF EXISTS carrier_availability_insert_owner ON carrier_availability;
CREATE POLICY carrier_availability_insert_owner ON carrier_availability
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM carrier_profiles cp
    WHERE cp.id = carrier_profile_id
      AND cp.user_id = auth.uid()
      AND cp.is_verified = TRUE
  )
);

-- Select own
DROP POLICY IF EXISTS carrier_availability_select_owner ON carrier_availability;
CREATE POLICY carrier_availability_select_owner ON carrier_availability
FOR SELECT TO authenticated USING ( user_id = auth.uid() );

-- Update own
DROP POLICY IF EXISTS carrier_availability_update_owner ON carrier_availability;
CREATE POLICY carrier_availability_update_owner ON carrier_availability
FOR UPDATE TO authenticated USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );

-- Admin read
DROP POLICY IF EXISTS carrier_availability_select_admin ON carrier_availability;
CREATE POLICY carrier_availability_select_admin ON carrier_availability
FOR SELECT TO authenticated USING (
  EXISTS ( SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
