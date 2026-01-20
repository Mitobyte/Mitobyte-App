-- Migration: Add thumbnail support for events
-- Database: Cloudflare D1 (SQLite)
-- Changes:
--   1. Add thumbnail_url column to events table

-- Add thumbnail_url column
ALTER TABLE events ADD COLUMN thumbnail_url TEXT;

-- Create index for faster queries on events with thumbnails
CREATE INDEX idx_events_thumbnail ON events(thumbnail_url) WHERE thumbnail_url IS NOT NULL;
