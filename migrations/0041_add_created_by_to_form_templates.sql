-- Migration: Add created_by column to form_templates
-- Database: Cloudflare D1 (SQLite)

-- Add created_by column to track who created the template
ALTER TABLE form_templates ADD COLUMN created_by TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_templates_created_by ON form_templates(created_by);
