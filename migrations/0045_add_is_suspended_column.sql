-- Migration: Add is_suspended column to users table
-- Created: 2025-11-01

-- Add is_suspended column to users table
ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;

-- Create index for suspended user queries
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
