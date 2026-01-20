-- Migration: Create bug_reports table
-- Purpose: Allow users to report bugs they encounter on the platform
-- Created: 2025-10-31

CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_wallet_hash TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_url TEXT,
    browser_info TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    admin_notes TEXT,
    resolved_at TEXT,
    resolved_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK(length(title) > 0),
    CHECK(length(description) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_priority ON bug_reports(priority);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_wallet ON bug_reports(user_wallet_hash);
