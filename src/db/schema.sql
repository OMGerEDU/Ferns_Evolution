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

    -- Contact tracking tables for first-contact detection and saved contacts
    CREATE TABLE IF NOT EXISTS contact_history (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        instance_name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(255) NOT NULL,
        first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 1,
        UNIQUE (tenant_id, instance_name, contact_number)
    );

    CREATE TABLE IF NOT EXISTS saved_contacts (
        id SERIAL PRIMARY KEY,
        instance_name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (instance_name, contact_number)
    );

    -- ============================================
    -- BUILT-IN AUTOMATION TEMPLATES
    -- ============================================

    -- 1. Forward Voice Recordings
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'forward-voice-to-number',
        'Forward Voice Messages',
        'Automatically forward all voice recordings to a specified phone number',
        '🎤',
        'routing',
        '{"type": "object", "properties": {"targetNumber": {"type": "string", "label": "Target Phone Number", "placeholder": "+1234567890", "description": "Phone number to forward voice recordings to", "required": true}}}',
        '{"message_type": "audio", "source": "any", "provider": "any"}',
        '[{"type": "forward_message", "params": {"to": "{{config.targetNumber}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Media Archive
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'media-archive',
        'Media Archive',
        'Automatically forward all images and videos to an archive number',
        '📸',
        'routing',
        '{"type": "object", "properties": {"targetNumber": {"type": "string", "label": "Archive Number", "placeholder": "+1234567890", "description": "Phone number to receive all media", "required": true}}}',
        '{"message_types": ["image", "video"]}',
        '[{"type": "forward_message", "params": {"to": "{{config.targetNumber}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Document Backup
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'document-backup',
        'Document Backup',
        'Automatically forward all received documents to a backup number',
        '📝',
        'routing',
        '{"type": "object", "properties": {"targetNumber": {"type": "string", "label": "Backup Number", "placeholder": "+1234567890", "description": "Phone number to receive all documents", "required": true}}}',
        '{"message_type": "document"}',
        '[{"type": "forward_message", "params": {"to": "{{config.targetNumber}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 4. VIP Alert
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'vip-alert',
        'VIP Alert',
        'Forward messages from important contacts to your personal number',
        '⭐',
        'routing',
        '{"type": "object", "properties": {"vipNumbers": {"type": "string", "label": "VIP Numbers", "placeholder": "+1111111111,+2222222222", "description": "Comma-separated list of VIP phone numbers", "required": true}, "alertNumber": {"type": "string", "label": "Alert Number", "placeholder": "+1234567890", "description": "Your personal number for VIP alerts", "required": true}}}',
        '{"all_messages": true}',
        '[{"type": "check_vip", "params": {"vipNumbers": "{{config.vipNumbers}}"}}, {"type": "forward_message", "params": {"to": "{{config.alertNumber}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 5. Business Hours Reply
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'business-hours-reply',
        'Business Hours Reply',
        'Send automatic reply when messages arrive outside business hours',
        '💼',
        'auto-response',
        '{"type": "object", "properties": {"businessStart": {"type": "string", "label": "Start Time", "placeholder": "09:00", "description": "Business hours start time (24h format)", "required": true}, "businessEnd": {"type": "string", "label": "End Time", "placeholder": "17:00", "description": "Business hours end time (24h format)", "required": true}, "awayMessage": {"type": "text", "label": "Away Message", "placeholder": "We are currently closed. Business hours: 9 AM - 5 PM", "description": "Message to send outside business hours", "required": true}, "timezone": {"type": "string", "label": "Timezone", "placeholder": "UTC", "description": "Timezone (e.g., America/New_York, UTC)"}}}',
        '{"all_messages": true}',
        '[{"type": "check_time", "params": {"businessStart": "{{config.businessStart}}", "businessEnd": "{{config.businessEnd}}", "timezone": "{{config.timezone}}", "invert": true}}, {"type": "auto_reply", "params": {"message": "{{config.awayMessage}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 6. Vacation Responder
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'vacation-responder',
        'Vacation Responder',
        'Send automatic "I''m away" message to all incoming messages',
        '🏖️',
        'auto-response',
        '{"type": "object", "properties": {"vacationMessage": {"type": "text", "label": "Vacation Message", "placeholder": "I''m currently on vacation and will return on...", "description": "Auto-reply message for all incoming messages", "required": true}, "returnDate": {"type": "string", "label": "Return Date (optional)", "placeholder": "2026-02-15", "description": "Optional: When you''ll be back"}}}',
        '{"all_messages": true}',
        '[{"type": "auto_reply", "params": {"message": "{{config.vacationMessage}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 7. First Contact Welcome
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'first-contact-welcome',
        'First Contact Welcome',
        'Send welcome message to new contacts on their first message',
        '👋',
        'auto-response',
        '{"type": "object", "properties": {"welcomeMessage": {"type": "text", "label": "Welcome Message", "placeholder": "Thanks for reaching out! We''ll get back to you shortly.", "description": "Message to send to first-time contacts", "required": true}}}',
        '{"all_messages": true}',
        '[{"type": "check_first_contact"}, {"type": "auto_reply", "params": {"message": "{{config.welcomeMessage}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 8. Keyword Helper
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'keyword-helper',
        'Keyword Helper',
        'Auto-reply when message contains specific keywords (FAQ automation)',
        '❓',
        'auto-response',
        '{"type": "object", "properties": {"keyword1": {"type": "string", "label": "Keyword 1", "placeholder": "hours", "description": "First keyword to match", "required": true}, "response1": {"type": "text", "label": "Response 1", "placeholder": "Our business hours are 9 AM - 5 PM", "description": "Reply for keyword 1", "required": true}, "keyword2": {"type": "string", "label": "Keyword 2 (optional)", "placeholder": "price", "description": "Second keyword to match"}, "response2": {"type": "text", "label": "Response 2 (optional)", "placeholder": "Please visit our website for pricing", "description": "Reply for keyword 2"}, "keyword3": {"type": "string", "label": "Keyword 3 (optional)", "placeholder": "location", "description": "Third keyword to match"}, "response3": {"type": "text", "label": "Response 3 (optional)", "placeholder": "We are located at...", "description": "Reply for keyword 3"}}}',
        '{"message_type": "text"}',
        '[{"type": "auto_reply_keyword", "params": {"keywords": ["{{config.keyword1}}", "{{config.keyword2}}", "{{config.keyword3}}"], "responses": ["{{config.response1}}", "{{config.response2}}", "{{config.response3}}"]}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 9. Receipt Confirmation
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'receipt-confirmation',
        'Receipt Confirmation',
        'Send "Message received" confirmation for all incoming messages',
        '✅',
        'auto-response',
        '{"type": "object", "properties": {"confirmationMessage": {"type": "string", "label": "Confirmation Message", "placeholder": "Message received. We''ll respond shortly.", "description": "Auto-confirmation message", "required": true}}}',
        '{"all_messages": true}',
        '[{"type": "auto_reply", "params": {"message": "{{config.confirmationMessage}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 10. Unknown Number Filter
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'unknown-number-filter',
        'Unknown Number Filter',
        'Filter or auto-reply to messages from unsaved contacts',
        '🛡️',
        'security',
        '{"type": "object", "properties": {"action": {"type": "select", "label": "Action", "options": [{"value": "ignore", "label": "Ignore message"}, {"value": "reply", "label": "Send auto-reply"}], "default": "ignore", "description": "What to do with messages from unknown numbers", "required": true}, "replyMessage": {"type": "text", "label": "Reply Message", "placeholder": "Please save my contact to continue", "description": "Message to send to unknown numbers (only if action is reply)"}}}',
        '{"all_messages": true}',
        '[{"type": "check_saved_contact", "params": {"invert": true}}, {"type": "filter_unknown", "params": {"action": "{{config.action}}", "message": "{{config.replyMessage}}"}}]'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 11. Group Filter
    INSERT INTO builtin_automations (id, name, description, icon, category, config_schema, trigger, actions)
    VALUES (
        'group-filter',
        'Group Filter',
        'Automatically ignore all group messages',
        '🔕',
        'security',
        '{"type": "object", "properties": {}}',
        '{"is_group": true}',
        '[{"type": "ignore_message"}]'
    )
    ON CONFLICT (id) DO NOTHING;

