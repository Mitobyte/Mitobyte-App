-- Migration: Create rsvps table to track event attendance
-- Database: Cloudflare D1 (SQLite)

CREATE TABLE rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_wallet_hash TEXT NOT NULL,
    rsvp_status TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CHECK(rsvp_status IN ('going', 'maybe', 'no')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_wallet_hash)
);

CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX idx_rsvps_user_wallet_hash ON rsvps(user_wallet_hash);
CREATE INDEX idx_rsvps_status ON rsvps(rsvp_status);
