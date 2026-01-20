-- Add badge columns to checkins table
-- Run this migration using: wrangler d1 execute mitobyte-voting --file=migrations/add_badge_columns.sql

ALTER TABLE checkins ADD COLUMN badge_image TEXT;
ALTER TABLE checkins ADD COLUMN badge_prompt TEXT;
