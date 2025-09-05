-- Generate DOT numbers for any carrier_profiles missing one (idempotent)
-- Skips rows that already have dot_number set
UPDATE carrier_profiles
SET dot_number = LPAD((FLOOR(random()*10000000))::text, 7, '0')
WHERE dot_number IS NULL;

-- Show a few updated rows for verification (optional; harmless if none)
SELECT id, user_id, dot_number FROM carrier_profiles ORDER BY updated_at DESC LIMIT 10;