-- Migration: Create event_requests table for user-submitted events pending admin approval
-- Database: Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS event_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  event_type TEXT DEFAULT 'meetup',
  expected_attendees INTEGER,
  requested_by TEXT NOT NULL, -- email of user who requested
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by TEXT, -- email of admin who reviewed
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  CHECK(event_type IN ('code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup')),
  CHECK(status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_requested_by ON event_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_event_requests_created_at ON event_requests(created_at);
