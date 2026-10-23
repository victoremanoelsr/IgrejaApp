-- Migration: add member_username column for custom login support
-- Safe to run multiple times (idempotent)

ALTER TABLE members ADD COLUMN IF NOT EXISTS member_username TEXT;

-- Unique index allows multiple NULLs (members who haven't set a custom username yet)
CREATE UNIQUE INDEX IF NOT EXISTS members_member_username_unique
  ON members (member_username)
  WHERE member_username IS NOT NULL;
