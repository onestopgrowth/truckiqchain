-- 007_add_booked_at_to_assignments.sql
ALTER TABLE assignments ADD COLUMN booked_at timestamptz NULL;
