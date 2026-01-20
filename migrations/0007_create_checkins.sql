-- Migration: Create check-ins table to track event attendance via QR codes
-- Database: Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_wallet_hash TEXT NOT NULL,
    checked_in_at TEXT DEFAULT (datetime('now')),
    check_in_method TEXT DEFAULT 'qr_code',
    device_info TEXT,

    CHECK(check_in_method IN ('qr_code', 'manual')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_wallet_hash)
);

CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_wallet_hash ON checkins(user_wallet_hash);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON checkins(checked_in_at);

-- Add check_in_code column to events table for QR code generation
-- Note: SQLite doesn't support adding UNIQUE constraint with ALTER TABLE
-- So we add the column without UNIQUE and create an index instead
ALTER TABLE events ADD COLUMN check_in_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_check_in_code ON events(check_in_code);
