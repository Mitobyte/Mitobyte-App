-- Fix foreign key constraint in posts table
-- Drop all social posts tables and recreate without FK constraint to users.email

-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS post_mentions;
DROP TABLE IF EXISTS user_follows;
DROP TABLE IF EXISTS post_stats;
DROP TABLE IF EXISTS post_boosts;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS posts;

-- Posts table - removed FK constraint to users.email since email is not unique
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  reply_to_id INTEGER,
  boost_of_id INTEGER,
  is_boosted BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reply_to_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (boost_of_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_email ON posts(user_email);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);

-- Post tags for hashtag support
CREATE TABLE post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag);

-- Post likes
CREATE TABLE post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_email),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_likes_user_email ON post_likes(user_email);

-- Post boosts/retweets
CREATE TABLE post_boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_email),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_boosts_user_email ON post_boosts(user_email);

-- Aggregated post stats for performance
CREATE TABLE post_stats (
  post_id INTEGER PRIMARY KEY,
  likes_count INTEGER NOT NULL DEFAULT 0,
  boosts_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- User follows (separate from ActivityPub follows)
CREATE TABLE user_follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_email TEXT NOT NULL,
  following_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(follower_email, following_email)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_email);
CREATE INDEX idx_user_follows_following ON user_follows(following_email);

-- Post mentions
CREATE TABLE post_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  mentioned_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX idx_post_mentions_mentioned_email ON post_mentions(mentioned_email);

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
