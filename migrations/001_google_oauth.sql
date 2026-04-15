-- Migration 001: Google OAuth + coaching history
-- Run this against your existing database.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

-- ── 1. Add Google OAuth columns to users ─────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id       VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- ── 2. Drop the password column (no longer used) ─────────────────────────────
-- Remove the NOT NULL constraint first so existing rows don't block the drop.

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- You can fully drop the column once you're sure no existing code references it:
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- ── 3. Create coaching_history table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coaching_history (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT    NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coaching_history_user_id
  ON coaching_history(user_id);
