-- Migration: Create event_feedback table for storing feedback form submissions
-- Database: Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS event_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  form_responses TEXT NOT NULL, -- JSON object containing form responses
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes for feedback lookups
CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_wallet ON event_feedback(wallet_address);
CREATE INDEX IF NOT EXISTS idx_event_feedback_created_at ON event_feedback(created_at);
