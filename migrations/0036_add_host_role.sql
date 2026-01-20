-- Migration: Add host role to users table
-- Database: Cloudflare D1 (SQLite)

-- Add is_host column to users table
ALTER TABLE users ADD COLUMN is_host INTEGER DEFAULT 0;

-- Create index for faster host lookups
CREATE INDEX IF NOT EXISTS idx_is_host ON users(is_host);
