-- Migration: Create users table with encrypted wallets
-- Database: Cloudflare D1 (SQLite)

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_hash TEXT UNIQUE NOT NULL,
    wallet_encrypted TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    CHECK(length(wallet_hash) = 64)
);

CREATE INDEX idx_wallet_hash ON users(wallet_hash);
CREATE INDEX idx_created_at ON users(created_at);
