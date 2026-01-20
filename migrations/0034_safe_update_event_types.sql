-- Migration: Safely update event types by handling view dependencies
-- Database: Cloudflare D1 (SQLite)

-- Step 1: Drop views that depend on events table
DROP VIEW IF EXISTS community_checkins_with_profiles;

-- Step 2: Create new table with updated event types
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

-- Step 3: Copy data from old table, mapping old types to new types
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

-- Step 4: Drop old table
DROP TABLE events;

-- Step 5: Rename new table
ALTER TABLE events_new RENAME TO events;

-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Step 7: Recreate the view
CREATE VIEW IF NOT EXISTS community_checkins_with_profiles AS
SELECT
    c.*,
    up.display_name,
    up.bio,
    up.avatar_url,
    up.social_links,
    e.title as event_title,
    e.date as event_date
FROM checkins c
LEFT JOIN user_profiles up ON c.user_wallet_hash = up.user_wallet_hash
LEFT JOIN events e ON c.event_id = e.id;
