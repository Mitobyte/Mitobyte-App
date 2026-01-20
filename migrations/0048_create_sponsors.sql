-- Create sponsors table for banner management
CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  clicks INTEGER DEFAULT 0
);

-- Create index for active sponsors query
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sponsors_dates ON sponsors(start_date, end_date);
