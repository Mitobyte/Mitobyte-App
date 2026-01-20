-- Create hackathon_teams table for team formation
CREATE TABLE IF NOT EXISTS hackathon_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    idea_id INTEGER,
    description TEXT,
    max_members INTEGER DEFAULT 5,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (idea_id) REFERENCES hackathon_ideas(id) ON DELETE SET NULL,
    UNIQUE(event_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_teams_event ON hackathon_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_teams_idea ON hackathon_teams(idea_id);

-- Create team_members table to track team membership
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    user_wallet_hash TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE CASCADE,
    CHECK(role IN ('leader', 'member')),
    UNIQUE(team_id, user_wallet_hash)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_wallet_hash);
