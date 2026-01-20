-- Migration: Add UNIQUE index to users.email column
-- This fixes the foreign key mismatch error in activitypub_followers
-- Foreign keys in SQLite must reference a PRIMARY KEY or UNIQUE column

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
