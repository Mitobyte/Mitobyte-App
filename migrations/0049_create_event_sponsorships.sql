-- Create event_sponsorships table for sponsor-event associations
-- This allows sponsors to self-sponsor events and upload their logos

CREATE TABLE IF NOT EXISTS event_sponsorships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  sponsor_email TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  sponsor_logo_url TEXT NOT NULL,
  sponsor_website_url TEXT,
  tier TEXT DEFAULT 'standard', -- standard, premium, platinum
  is_approved BOOLEAN DEFAULT 1, -- auto-approve for now, could require admin approval
  created_at DATETIME DEFAULT CURRENT_timestamp,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_event ON event_sponsorships(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_sponsor ON event_sponsorships(sponsor_email);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_approved ON event_sponsorships(is_approved);

-- Composite index for finding approved sponsors for an event
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_event_approved ON event_sponsorships(event_id, is_approved);
