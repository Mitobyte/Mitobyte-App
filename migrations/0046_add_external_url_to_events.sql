-- Migration: Add external_url field to events table
-- Purpose: Allow events to link to external event platforms (Eventbrite, Meetup, etc.)
-- Created: 2025-11-14

ALTER TABLE events ADD COLUMN external_url TEXT;

-- Create index for external events lookups
CREATE INDEX IF NOT EXISTS idx_events_external_url ON events(external_url);
