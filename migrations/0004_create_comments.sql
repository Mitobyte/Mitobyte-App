-- Migration: Create comments system
-- Purpose: Custom commenting system with Replyke notification integration
-- Created: 2025-10-29

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,           -- Replyke entity ID for compatibility
  user_id INTEGER NOT NULL,          -- Local user ID
  parent_id INTEGER,                  -- For nested replies (NULL = top-level)
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,                -- Soft delete

  -- Store user info for quick access (denormalized for performance)
  user_email TEXT NOT NULL,
  user_display_name TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Comment votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote_type TEXT CHECK(vote_type IN ('up', 'down')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(comment_id, user_id)  -- One vote per user per comment
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user ON comment_votes(user_id);

-- Comment counts view for performance
CREATE VIEW IF NOT EXISTS comment_stats AS
SELECT
  c.id,
  c.entity_id,
  COUNT(DISTINCT CASE WHEN cv.vote_type = 'up' THEN cv.id END) as upvotes,
  COUNT(DISTINCT CASE WHEN cv.vote_type = 'down' THEN cv.id END) as downvotes,
  COUNT(DISTINCT r.id) as reply_count
FROM comments c
LEFT JOIN comment_votes cv ON c.id = cv.comment_id
LEFT JOIN comments r ON c.id = r.parent_id AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.entity_id;
