-- Stores carrier availability windows; carriers must be verified
CREATE TABLE IF NOT EXISTS carrier_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  carrier_profile_id uuid NOT NULL REFERENCES carrier_profiles(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  radius_miles int,
  equipment text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carrier_availability_user_idx ON carrier_availability(user_id);
CREATE INDEX IF NOT EXISTS carrier_availability_carrier_profile_idx ON carrier_availability(carrier_profile_id);