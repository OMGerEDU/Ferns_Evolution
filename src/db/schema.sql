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

-- Auto-migrate existing tables (Idempotent)
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]';
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS allow_media BOOLEAN DEFAULT FALSE;
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS outgoing_url VARCHAR(500);
ALTER TABLE instance_webhooks ADD COLUMN IF NOT EXISTS track_outgoing BOOLEAN DEFAULT FALSE;

-- Chats table updates
ALTER TABLE chats ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
