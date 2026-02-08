-- Migration 008: Create automation_logs table for tracking automation executions
-- This table stores a history of automation triggers and their results for debugging

CREATE TABLE IF NOT EXISTS automation_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  instance_name VARCHAR(255) NOT NULL,
  automation_id INTEGER REFERENCES automations(id) ON DELETE SET NULL,
  automation_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- 'all_messages', 'keyword', 'contains', etc.
  message_from VARCHAR(255),
  message_text TEXT,
  action_taken VARCHAR(50), -- 'auto_reply', 'forward', etc.
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'skipped'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by instance and recent entries
CREATE INDEX idx_automation_logs_instance ON automation_logs(instance_name, created_at DESC);

-- Index for tenant-based queries
CREATE INDEX idx_automation_logs_tenant ON automation_logs(tenant_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE automation_logs IS 'Stores execution history of automations for debugging and monitoring';
