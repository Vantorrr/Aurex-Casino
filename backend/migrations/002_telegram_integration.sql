-- AUREX Casino - Telegram Integration Migration
-- Adds telegram_id to users for Telegram account linking

-- Add telegram_id column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;

-- Telegram link codes table (temporary codes for account linking)
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for code lookup
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);

-- Cleanup function for expired codes (optional, can run via cron)
-- DELETE FROM telegram_link_codes WHERE expires_at < NOW();

-- Add comment
COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID for notifications and account linking';
