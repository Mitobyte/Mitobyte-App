-- Migration: Add account deletion fields
-- Database: Cloudflare D1 (SQLite)
-- Description: Allow users to delete their account

-- Add account status and deletion timestamp to users table
ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active' CHECK(account_status IN ('active', 'deleted'));
ALTER TABLE users ADD COLUMN deleted_at TEXT;

-- Create index for finding deleted accounts
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
