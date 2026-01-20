-- Migration: Add updated_at column to users table
-- Database: Cloudflare D1 (SQLite)
-- Description: Track when user records are modified

-- SQLite ALTER TABLE doesn't support datetime('now') as default
-- Add column with NULL default, then update existing rows
ALTER TABLE users ADD COLUMN updated_at TEXT;
