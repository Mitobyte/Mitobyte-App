-- Migration: Add theme_color column to user_settings table
-- Database: Cloudflare D1 (SQLite)
-- Description: Allow users to customize their theme color

ALTER TABLE user_settings ADD COLUMN theme_color TEXT DEFAULT '#3b82f6';
