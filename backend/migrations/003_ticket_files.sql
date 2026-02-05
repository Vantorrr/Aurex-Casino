-- AUREX Casino - Ticket Files Migration
-- Adds file attachment support to ticket messages

-- Add file columns to ticket_messages
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS file_url VARCHAR(500);
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Index for faster file lookups
CREATE INDEX IF NOT EXISTS idx_ticket_messages_file ON ticket_messages(file_url) WHERE file_url IS NOT NULL;
