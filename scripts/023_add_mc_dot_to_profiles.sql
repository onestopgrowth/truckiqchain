-- Add DOT and MC number fields to profiles to capture during signup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS mc_number text;
