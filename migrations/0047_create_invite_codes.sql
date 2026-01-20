-- Migration: Create invite codes system
-- Purpose: Allow admins to generate QR codes that grant platform access to new users
-- Created: 2025-11-14

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  description TEXT,
  metadata TEXT
);

-- Invite redemptions tracking table
CREATE TABLE IF NOT EXISTS invite_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_code_id INTEGER NOT NULL,
  redeemed_by TEXT NOT NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_email TEXT,
  user_wallet TEXT,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code ON invite_redemptions(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_user ON invite_redemptions(redeemed_by);
