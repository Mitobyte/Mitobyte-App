-- Migration: Add stand-up fields to check-ins for Code and Coffee / Code and Brews events
-- Database: Cloudflare D1 (SQLite)

-- Add stand-up question responses to checkins table
ALTER TABLE checkins ADD COLUMN working_on TEXT;
ALTER TABLE checkins ADD COLUMN can_help_with TEXT;
