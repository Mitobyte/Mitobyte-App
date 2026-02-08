-- Migration: Add is_featured column to events table
-- Database: Cloudflare D1 (SQLite)

ALTER TABLE events ADD COLUMN is_featured INTEGER DEFAULT 0;

-- Create index for faster featured queries
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured);
