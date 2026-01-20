-- Migration: Create user_profiles table (standalone, not tied to check-ins)
-- Database: Cloudflare D1 (SQLite)
-- Description: User profiles accessible through profile button on home page

CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,

    -- Profile Display Info
    avatar_url TEXT,
    tagline TEXT,                           -- One-liner bio (e.g., "Full-stack developer")
    bio TEXT,                               -- Longer bio

    -- Location & Contact
    location TEXT,
    website TEXT,

    -- Social Links
    github_username TEXT,
    twitter_username TEXT,
    linkedin_url TEXT,
    discord_username TEXT,

    -- Skills & Interests
    skills TEXT,                            -- JSON array
    interests TEXT,                         -- JSON array

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
