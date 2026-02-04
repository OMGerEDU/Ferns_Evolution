-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create automations table with tenant isolation
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    trigger JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_tenant ON automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(enabled);

-- Create instance_webhooks table
CREATE TABLE IF NOT EXISTS instance_webhooks (
    instance_name VARCHAR(255) PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    events JSONB DEFAULT '[]', -- List of events to subscribe to
    sources JSONB DEFAULT '[]', -- List of sources (groups, private)
    allow_media BOOLEAN DEFAULT FALSE,
    outgoing_url VARCHAR(500),
    track_outgoing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
--
-- Auto-migrate existing tables (Idempotent)
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]';
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS allow_media BOOLEAN DEFAULT FALSE;
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS outgoing_url VARCHAR(500);
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS track_outgoing BOOLEAN DEFAULT FALSE;

-- Chats table updates
--
--
ALTER TABLE chats ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
#####

-- Built-in Automations System
-- Table for defining built-in automation templates
CREATE TABLE IF NOT EXISTS builtin_automations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(100),
    config_schema JSONB NOT NULL DEFAULT '{}',
    trigger JSONB NOT NULL,
    actions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Extend automations table for built-in support
ALTER TABLE automations ADD COLUMN IF NOT EXISTS is_builtin BOOLEAN DEFAULT FALSE;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS builtin_template_id VARCHAR(50) REFERENCES builtin_automations(id);
ALTER TABLE automations ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Insert first built-in automation: Forward Voice Recordings
INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
VALUES (
    'forward-voice-to-number',
    'Forward to Eliezer',
    'Automatically forward all voice recordings to a specified phone number',
    '🎤',
    'messaging',
    '{"type": "object", "properties": {"targetNumber": {"type": "string", "label": "Target Phone Number", "placeholder": "+1234567890", "description": "Phone number to forward voice recordings to"}}}',
    '{"message_type": "audio", "source": "any", "provider": "any"}',
    '[{"type": "forward_message", "params": {"to": "{{config.targetNumber}}"}}]'
)
ON CONFLICT (id) DO NOTHING;
