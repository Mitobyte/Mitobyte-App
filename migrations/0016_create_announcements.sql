-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notification_sent BOOLEAN DEFAULT 0,
  notification_sent_at DATETIME,
  recipient_count INTEGER DEFAULT 0
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_sent_at ON announcements(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_sender ON announcements(sender_email);
