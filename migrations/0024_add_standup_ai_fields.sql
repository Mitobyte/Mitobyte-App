-- Add fields for AI-processed standup responses
ALTER TABLE checkins ADD COLUMN need_help_with TEXT; -- New question: what they need help with
ALTER TABLE checkins ADD COLUMN is_safe INTEGER DEFAULT 1; -- Boolean: 1 = safe, 0 = flagged
ALTER TABLE checkins ADD COLUMN confidence_score REAL DEFAULT 0.85; -- AI confidence score 0-1
ALTER TABLE checkins ADD COLUMN raw_working_on TEXT; -- Original unprocessed response
ALTER TABLE checkins ADD COLUMN raw_can_help_with TEXT; -- Original unprocessed response
ALTER TABLE checkins ADD COLUMN raw_need_help_with TEXT; -- Original unprocessed response
ALTER TABLE checkins ADD COLUMN content_warnings TEXT; -- JSON array of content warnings

-- Create index for safe content filtering
CREATE INDEX IF NOT EXISTS idx_checkins_safe ON checkins(is_safe);
