-- Migration: Add form types and templates for simplified form assignment
-- Database: Cloudflare D1 (SQLite)

-- Add form_type column to event_forms
ALTER TABLE event_forms ADD COLUMN form_type TEXT CHECK(form_type IN ('check-in', 'feedback')) DEFAULT 'check-in';

-- Add form references to events table
ALTER TABLE events ADD COLUMN check_in_form_id INTEGER;
ALTER TABLE events ADD COLUMN feedback_form_id INTEGER;

-- Create indexes for form lookups
CREATE INDEX IF NOT EXISTS idx_events_check_in_form_id ON events(check_in_form_id);
CREATE INDEX IF NOT EXISTS idx_events_feedback_form_id ON events(feedback_form_id);

-- Create form_templates table for pre-built forms
CREATE TABLE IF NOT EXISTS form_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  form_type TEXT NOT NULL CHECK(form_type IN ('check-in', 'feedback')),
  title TEXT NOT NULL,
  description TEXT,
  questions TEXT NOT NULL, -- JSON array of question objects
  is_system INTEGER DEFAULT 1, -- 1 for system templates, 0 for user-created
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for form template lookups
CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type);

-- Insert default check-in templates
INSERT INTO form_templates (name, form_type, title, description, questions, is_system) VALUES
('Simple Check-In', 'check-in', 'Event Check-In', 'Please provide your information to check in to this event.',
'[{"id":"1","label":"Full Name","type":"text","required":true,"placeholder":"John Doe"},{"id":"2","label":"Email Address","type":"email","required":true,"placeholder":"john@example.com"}]', 1),

('Detailed Check-In', 'check-in', 'Event Registration', 'Complete this form to register for the event.',
'[{"id":"1","label":"Full Name","type":"text","required":true,"placeholder":"John Doe"},{"id":"2","label":"Email Address","type":"email","required":true,"placeholder":"john@example.com"},{"id":"3","label":"Phone Number","type":"text","required":false,"placeholder":"(555) 123-4567"},{"id":"4","label":"Role/Title","type":"text","required":false,"placeholder":"Software Engineer"},{"id":"5","label":"Company/Organization","type":"text","required":false,"placeholder":"Tech Corp"}]', 1),

('Professional Check-In', 'check-in', 'Professional Event Check-In', 'Please provide your professional information.',
'[{"id":"1","label":"Full Name","type":"text","required":true,"placeholder":"John Doe"},{"id":"2","label":"Email Address","type":"email","required":true,"placeholder":"john@example.com"},{"id":"3","label":"LinkedIn Profile","type":"text","required":false,"placeholder":"https://linkedin.com/in/..."},{"id":"4","label":"What are you hoping to learn?","type":"textarea","required":false,"placeholder":"Share your goals for this event..."}]', 1);

-- Insert default feedback templates
INSERT INTO form_templates (name, form_type, title, description, questions, is_system) VALUES
('Event Feedback', 'feedback', 'Event Feedback', 'Help us improve! Please share your thoughts about this event.',
'[{"id":"1","label":"How would you rate this event?","type":"rating","required":true},{"id":"2","label":"What did you enjoy most?","type":"textarea","required":false,"placeholder":"Share what you liked..."},{"id":"3","label":"What could be improved?","type":"textarea","required":false,"placeholder":"Share your suggestions..."},{"id":"4","label":"Would you attend future events?","type":"radio","required":true,"options":["Definitely","Maybe","No"]}]', 1),

('Quick Feedback', 'feedback', 'Quick Feedback', 'Rate your experience in 2 quick questions.',
'[{"id":"1","label":"Overall Experience","type":"rating","required":true},{"id":"2","label":"Comments (Optional)","type":"textarea","required":false,"placeholder":"Any additional thoughts?"}]', 1),

('Detailed Feedback', 'feedback', 'Detailed Event Feedback', 'Your detailed feedback helps us create better events.',
'[{"id":"1","label":"Overall Rating","type":"rating","required":true},{"id":"2","label":"Content Quality","type":"rating","required":true},{"id":"3","label":"Venue/Location","type":"rating","required":true},{"id":"4","label":"Networking Opportunities","type":"rating","required":true},{"id":"5","label":"What worked well?","type":"textarea","required":false,"placeholder":""},{"id":"6","label":"What needs improvement?","type":"textarea","required":false,"placeholder":""},{"id":"7","label":"Topics for future events?","type":"textarea","required":false,"placeholder":""}]', 1);
