-- Adds a verification flag to carrier_profiles
ALTER TABLE carrier_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Optional index
CREATE INDEX IF NOT EXISTS carrier_profiles_is_verified_idx ON carrier_profiles(is_verified);
