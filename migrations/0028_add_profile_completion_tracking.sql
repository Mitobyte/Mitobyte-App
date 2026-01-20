-- Migration: Add profile completion tracking to user_profiles
-- Database: Cloudflare D1 (SQLite)
-- Description: Track whether users have completed their onboarding portfolio

-- Add profile_completed flag to user_profiles
ALTER TABLE user_profiles ADD COLUMN profile_completed INTEGER DEFAULT 0 CHECK(profile_completed IN (0, 1));

-- Add onboarding_completed_at timestamp
ALTER TABLE user_profiles ADD COLUMN onboarding_completed_at TEXT;

-- Create index for querying incomplete profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_completion ON user_profiles(profile_completed);
