-- Networking Bingo Tables
-- Gamified networking feature with QR scanning and AI verification

-- Bingo boards - Each user can have multiple boards
CREATE TABLE IF NOT EXISTS bingo_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_wallet_hash TEXT NOT NULL,
  board_layout TEXT NOT NULL, -- JSON array of 25 square IDs in random order
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  board_name TEXT DEFAULT 'My Networking Board',
  FOREIGN KEY (user_wallet_hash) REFERENCES users(wallet_hash)
);

-- Predefined bingo squares with connection goals
CREATE TABLE IF NOT EXISTS bingo_squares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_text TEXT NOT NULL, -- e.g., "Met a UX designer"
  requirement_type TEXT NOT NULL, -- profession, school, skill, company, tag
  requirement_value TEXT NOT NULL, -- e.g., "UX Designer", "Marquette", "Python"
  category TEXT DEFAULT 'general', -- profession, education, skill, company, general
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  points INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bingo square completions - tracking connections made
CREATE TABLE IF NOT EXISTS bingo_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  square_id INTEGER NOT NULL,
  matched_user_wallet_hash TEXT NOT NULL, -- who they connected with
  position INTEGER NOT NULL, -- 0-24, position on the board
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_confidence REAL DEFAULT 0.85, -- AI confidence score
  verification_metadata TEXT, -- JSON with verification details
  FOREIGN KEY (board_id) REFERENCES bingo_boards(id),
  FOREIGN KEY (square_id) REFERENCES bingo_squares(id),
  FOREIGN KEY (matched_user_wallet_hash) REFERENCES users(wallet_hash),
  UNIQUE(board_id, position) -- Each position can only be filled once
);

-- Bingo rewards - tracking badges and achievements
CREATE TABLE IF NOT EXISTS bingo_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_wallet_hash TEXT NOT NULL,
  reward_type TEXT NOT NULL, -- badge, raffle_entry, shout_out, bonus_points
  reward_name TEXT NOT NULL,
  reward_description TEXT,
  points_awarded INTEGER DEFAULT 0,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON for additional reward info
  FOREIGN KEY (user_wallet_hash) REFERENCES users(wallet_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bingo_boards_user ON bingo_boards(user_wallet_hash);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_active ON bingo_boards(is_active);
CREATE INDEX IF NOT EXISTS idx_bingo_completions_board ON bingo_completions(board_id);
CREATE INDEX IF NOT EXISTS idx_bingo_completions_user ON bingo_completions(matched_user_wallet_hash);
CREATE INDEX IF NOT EXISTS idx_bingo_rewards_user ON bingo_rewards(user_wallet_hash);
CREATE INDEX IF NOT EXISTS idx_bingo_squares_active ON bingo_squares(is_active);

-- Seed initial bingo squares
INSERT INTO bingo_squares (goal_text, requirement_type, requirement_value, category, difficulty, points) VALUES
  -- Profession-based
  ('Met a UX designer', 'tag', 'UX Designer', 'profession', 'medium', 10),
  ('Talked to a Frontend developer', 'tag', 'Frontend Developer', 'profession', 'easy', 5),
  ('Connected with a Backend engineer', 'tag', 'Backend Developer', 'profession', 'easy', 5),
  ('Found a Full-stack developer', 'tag', 'Full-stack Developer', 'profession', 'easy', 5),
  ('Met a Data scientist', 'tag', 'Data Scientist', 'profession', 'medium', 10),
  ('Chatted with a DevOps engineer', 'tag', 'DevOps Engineer', 'profession', 'medium', 10),
  ('Connected with a Product manager', 'tag', 'Product Manager', 'profession', 'medium', 10),
  ('Found a Mobile developer', 'tag', 'Mobile Developer', 'profession', 'medium', 10),
  ('Met a Security engineer', 'tag', 'Security Engineer', 'profession', 'hard', 15),
  ('Talked to an AI/ML engineer', 'tag', 'AI/ML Engineer', 'profession', 'hard', 15),

  -- School/Education-based
  ('Met someone from Marquette', 'school', 'Marquette', 'education', 'medium', 10),
  ('Connected with a UWM student/alum', 'school', 'UWM', 'education', 'medium', 10),
  ('Found someone from MSOE', 'school', 'MSOE', 'education', 'medium', 10),
  ('Met a Carroll University person', 'school', 'Carroll', 'education', 'medium', 10),

  -- Skill-based
  ('Found a Python expert', 'skill', 'Python', 'skill', 'easy', 5),
  ('Met a JavaScript developer', 'skill', 'JavaScript', 'skill', 'easy', 5),
  ('Connected with a React developer', 'skill', 'React', 'skill', 'easy', 5),
  ('Found a TypeScript user', 'skill', 'TypeScript', 'skill', 'medium', 10),
  ('Met a Rust developer', 'skill', 'Rust', 'skill', 'hard', 15),
  ('Chatted with a Go programmer', 'skill', 'Go', 'skill', 'medium', 10),

  -- Company-based
  ('Met someone from a startup', 'company_size', 'startup', 'company', 'easy', 5),
  ('Connected with a freelancer', 'company_size', 'freelance', 'company', 'easy', 5),
  ('Found someone from a Fortune 500', 'company_size', 'enterprise', 'company', 'medium', 10),

  -- General networking
  ('Met a first-time attendee', 'attendance_count', '1', 'general', 'easy', 5),
  ('Connected with a Mitobyte regular (3+ events)', 'attendance_count', '3+', 'general', 'medium', 10),
  ('Found someone who shares your hobby', 'bio_match', 'hobby', 'general', 'medium', 10),
  ('Met someone from your neighborhood', 'location_match', 'milwaukee', 'general', 'medium', 10),
  ('Connected with a mentor/mentee', 'role', 'mentor', 'general', 'hard', 15),
  ('Found a potential collaborator', 'bio_match', 'collaboration', 'general', 'medium', 10),
  ('Met someone learning your expertise', 'skill_inverse', 'teaching', 'general', 'medium', 10),

  -- Special squares
  ('Center Square - Free Space', 'free', 'free', 'general', 'easy', 0),
  ('Met Carl (Mitobyte founder)', 'special', 'carl@craftthefuture.xyz', 'general', 'hard', 20),
  ('Connected with 3 people in one event', 'combo', '3_connections', 'general', 'hard', 20),
  ('Helped someone solve a problem', 'interaction', 'helped', 'general', 'medium', 15),
  ('Asked for help and got it', 'interaction', 'asked_help', 'general', 'medium', 15);
