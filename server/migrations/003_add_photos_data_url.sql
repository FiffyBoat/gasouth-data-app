-- Migration 003: Add data_url column to photos table
-- Needed for Render ephemeral disk persistence fallback
-- (photo binary stored as base64 data URI in DB when disk is wiped on redeploy)

ALTER TABLE photos ADD COLUMN IF NOT EXISTS data_url TEXT;
