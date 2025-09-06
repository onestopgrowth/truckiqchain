-- Add profile photo URL to carrier_profiles
ALTER TABLE public.carrier_profiles
  ADD COLUMN IF NOT EXISTS photo_url text;
