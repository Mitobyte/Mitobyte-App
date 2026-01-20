-- Migration: Add missing columns to events table (parent_event_id, check_in_code)
-- Database: Cloudflare D1 (SQLite)

-- Add parent_event_id column for recurring event instances
ALTER TABLE events ADD COLUMN parent_event_id INTEGER;

-- Add check_in_code column for QR code check-ins
ALTER TABLE events ADD COLUMN check_in_code TEXT;

-- Create index for parent_event_id lookups
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);

-- Create unique index for check_in_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_check_in_code ON events(check_in_code);
