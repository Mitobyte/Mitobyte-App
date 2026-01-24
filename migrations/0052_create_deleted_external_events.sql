-- Migration: Create deleted_external_events table
-- Purpose: Track external URLs of deleted events to prevent them from being re-synced
-- Created: 2025-01-23

CREATE TABLE deleted_external_events (
    external_url TEXT PRIMARY KEY,
    deleted_at TEXT DEFAULT (datetime('now'))
);
