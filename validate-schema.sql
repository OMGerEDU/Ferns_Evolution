-- ============================================
-- DATABASE SCHEMA VALIDATION & AUDIT
-- ============================================
-- Run this in Supabase SQL Editor to validate all required tables exist

-- 1. LIST ALL TABLES IN DATABASE
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. VALIDATE REQUIRED TABLES EXIST
-- Expected tables based on codebase analysis:
-- tenants, automations, instance_webhooks, builtin_automations, contact_history, saved_contacts

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') 
        THEN '✅ tenants' 
        ELSE '❌ tenants MISSING' 
    END as tenants_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automations') 
        THEN '✅ automations' 
        ELSE '❌ automations MISSING' 
    END as automations_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instance_webhooks') 
        THEN '✅ instance_webhooks' 
        ELSE '❌ instance_webhooks MISSING' 
    END as instance_webhooks_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'builtin_automations') 
        THEN '✅ builtin_automations' 
        ELSE '❌ builtin_automations MISSING' 
    END as builtin_automations_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_history') 
        THEN '✅ contact_history' 
        ELSE '❌ contact_history MISSING' 
    END as contact_history_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_contacts') 
        THEN '✅ saved_contacts' 
        ELSE '❌ saved_contacts MISSING' 
    END as saved_contacts_status;

-- 3. CHECK COLUMN STRUCTURE FOR EACH TABLE

-- TENANTS table columns
SELECT 'TENANTS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
ORDER BY ordinal_position;

-- AUTOMATIONS table columns
SELECT 'AUTOMATIONS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'automations'
ORDER BY ordinal_position;

-- INSTANCE_WEBHOOKS table columns
SELECT 'INSTANCE_WEBHOOKS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'instance_webhooks'
ORDER BY ordinal_position;

-- BUILTIN_AUTOMATIONS table columns
SELECT 'BUILTIN_AUTOMATIONS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'builtin_automations'
ORDER BY ordinal_position;

-- CONTACT_HISTORY table columns
SELECT 'CONTACT_HISTORY COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contact_history'
ORDER BY ordinal_position;

-- SAVED_CONTACTS table columns
SELECT 'SAVED_CONTACTS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'saved_contacts'
ORDER BY ordinal_position;

-- 4. CHECK FOR REQUIRED INDEXES
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. VALIDATE FOREIGN KEY CONSTRAINTS
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public';

-- 6. COUNT ROWS IN EACH TABLE
SELECT 'Row Counts:' as info;

SELECT 
    (SELECT COUNT(*) FROM tenants) as tenants_count,
    (SELECT COUNT(*) FROM automations) as automations_count,
    (SELECT COUNT(*) FROM instance_webhooks) as instance_webhooks_count,
    (SELECT COUNT(*) FROM builtin_automations) as builtin_automations_count,
    (SELECT COUNT(*) FROM contact_history) as contact_history_count,
    (SELECT COUNT(*) FROM saved_contacts) as saved_contacts_count;

-- 7. EXPORT FULL SCHEMA (DDL)
-- Run this separately to get create statements for all tables
SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END,
        ', '
    ) || ');' as ddl
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name;
