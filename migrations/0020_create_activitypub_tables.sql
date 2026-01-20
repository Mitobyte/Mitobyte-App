-- ActivityPub Federation Tables
-- Migration: 0020_create_activitypub_tables.sql

-- Store followers (users following this instance's users)
CREATE TABLE IF NOT EXISTS activitypub_followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  follower_uri TEXT NOT NULL,
  follower_handle TEXT,
  follower_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  UNIQUE(user_email, follower_uri),
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Store following (users this instance's users are following)
CREATE TABLE IF NOT EXISTS activitypub_following (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  following_uri TEXT NOT NULL,
  following_handle TEXT,
  following_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  UNIQUE(user_email, following_uri),
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Store user activities for outbox (published activities)
CREATE TABLE IF NOT EXISTS activitypub_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  activity_id TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL,
  object_type TEXT,
  object_id TEXT,
  content TEXT,
  in_reply_to TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  vote_id INTEGER,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
  FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE SET NULL
);

-- Store incoming activities (for inbox processing)
CREATE TABLE IF NOT EXISTS activitypub_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  actor_uri TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  object_id TEXT,
  raw_activity TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Store likes/favorites on activities
CREATE TABLE IF NOT EXISTS activitypub_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL,
  actor_uri TEXT NOT NULL,
  actor_handle TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(activity_id, actor_uri)
);

-- Store shares/boosts of activities
CREATE TABLE IF NOT EXISTS activitypub_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL,
  actor_uri TEXT NOT NULL,
  actor_handle TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(activity_id, actor_uri)
);

-- Store remote actor cache (to avoid constant refetching)
CREATE TABLE IF NOT EXISTS activitypub_actors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_uri TEXT NOT NULL UNIQUE,
  actor_handle TEXT,
  name TEXT,
  summary TEXT,
  inbox_url TEXT,
  outbox_url TEXT,
  followers_url TEXT,
  following_url TEXT,
  icon_url TEXT,
  public_key TEXT,
  cached_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activitypub_followers_user ON activitypub_followers(user_email);
CREATE INDEX IF NOT EXISTS idx_activitypub_followers_status ON activitypub_followers(status);
CREATE INDEX IF NOT EXISTS idx_activitypub_following_user ON activitypub_following(user_email);
CREATE INDEX IF NOT EXISTS idx_activitypub_following_status ON activitypub_following(status);
CREATE INDEX IF NOT EXISTS idx_activitypub_activities_user ON activitypub_activities(user_email, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_activitypub_activities_type ON activitypub_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activitypub_inbox_user ON activitypub_inbox(user_email, processed);
CREATE INDEX IF NOT EXISTS idx_activitypub_inbox_processed ON activitypub_inbox(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_activitypub_likes_activity ON activitypub_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activitypub_shares_activity ON activitypub_shares(activity_id);
CREATE INDEX IF NOT EXISTS idx_activitypub_actors_uri ON activitypub_actors(actor_uri);
CREATE INDEX IF NOT EXISTS idx_activitypub_actors_handle ON activitypub_actors(actor_handle);
