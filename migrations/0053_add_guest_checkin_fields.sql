-- Migration: Add guest check-in fields to checkins table
-- Allows public check-ins without requiring user accounts
-- Database: Cloudflare D1 (SQLite)

-- Add guest information columns for public check-ins
ALTER TABLE checkins ADD COLUMN guest_name TEXT;
ALTER TABLE checkins ADD COLUMN guest_email TEXT;

-- Create index on guest_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkins_guest_email ON checkins(guest_email);

-- Note: The check_in_method CHECK constraint cannot be modified in SQLite
-- The API will handle the new 'public_form' method type
-- Existing valid methods: 'qr_code', 'manual'
-- New method: 'public_form' (for unauthenticated guest check-ins)
