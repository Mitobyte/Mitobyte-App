-- Add ActivityPub URIs and federation metadata to posts
-- Note: SQLite doesn't support adding UNIQUE columns via ALTER TABLE
-- We add columns first, then create unique indexes
ALTER TABLE posts ADD COLUMN activitypub_uri TEXT;
ALTER TABLE posts ADD COLUMN activitypub_id TEXT;
ALTER TABLE posts ADD COLUMN federated BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN remote_actor_uri TEXT;
ALTER TABLE posts ADD COLUMN conversation_uri TEXT;

-- Create unique indexes (equivalent to UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_activitypub_uri_unique ON posts(activitypub_uri) WHERE activitypub_uri IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_activitypub_id_unique ON posts(activitypub_id) WHERE activitypub_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_federated ON posts(federated);

-- Actor keys for HTTP signatures
CREATE TABLE IF NOT EXISTS activitypub_actor_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  key_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Post to activity mapping
CREATE TABLE IF NOT EXISTS activitypub_post_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL UNIQUE,
  activity_id TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Remote posts storage
CREATE TABLE IF NOT EXISTS activitypub_remote_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_uri TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  actor_uri TEXT NOT NULL,
  content TEXT,
  published_at TEXT NOT NULL,
  raw_object TEXT NOT NULL,
  local_post_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (local_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_actor ON activitypub_remote_posts(actor_uri);
CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_published ON activitypub_remote_posts(published_at DESC);
