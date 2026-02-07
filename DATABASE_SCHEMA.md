# Database Schema Requirements

Based on codebase analysis, here are all tables used in the project:

## Required Tables

### 1. `tenants`
**Purpose**: Multi-tenancy support for API access  
**Used in**: 
- `src/routes/tenants.js` - Tenant CRUD
- `src/routes/webhookRelay.js` - Webhook authentication
- `src/routes/builtinAutomations.js` - Tenant resolution
- `src/routes/automations.js` - Automation tenant association

**Required Columns**:
- `id` (UUID, PRIMARY KEY)
- `name` (VARCHAR)
- `webhook_secret` (VARCHAR)
- `created_at` (TIMESTAMP)

---

### 2. `automations`
**Purpose**: Store automation rules and workflows  
**Used in**:
- `src/routes/automations.js` - Automation CRUD
- `src/routes/builtinAutomations.js` - Built-in automation instances
- `src/services/automationEngine.js` - Execute automations
- `src/routes/webhookTrigger.js` - Trigger automations

**Required Columns**:
- `id` (SERIAL, PRIMARY KEY)
- `tenant_id` (UUID, FOREIGN KEY → tenants.id)
- `name` (VARCHAR)
- `enabled` (BOOLEAN)
- `trigger` (JSONB)
- `actions` (JSONB)
- `is_builtin` (BOOLEAN)
- `builtin_template_id` (VARCHAR, FOREIGN KEY → builtin_automations.id)
- `config` (JSONB)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_automations_tenant` on `tenant_id`
- `idx_automations_enabled` on `enabled`

---

### 3. `instance_webhooks`
**Purpose**: Webhook configuration per WhatsApp instance  
**Used in**:
- `src/routes/webhookConfig.js` - Webhook config CRUD
- `src/routes/webhooks.js` - Webhook forwarding logic

**Required Columns**:
- `instance_name` (VARCHAR, PRIMARY KEY)
- `url` (VARCHAR)
- `enabled` (BOOLEAN)
- `events` (JSONB) - List of subscribed events
- `sources` (JSONB) - List of sources (groups, private)
- `allow_media` (BOOLEAN)
- `outgoing_url` (VARCHAR)
- `track_outgoing` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

### 4. `builtin_automations`
**Purpose**: Template definitions for pre-built automations  
**Used in**:
- `src/routes/builtinAutomations.js` - List and enable built-in automations

**Required Columns**:
- `id` (VARCHAR, PRIMARY KEY)
- `name` (VARCHAR)
- `description` (TEXT)
- `icon` (VARCHAR)
- `category` (VARCHAR)
- `config_schema` (JSONB)
- `trigger` (JSONB)
- `actions` (JSONB)
- `created_at` (TIMESTAMP)

**Expected Rows**: 11 pre-defined automation templates

---

### 5. `contact_history`
**Purpose**: Track first-contact detection for automations  
**Used in**:
- `src/services/contactTracker.js` - Contact first-seen tracking

**Required Columns**:
- `id` (SERIAL, PRIMARY KEY)
- `tenant_id` (VARCHAR)
- `instance_name` (VARCHAR)
- `contact_number` (VARCHAR)
- `first_seen_at` (TIMESTAMP)
- `last_seen_at` (TIMESTAMP)
- `message_count` (INTEGER)

**Constraints**:
- UNIQUE (`tenant_id`, `instance_name`, `contact_number`)

---

### 6. `saved_contacts`
**Purpose**: Track saved contacts for filtering  
**Used in**:
- `src/services/contactTracker.js` - Check if contact is saved

**Required Columns**:
- `id` (SERIAL, PRIMARY KEY)
- `instance_name` (VARCHAR)
- `contact_number` (VARCHAR)
- `contact_name` (VARCHAR)
- `created_at` (TIMESTAMP)

**Constraints**:
- UNIQUE (`instance_name`, `contact_number`)

---

## Tables Queried But May Not Exist

### `chats`
**Referenced in**: `src/db/schema.sql` (ALTER TABLE for `unread_count` column)  
**Note**: This table might be created by the frontend or another service. Not directly used in backend routes.

---

## Validation Steps

1. Run `validate-schema.sql` in Supabase SQL Editor
2. Check that all 6 required tables exist
3. Verify column structures match requirements
4. Ensure `builtin_automations` has 11 template rows
5. Verify foreign key constraints exist

## Common Issues

- **Missing tables**: Run `src/db/schema.sql` in Supabase
- **Missing columns**: Schema may be outdated, run migrations
- **No builtin templates**: INSERT statements in schema.sql may have failed
