-- Migration: Create form_responses table
-- Database: Cloudflare D1 (SQLite)

-- Create form_responses table for storing check-in form responses
-- Note: form_id logic handles both event_forms and form_templates
CREATE TABLE IF NOT EXISTS form_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_in_id INTEGER NOT NULL,
  form_id INTEGER NOT NULL,
  responses TEXT NOT NULL, -- JSON object of question_id: response pairs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (check_in_id) REFERENCES checkins(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_responses_check_in_id ON form_responses(check_in_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
