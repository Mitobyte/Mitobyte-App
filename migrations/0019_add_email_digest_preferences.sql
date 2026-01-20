-- Migration: Add email digest preferences to user_settings
-- Database: Cloudflare D1 (SQLite)
-- Description: Add daily and weekly digest preferences for email reminders

-- Add daily_digest column if it doesn't exist
ALTER TABLE user_settings ADD COLUMN daily_digest INTEGER DEFAULT 0;

-- Add weekly_digest column if it doesn't exist
ALTER TABLE user_settings ADD COLUMN weekly_digest INTEGER DEFAULT 1;

-- Add reminder_sent flag to events table to track if deadline reminder was sent
ALTER TABLE events ADD COLUMN reminder_sent INTEGER DEFAULT 0;

-- Create index on reminder_sent for efficient queries
CREATE INDEX IF NOT EXISTS idx_events_reminder_sent ON events(reminder_sent);
