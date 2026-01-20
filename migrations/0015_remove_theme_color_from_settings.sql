-- Migration: Remove theme_color column from user_settings table
-- Database: Cloudflare D1 (SQLite)
-- Description: Rollback theme color customization feature

-- SQLite doesn't support DROP COLUMN directly in all versions
-- We need to create a new table without the column, copy data, drop old table, and rename

-- Create new table without theme_color
CREATE TABLE user_settings_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,

    -- Notification Preferences
    event_reminders INTEGER DEFAULT 1,
    community_updates INTEGER DEFAULT 1,
    email_notifications INTEGER DEFAULT 1,

    -- Privacy Settings
    profile_visibility TEXT DEFAULT 'public',
    show_email INTEGER DEFAULT 0,
    show_activity INTEGER DEFAULT 1,

    -- App Preferences
    default_view TEXT DEFAULT 'home',

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO user_settings_new (id, user_id, event_reminders, community_updates, email_notifications, profile_visibility, show_email, show_activity, default_view, created_at, updated_at)
SELECT id, user_id, event_reminders, community_updates, email_notifications, profile_visibility, show_email, show_activity, default_view, created_at, updated_at
FROM user_settings;

-- Drop old table
DROP TABLE user_settings;

-- Rename new table to original name
ALTER TABLE user_settings_new RENAME TO user_settings;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
