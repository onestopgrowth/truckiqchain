-- Add commonly referenced columns used by CarrierProfileForm
ALTER TABLE public.carrier_profiles
  ADD COLUMN IF NOT EXISTS capacity_weight numeric NULL,
  ADD COLUMN IF NOT EXISTS capacity_length numeric NULL,
  ADD COLUMN IF NOT EXISTS capacity_width numeric NULL,
  ADD COLUMN IF NOT EXISTS capacity_height numeric NULL,
  ADD COLUMN IF NOT EXISTS location_zip varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS notes text NULL;
