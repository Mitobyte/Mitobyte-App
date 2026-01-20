-- Create table to track which announcements users have read
CREATE TABLE IF NOT EXISTS announcement_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  announcement_id INTEGER NOT NULL,
  user_wallet_address TEXT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  UNIQUE(announcement_id, user_wallet_address)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
