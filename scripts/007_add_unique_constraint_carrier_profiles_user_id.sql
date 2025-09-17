-- 007_add_unique_constraint_carrier_profiles_user_id.sql
-- Remove duplicate carrier_profiles for the same user, keeping the most recent
DELETE FROM carrier_profiles
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM carrier_profiles
  ) t
  WHERE t.rn = 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE carrier_profiles
ADD CONSTRAINT carrier_profiles_user_id_unique UNIQUE (user_id);
