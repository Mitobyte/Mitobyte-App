-- Migration: Update event types to include new categories
-- Database: Cloudflare D1 (SQLite)

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table with the new constraint

-- Step 1: Create new table with updated event types
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

    CHECK(event_type IN ('code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup')),
    CHECK(length(title) > 0),
    CHECK(length(description) > 0)
);

-- Step 2: Copy data from old table, mapping old types to new types
INSERT INTO events_new (
    id, title, description, event_type, date, time, location, capacity,
    created_by, created_at, updated_at, is_recurring, recurring_pattern,
    recurring_end_date, thumbnail_url
)
SELECT
    id, title, description,
    CASE
        WHEN event_type = 'networking' THEN 'meetup'
        WHEN event_type = 'social' THEN 'code_and_brews'
        ELSE event_type
    END as event_type,
    date, time, location, capacity,
    created_by, created_at, updated_at,
    is_recurring, recurring_pattern, recurring_end_date, thumbnail_url
FROM events;

-- Step 3: Drop old table
DROP TABLE events;

-- Step 4: Rename new table
ALTER TABLE events_new RENAME TO events;

-- Step 5: Recreate indexes
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
