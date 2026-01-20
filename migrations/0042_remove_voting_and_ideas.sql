-- Migration: Remove all voting functionality and idea submission
-- Purpose: Clean up voting tables, idea submission tables, columns, and views
-- Created: 2025-10-31

-- Drop voting-related views first (dependencies)
DROP VIEW IF EXISTS comment_stats;

-- Drop voting tables
DROP TABLE IF EXISTS idea_votes;
DROP TABLE IF EXISTS comment_votes;

-- Drop idea submission table and related tables (entire feature being removed)
-- Note: hackathon_teams references hackathon_ideas via idea_id with ON DELETE SET NULL
-- so removing hackathon_ideas will set those references to NULL
DROP TABLE IF EXISTS hackathon_ideas;

-- Optionally drop dependent tables if team formation is no longer needed
-- Uncomment these if you want to remove the entire hackathon workflow:
-- DROP TABLE IF EXISTS team_members;
-- DROP TABLE IF EXISTS hackathon_teams;
-- DROP TABLE IF EXISTS hackathon_submissions;

-- Remove voting settings from events table
-- Voting-related columns to remove: voting_enabled, voting_deadline, max_votes_per_user, reminder_sent
-- SQLite requires table recreation for column removal

-- Create backup of events table
CREATE TABLE events_backup AS SELECT * FROM events;

-- Drop the original table
DROP TABLE events;

-- Recreate events table without voting columns (based on migration 0040 + subsequent migrations)
CREATE TABLE events (
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
    parent_event_id INTEGER,

    CHECK(event_type IN ('networking', 'hackathon', 'workshop', 'social', 'code_and_coffee', 'code_and_brews', 'meetup')),
    CHECK(length(title) > 0),
    CHECK(length(description) > 0)
);

-- Copy data back (excluding voting columns: voting_enabled, voting_deadline, max_votes_per_user, reminder_sent)
INSERT INTO events (
    id, title, description, event_type, date, time, location, capacity,
    created_by, created_at, updated_at, is_recurring, recurring_pattern,
    recurring_end_date, thumbnail_url, check_in_code, check_in_form_id,
    feedback_form_id, parent_event_id
)
SELECT
    id, title, description, event_type, date, time, location, capacity,
    created_by, created_at, updated_at, is_recurring, recurring_pattern,
    recurring_end_date, thumbnail_url, check_in_code, check_in_form_id,
    feedback_form_id, parent_event_id
FROM events_backup;

-- Drop backup table
DROP TABLE events_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_check_in_code ON events(check_in_code);
CREATE INDEX IF NOT EXISTS idx_events_check_in_form_id ON events(check_in_form_id);
CREATE INDEX IF NOT EXISTS idx_events_feedback_form_id ON events(feedback_form_id);

-- Remove voting-related column from users table
-- Column to remove: publish_votes_to_fediverse (added in migration 0021)

-- Create backup of users table
CREATE TABLE users_backup AS SELECT * FROM users;

-- Drop the original table
DROP TABLE users;

-- Recreate users table without publish_votes_to_fediverse column
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_hash TEXT UNIQUE NOT NULL,
    wallet_encrypted TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    is_admin INTEGER DEFAULT 0,
    account_status TEXT DEFAULT 'active' CHECK(account_status IN ('active', 'deleted')),
    deleted_at TEXT,
    is_host INTEGER DEFAULT 0,

    CHECK(length(wallet_hash) = 64)
);

-- Copy data back (excluding publish_votes_to_fediverse column)
INSERT INTO users (
    id, wallet_hash, wallet_encrypted, email, display_name, created_at,
    is_admin, account_status, deleted_at, is_host
)
SELECT
    id, wallet_hash, wallet_encrypted, email, display_name, created_at,
    is_admin, account_status, deleted_at, is_host
FROM users_backup;

-- Drop backup table
DROP TABLE users_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_wallet_hash ON users(wallet_hash);
CREATE INDEX IF NOT EXISTS idx_created_at ON users(created_at);

-- Recreate comment_stats view without voting references
CREATE VIEW IF NOT EXISTS comment_stats AS
SELECT
  c.id,
  c.entity_id,
  0 as upvotes,  -- Placeholder, no voting
  0 as downvotes,  -- Placeholder, no voting
  COUNT(DISTINCT r.id) as reply_count
FROM comments c
LEFT JOIN comments r ON c.id = r.parent_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.entity_id;
