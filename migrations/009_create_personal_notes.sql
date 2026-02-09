-- Create personal_notes table for Micro-Automations
CREATE TABLE IF NOT EXISTS personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_jid VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tenant_id UUID -- Optional, for multi-tenant support if needed later
);

-- Index for faster lookup by user
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_jid ON personal_notes(user_jid);
