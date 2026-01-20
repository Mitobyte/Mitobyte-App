-- Create hackathon_submissions table for final project submissions
CREATE TABLE IF NOT EXISTS hackathon_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    team_id INTEGER,
    user_wallet_hash TEXT,
    project_title TEXT NOT NULL,
    project_description TEXT NOT NULL,
    project_url TEXT,
    demo_video_url TEXT,
    github_url TEXT,
    submitted_by TEXT NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE SET NULL,
    CHECK(team_id IS NOT NULL OR user_wallet_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_event ON hackathon_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_team ON hackathon_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_user ON hackathon_submissions(user_wallet_hash);
