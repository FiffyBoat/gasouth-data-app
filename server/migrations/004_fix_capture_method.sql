-- Migration 004: Allow 'imported' capture_method and make it nullable
-- Required for bulk CSV/Excel imports from ZebraRMS and GSMA billing register

ALTER TABLE records DROP CONSTRAINT IF EXISTS records_capture_method_check;

ALTER TABLE records ADD CONSTRAINT records_capture_method_check
  CHECK (capture_method IN ('device-gps', 'averaged', 'manual-pin', 'imported'));

ALTER TABLE records ALTER COLUMN capture_method DROP NOT NULL;
