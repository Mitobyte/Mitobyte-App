-- Migration: Add sponsor role to users
-- Created: 2025-11-01

-- Add is_sponsor column to users table
ALTER TABLE users ADD COLUMN is_sponsor BOOLEAN DEFAULT FALSE;

-- Create index for sponsor queries
CREATE INDEX IF NOT EXISTS idx_users_is_sponsor ON users(is_sponsor);
