-- Migration: Add name and username fields to user_profiles
-- Database: Cloudflare D1 (SQLite)
-- Description: Allow users to set their display name and username

-- Add name field
ALTER TABLE user_profiles ADD COLUMN name TEXT;

-- Add username field
ALTER TABLE user_profiles ADD COLUMN username TEXT;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
