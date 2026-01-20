-- Create event_forms table for custom check-in forms
CREATE TABLE IF NOT EXISTS event_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions TEXT NOT NULL, -- JSON array of question objects
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create index for faster lookups by event_id
CREATE INDEX IF NOT EXISTS idx_event_forms_event_id ON event_forms(event_id);

-- Create form_responses table for storing check-in form responses
CREATE TABLE IF NOT EXISTS form_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_in_id INTEGER NOT NULL,
  form_id INTEGER NOT NULL,
  responses TEXT NOT NULL, -- JSON object of question_id: response pairs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (check_in_id) REFERENCES checkins(id) ON DELETE CASCADE,
  FOREIGN KEY (form_id) REFERENCES event_forms(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_responses_check_in_id ON form_responses(check_in_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
