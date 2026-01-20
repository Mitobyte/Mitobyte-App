-- Add fediverse publishing preference to users table
-- Migration: 0021_add_fediverse_publishing_setting.sql

ALTER TABLE users ADD COLUMN publish_votes_to_fediverse BOOLEAN NOT NULL DEFAULT 0;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_fediverse_publishing ON users(publish_votes_to_fediverse);
