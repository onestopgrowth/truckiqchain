-- 008_add_in_transit_at_to_assignments.sql
ALTER TABLE assignments ADD COLUMN in_transit_at timestamptz NULL;
