-- Add uniqueness constraints to prevent duplicate stored docs
ALTER TABLE carrier_documents ADD CONSTRAINT carrier_documents_file_hash_unique UNIQUE (file_hash);
-- Avoid duplicate file paths (public storage path collisions)
ALTER TABLE carrier_documents ADD CONSTRAINT carrier_documents_file_path_unique UNIQUE (file_path);
