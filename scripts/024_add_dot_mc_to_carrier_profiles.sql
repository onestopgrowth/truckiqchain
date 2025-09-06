-- Ensure DOT and MC numbers exist on carrier_profiles
ALTER TABLE public.carrier_profiles
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS mc_number text;
