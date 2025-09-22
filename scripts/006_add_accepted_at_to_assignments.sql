-- 006_add_accepted_at_to_assignments.sql
ALTER TABLE assignments ADD COLUMN accepted_at timestamptz NULL;
ALTER TABLE assignments ADD COLUMN capacity_call_id uuid NULL;
