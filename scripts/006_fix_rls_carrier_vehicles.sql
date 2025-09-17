-- 006_fix_rls_carrier_vehicles.sql
-- Allow insert for own carrier profile on carrier_vehicles
CREATE POLICY "Allow insert for own carrier profile"
ON carrier_vehicles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carrier_profiles
    WHERE carrier_profiles.id = carrier_vehicles.carrier_profile_id
      AND carrier_profiles.user_id = auth.uid()
  )
);
-- Allow delete for own carrier profile on carrier_vehicles
CREATE POLICY "Allow delete for own carrier profile"
ON carrier_vehicles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM carrier_profiles
    WHERE carrier_profiles.id = carrier_vehicles.carrier_profile_id
      AND carrier_profiles.user_id = auth.uid()
  )
);
