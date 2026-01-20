-- Migration: Create user_settings table
-- Database: Cloudflare D1 (SQLite)
-- Description: User app settings for notifications, privacy, and preferences

CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,

    -- Notification Preferences
    event_reminders INTEGER DEFAULT 1,         -- Boolean: 1 = enabled, 0 = disabled
    community_updates INTEGER DEFAULT 1,       -- Boolean: 1 = enabled, 0 = disabled
    email_notifications INTEGER DEFAULT 1,     -- Boolean: 1 = enabled, 0 = disabled

    -- Privacy Settings
    profile_visibility TEXT DEFAULT 'public',  -- 'public', 'community', 'private'
    show_email INTEGER DEFAULT 0,              -- Boolean: 1 = show, 0 = hide
    show_activity INTEGER DEFAULT 1,           -- Boolean: 1 = show, 0 = hide

    -- App Preferences
    default_view TEXT DEFAULT 'home',          -- 'home', 'events', 'community'

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
