-- Invite-Only System
-- Add platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Insert default invite-only setting (disabled by default)
INSERT OR IGNORE INTO platform_settings (setting_key, setting_value, updated_by)
VALUES ('invite_only', 'false', 'system');

-- Create invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uses_remaining INTEGER DEFAULT 1,
  total_uses INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  notes TEXT
);

-- Create invite code usage tracking
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_code_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_code ON invite_code_uses(invite_code_id);
