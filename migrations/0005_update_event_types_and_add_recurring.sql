-- Migration: Update event types and add recurring feature
-- Database: Cloudflare D1 (SQLite)
-- Changes:
--   1. Update event types to: 'code_and_coffee', 'code_and_brews', 'hackathon'
--   2. Add recurring event fields

-- Create new events table with updated schema
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

    -- Recurring event fields
    is_recurring INTEGER DEFAULT 0,
    recurring_pattern TEXT,
    recurring_end_date TEXT,
    parent_event_id INTEGER,

    CHECK(event_type IN ('code_and_coffee', 'code_and_brews', 'hackathon')),
    CHECK(length(title) > 0),
    CHECK(length(description) > 0),
    CHECK(is_recurring IN (0, 1)),
    CHECK(recurring_pattern IS NULL OR recurring_pattern IN ('weekly', 'biweekly', 'monthly')),
    FOREIGN KEY(parent_event_id) REFERENCES events_new(id)
);

-- Migrate existing data with type mapping
-- networking -> code_and_coffee
-- social -> code_and_coffee
-- workshop -> code_and_coffee
-- hackathon -> hackathon
INSERT INTO events_new (
    id, title, description, event_type, date, time, location,
    capacity, created_by, created_at, updated_at,
    is_recurring, recurring_pattern, recurring_end_date, parent_event_id
)
SELECT
    id,
    title,
    description,
    CASE
        WHEN event_type = 'hackathon' THEN 'hackathon'
        ELSE 'code_and_coffee'
    END,
    date,
    time,
    location,
    capacity,
    created_by,
    created_at,
    updated_at,
    0, -- is_recurring default
    NULL, -- recurring_pattern
    NULL, -- recurring_end_date
    NULL -- parent_event_id
FROM events;

-- Drop old table and rename new table
DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

-- Recreate indexes
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_recurring ON events(is_recurring);
CREATE INDEX idx_events_parent ON events(parent_event_id);
