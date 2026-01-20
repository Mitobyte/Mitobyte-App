-- Event Requests System
-- Allow non-admin users to request events for admin approval

CREATE TABLE IF NOT EXISTS event_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  category TEXT DEFAULT 'Community',
  max_attendees INTEGER,
  requested_by TEXT NOT NULL,
  requester_name TEXT,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at DATETIME,
  rejection_reason TEXT,
  created_event_id INTEGER,
  FOREIGN KEY (created_event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_requested_by ON event_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_event_requests_date ON event_requests(date);
