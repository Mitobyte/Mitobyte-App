-- Migration: Fix broken foreign key in activitypub_activities table
-- The table references a non-existent 'votes' table
-- We need to recreate the table without this broken foreign key

-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

-- Create new table with corrected schema (without broken votes FK)
CREATE TABLE IF NOT EXISTS activitypub_activities_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  activity_id TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL,
  object_type TEXT,
  object_id TEXT,
  content TEXT,
  in_reply_to TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  vote_id INTEGER,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO activitypub_activities_new
SELECT id, user_email, activity_id, activity_type, object_type, object_id, content, in_reply_to, published_at, vote_id
FROM activitypub_activities;

-- Drop old table
DROP TABLE activitypub_activities;

-- Rename new table to original name
ALTER TABLE activitypub_activities_new RENAME TO activitypub_activities;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
