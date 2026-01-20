-- Social Platform Posts and Interactions
-- Migration: 0022_create_social_posts.sql

-- Posts table - main content
CREATE TABLE IF NOT EXISTS posts (
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
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
  FOREIGN KEY (reply_to_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (boost_of_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Post tags/hashtags
CREATE TABLE IF NOT EXISTS post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_email),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Post boosts/retweets
CREATE TABLE IF NOT EXISTS post_boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_email),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Post replies count cache
CREATE TABLE IF NOT EXISTS post_stats (
  post_id INTEGER PRIMARY KEY,
  likes_count INTEGER NOT NULL DEFAULT 0,
  boosts_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Mentions in posts
CREATE TABLE IF NOT EXISTS post_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  mentioned_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_email) REFERENCES users(email) ON DELETE CASCADE
);

-- User follows (for feed filtering)
CREATE TABLE IF NOT EXISTS user_follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_email TEXT NOT NULL,
  following_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(follower_email, following_email),
  FOREIGN KEY (follower_email) REFERENCES users(email) ON DELETE CASCADE,
  FOREIGN KEY (following_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_posts_boost_of ON posts(boost_of_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_email);
CREATE INDEX IF NOT EXISTS idx_post_boosts_post ON post_boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_user ON post_boosts(user_email);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user ON post_mentions(mentioned_email);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_email);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_email);
