-- Migration: Add workshop and meetup event types
-- Database: Cloudflare D1 (SQLite)

-- SQLite doesn't support modifying CHECK constraints directly
-- We need to recreate the events table with the new constraint

-- Create new events table with updated event types
CREATE TABLE events_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity INTEGER,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_recurring INTEGER DEFAULT 0,
    recurring_pattern TEXT,
    recurring_end_date TEXT,
    thumbnail_url TEXT,
    check_in_code TEXT,
    check_in_form_id INTEGER,
    feedback_form_id INTEGER,

    CHECK(event_type IN ('networking', 'hackathon', 'workshop', 'social', 'code_and_coffee', 'code_and_brews', 'meetup')),
    CHECK(length(title) > 0),
    CHECK(length(description) > 0)
);

-- Copy data from old table
INSERT INTO events_new SELECT * FROM events;

-- Drop old table
DROP TABLE events;

-- Rename new table to events
ALTER TABLE events_new RENAME TO events;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_check_in_code ON events(check_in_code);
CREATE INDEX IF NOT EXISTS idx_events_check_in_form_id ON events(check_in_form_id);
CREATE INDEX IF NOT EXISTS idx_events_feedback_form_id ON events(feedback_form_id);
