-- Migration: Add standup form template for Code & Coffee / Code & Brews events
-- Database: Cloudflare D1 (SQLite)

INSERT INTO form_templates (name, form_type, title, description, questions, is_system) VALUES
('Standup Check-In', 'check-in', 'Developer Standup', 'Share what you''re working on and how you can help the community.',
'[
  {
    "id":"1",
    "label":"Full Name",
    "type":"text",
    "required":true,
    "placeholder":"John Doe"
  },
  {
    "id":"2",
    "label":"Email Address",
    "type":"email",
    "required":true,
    "placeholder":"john@example.com"
  },
  {
    "id":"3",
    "label":"What are you working on?",
    "type":"textarea",
    "required":true,
    "placeholder":"Tell us about your current project, what tech stack you''re using, or what you''re learning..."
  },
  {
    "id":"4",
    "label":"What can you help others with?",
    "type":"textarea",
    "required":true,
    "placeholder":"Share your expertise - programming languages, frameworks, design, debugging, career advice, etc."
  },
  {
    "id":"5",
    "label":"What do you need help with?",
    "type":"textarea",
    "required":false,
    "placeholder":"Optional: Any challenges or questions you''d like help with?"
  }
]', 1);
